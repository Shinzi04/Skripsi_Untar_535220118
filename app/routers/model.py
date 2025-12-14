# FS
import base64
import io
import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import pandas as pd

# ENV
from dotenv import load_dotenv

# FASTAPI
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

# MINIO
from minio import Minio
from minio.error import S3Error

# DREMIO
from pyarrow import flight
from pyarrow.flight import FlightCallOptions, FlightClient, FlightDescriptor
from pydantic import BaseModel, Field, field_validator, model_validator
from urllib3.exceptions import MaxRetryError

from predictions_model.model import train_model
from predictions_model.predict import create_meteorology_df, predict_pollutants
from utils.auth import admin_required
from utils.data_validation import validate_data
from utils.model_utils import (
    MODEL_INFO_PATH,
    _active_model_name,
    _collect_model_entry,
    _ensure_model_exists,
    _list_trained_models,
    _read_json,
    _required_files_present,
    _write_json,
)

load_dotenv()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_DATALAKE_BUCKET = os.getenv("MINIO_DATALAKE_BUCKET")

DREMIO_ENDPOINT = os.getenv("DREMIO_ENDPOINT")
DREMIO_USERNAME = os.getenv("DREMIO_USERNAME")
DREMIO_PASSWORD = os.getenv("DREMIO_PASSWORD")


def minio_client() -> Minio:
    return Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False,
    )


router = APIRouter()


@router.post("/upload", tags=["model"], dependencies=[Depends(admin_required)])
async def retrain_model(file: UploadFile = File(...)):

    # VALIDASI DATA SESUAI FORMAT
    validate_data(file)

    # UPLOAD DATA KE MINIO
    try:
        #! AUTOPROMOTION IN DREMIO IS NOT HANDLING CSV WELL, SO WE NEED TO CONVERT THIS INTO XLSX
        # CONVERT TO XLSX IN MEMORY
        file.file.seek(0)
        df = pd.read_csv(file.file)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False)
        output.seek(0)

        # NAMA FILE
        base_name = os.path.splitext(file.filename)[0]  # REMOVE .CSV
        xlsx_filename = f"{base_name}.xlsx"

        client = minio_client()
        bucket = MINIO_DATALAKE_BUCKET
        client.put_object(
            bucket_name=bucket,
            object_name=f"raw/{xlsx_filename}",
            data=output,
            length=output.getbuffer().nbytes,
            part_size=10 * 1024 * 1024,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        print(f"File {xlsx_filename} uploaded to Minio")

        # KONVERSI DATA DARI MINIO KE DREMIO
        basic_token = base64.b64encode(
            f"{DREMIO_USERNAME}:{DREMIO_PASSWORD}".encode("utf-8")
        ).decode("utf-8")
        headers = [(b"authorization", f"Basic {basic_token}".encode("utf-8"))]

        flight_client = FlightClient(DREMIO_ENDPOINT)
        options = flight.FlightCallOptions(headers=headers)

        create_query = f"""CREATE TABLE Minio."{base_name}" AS
        SELECT TO_DATE(A, 'YYYY-MM-DD', 1) AS Tanggal,
        CONVERT_TO_FLOAT(B, 1, 1, 0) AS PM10,
        CONVERT_TO_FLOAT(C, 1, 1, 0) AS SO2,
        CONVERT_TO_FLOAT(D, 1, 1, 0) AS CO,
        CONVERT_TO_FLOAT(E, 1, 1, 0) AS O3,
        CONVERT_TO_FLOAT(F, 1, 1, 0) AS NO2,
        CONVERT_TO_FLOAT(G, 1, 1, 0) AS Temperatur,
        CONVERT_TO_FLOAT(H, 1, 1, 0) AS Kelembapan,
        CONVERT_TO_FLOAT(I, 1, 1, 0) AS "Curah Hujan",
        CONVERT_TO_FLOAT(J, 1, 1, 0) AS "Penyinaran Matahari",
        CONVERT_TO_FLOAT(K, 1, 1, 0) AS "Kecepatan Angin"
        FROM MinIO.raw."{xlsx_filename}" AS "placeholder.xlsx"
        WHERE TANGGAL IS NOT NULL;
        """
        # KONVERSI TABLE KE ICEBERG
        print("Running CTAS...")
        create_descriptor = FlightDescriptor.for_command(create_query.encode())
        create_flight_info = flight_client.get_flight_info(create_descriptor, options)
        create_reader = flight_client.do_get(
            create_flight_info.endpoints[0].ticket, options
        )

        for _ in range(10):
            try:
                probe = FlightDescriptor.for_command(
                    f'SELECT * FROM Minio."{base_name}" LIMIT 1'.encode("utf-8")
                )
                info = flight_client.get_flight_info(probe, options)
                if info.endpoints:
                    break
            except Exception:
                time.sleep(0.5)

        return {
            "message": "Data uploaded successfully",
            "base_name": base_name,
        }

    except (S3Error, ConnectionRefusedError, TimeoutError, MaxRetryError) as e:
        raise HTTPException(
            status_code=503,
            detail=f"MinIO is not available (Check if MinIO is running): {e}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TrainRequest(BaseModel):
    base_name: str
    # model_name: Optional[str]


import re
from typing import Optional

from pydantic import BaseModel, field_validator


class TrainRequest(BaseModel):
    base_name: str
    model_name: Optional[str] = None

    @field_validator("model_name")
    def validate_model_name(cls, v):
        if v is None:
            return v
        if not re.fullmatch(r"[A-Za-z0-9._-]{1,64}", v):
            raise ValueError(
                "model_name hanya boleh berisi huruf/angka/dot/underscore/dash (maks 64 karakter)"
            )
        return v


@router.post("/train", tags=["model"], dependencies=[Depends(admin_required)])
async def model_train_using_cache(payload: TrainRequest):
    try:
        base_name = payload.base_name
        model_name = payload.model_name or base_name

        basic_token = base64.b64encode(
            f"{DREMIO_USERNAME}:{DREMIO_PASSWORD}".encode("utf-8")
        ).decode("utf-8")
        headers = [(b"authorization", f"Basic {basic_token}".encode("utf-8"))]

        flihgt_client = FlightClient(DREMIO_ENDPOINT)
        options = flight.FlightCallOptions(headers=headers)

        select_query = f'SELECT * FROM Minio."{base_name}"'
        select_descriptor = FlightDescriptor.for_command(select_query.encode())
        select_flight_info = flight_client.get_flight_info(select_descriptor, options)
        select_reader = flight_client.do_get(
            select_flight_info.endpoints[0].ticket, options
        )
        select_table = select_reader.read_all()

        train_model(select_table.to_pandas(), model_name=model_name)

        return {
            "message": "Model Train Successfully",
            "base_name": base_name,
            "model_name": model_name,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list", tags=["model"], dependencies=[Depends(admin_required)])
async def model_list():
    try:
        models = _list_trained_models()
        active = _active_model_name()
        return {"active": active, "models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/active", tags=["model"], dependencies=[Depends(admin_required)])
async def set_active_model(payload: Dict[str, str]):
    new_active = (payload.get("active") or "").strip()
    if not new_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Body must include {"active": "<model_folder_name>"}',
        )

    _ensure_model_exists(new_active)

    to_write = {"active": new_active}
    _write_json(MODEL_INFO_PATH, to_write)

    return {"message": "Active model updated.", "active": new_active}


@router.get("/evaluation", tags=["model"], dependencies=[Depends(admin_required)])
async def model_evaluation_active():
    active = _active_model_name()
    if not active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active model set in model_information.json.",
        )

    model_dir = _ensure_model_exists(active)
    metadata = _read_json(model_dir / "metadata.json")
    evaluation = _read_json(model_dir / "evaluation.json")

    if metadata is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'metadata.json not found for model "{active}".',
        )
    if evaluation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'evaluation.json not found for model "{active}".',
        )

    return {"active": active, "metadata": metadata, "evaluation": evaluation}


from utils.user_input_utils import PredictRequest, _history_to_dataframe


@router.post("/predict", tags=["model"])
async def model_predict(body: PredictRequest):
    try:
        df_future_met = create_meteorology_df(
            tanggal=pd.to_datetime(body.tanggal),
            temperatur=body.temperatur,
            kelembapan=body.kelembapan,
            curah_hujan=body.curah_hujan,
            penyinaran_matahari=body.penyinaran_matahari,
            kecepatan_angin=body.kecepatan_angin,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid week-1 meteorology: {e}")

    df_hist_user = None
    if body.history is not None:
        try:
            df_hist_user = _history_to_dataframe(body.history)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid history payload: {e}")

    try:
        _, _, preds_all = predict_pollutants(
            df_meteorology=df_future_met,
            df_history_from_user=df_hist_user,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {e}")

    return {
        "predictions": preds_all.reset_index().to_dict(orient="records"),
    }


PREDICTIONS_BASE = Path(__file__).resolve().parents[1] / "predictions_model"
MODELS_BASE = PREDICTIONS_BASE / "models"
PREDICTION_RESULTS_PATH = MODELS_BASE / "prediction_result.json"


def _ensure_dirs() -> None:
    MODELS_BASE.mkdir(parents=True, exist_ok=True)


def _atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    """Write JSON atomically to avoid partial writes under concurrency."""
    _ensure_dirs()
    with tempfile.NamedTemporaryFile(
        "w", delete=False, dir=MODELS_BASE, suffix=".tmp"
    ) as tmp:
        json.dump(data, tmp, ensure_ascii=False, indent=2)
        tmp_path = Path(tmp.name)
    os.replace(tmp_path, path)


def _read_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


@router.patch("/predict/result", tags=["model"])
async def save_predict_result(payload: Dict[str, Any]):
    """
    Create/update the stored prediction results.

    Accepted payloads:
      - The exact object from /predict: {"predictions": [...]}
      - Or {"result": "<json-string>"} where that string parses into the same object
      - Or any JSON object you want stored as-is.
    """
    to_store: Dict[str, Any]

    if "predictions" in payload and isinstance(payload["predictions"], list):
        to_store = {"predictions": payload["predictions"]}
    elif "result" in payload and isinstance(payload["result"], str):
        try:
            parsed = json.loads(payload["result"])
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid JSON in 'result': {e}"
            )
        if not isinstance(parsed, dict):
            raise HTTPException(
                status_code=400, detail="Parsed 'result' must be a JSON object."
            )
        # If parsed doesn't have 'predictions', we still allow storing it as-is
        to_store = parsed
    else:
        # Store whatever object was sent (must be a dict per signature)
        to_store = payload

    try:
        _atomic_write_json(PREDICTION_RESULTS_PATH, to_store)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save results: {e}")

    count = None
    preds = to_store.get("predictions")
    if isinstance(preds, list):
        count = len(preds)

    return {
        "status": "ok",
        "saved_items": count,
        "path": str(PREDICTION_RESULTS_PATH),
    }


@router.get("/predict/result", tags=["model"])
async def get_predict_result():
    """Fetch the latest stored prediction results."""
    if not PREDICTION_RESULTS_PATH.exists():
        raise HTTPException(status_code=404, detail="No prediction results found.")

    try:
        data = _read_json(PREDICTION_RESULTS_PATH)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read results: {e}")

    # Return as-is; FastAPI will serialize the dict
    return JSONResponse(content=data)
