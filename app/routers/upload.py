import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from minio import Minio
from minio.error import S3Error
from urllib3.exceptions import MaxRetryError

from utils.auth import admin_required

load_dotenv()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_STORAGE_BUCKET = os.getenv("MINIO_STORAGE_BUCKET")

router = APIRouter(dependencies=[Depends(admin_required)])


def minio_client() -> Minio:
    return Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False,
    )


# ? REF: https://fastapi.tiangolo.com/tutorial/request-files/
@router.post("/", tags=["upload"])
async def upload_data(file: UploadFile = File(...)):
    try:
        client = minio_client()
        bucket = MINIO_STORAGE_BUCKET
        file_name = file.filename
        client.put_object(
            bucket_name=bucket,
            object_name=file_name,
            data=file.file,
            length=-1,  # File size not known
            part_size=10 * 1024 * 1024,
            content_type=file.content_type or "application/octet-stream",
        )
        return {"message": "Uploaded successfully", "bucket": bucket, "name": file_name}
    except S3Error as e:
        raise HTTPException(
            status_code=400, detail=f"MinIO error: {e.code}: {e.message}"
        )
    except (ConnectionRefusedError, TimeoutError, MaxRetryError) as e:
        raise HTTPException(
            status_code=503, detail="MinIO is not reachable from the app"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list", tags=["upload"])
async def bucket_list():
    try:
        client = minio_client()
        buckets = client.list_buckets()
        return {
            "buckets": [
                {
                    "name": b.name,
                    "created_on": b.creation_date.strftime("%Y-%m-%d %H:%M:%S"),
                }
                for b in buckets
            ]
        }
    except S3Error as e:
        raise HTTPException(
            status_code=400, detail=f"MinIO error: {e.code}: {e.message}"
        )
    except (ConnectionRefusedError, TimeoutError, MaxRetryError) as e:
        raise HTTPException(
            status_code=503, detail="MinIO is not reachable from the app"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
