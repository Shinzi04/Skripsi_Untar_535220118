# predictions_model/predict.py
import json
import os
from pathlib import Path
from typing import Iterable, List, Tuple

import joblib
import numpy as np
import pandas as pd

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
from keras.models import load_model

pollutants = ["PM10", "SO2", "CO", "O3", "NO2"]
meteorology = [
    "Temperatur",
    "Kelembapan",
    "Curah Hujan",
    "Penyinaran Matahari",
    "Kecepatan Angin",
]

from utils.predict_utils import (
    _ensure_datetime_index,
    _first_existing,
    _preprocess_history,
)

BASE_DIR = Path(__file__).resolve().parent
MODELS_ROOT = BASE_DIR / "models"


def read_active_model_name(models_root: Path = MODELS_ROOT) -> str:
    info_path = models_root / "model_information.json"
    if not info_path.exists():
        raise FileNotFoundError(
            f"Active model config not found: {info_path}. "
            "Create JSON with {'active': '<model_dir>'}."
        )
    with open(info_path, "r") as f:
        data = json.load(f)
    name = data.get("active")
    if not name:
        raise ValueError("model_information.json missing 'active' key.")
    return name


def load_saved_model(model_dir: str | Path) -> Tuple[object, object, object, dict]:
    model_dir = Path(model_dir)
    if not model_dir.is_absolute():
        model_dir = MODELS_ROOT / model_dir

    MODEL_PATH = model_dir / "bilstm_model.keras"
    SCALER_X_PATH = _first_existing(
        model_dir / "scaler_X.joblib", model_dir / "scaler_x.joblib"
    )
    SCALER_Y_PATH = _first_existing(
        model_dir / "scaler_Y.joblib", model_dir / "scaler_y.joblib"
    )
    METADATA_PATH = model_dir / "metadata.json"

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
    if not METADATA_PATH.exists():
        raise FileNotFoundError(f"Metadata file not found: {METADATA_PATH}")

    model = load_model(MODEL_PATH)
    scaler_X = joblib.load(SCALER_X_PATH)
    scaler_y = joblib.load(SCALER_Y_PATH)
    with open(METADATA_PATH, "r") as f:
        metadata = json.load(f)

    return model, scaler_X, scaler_y, metadata


# SEED WINDOWS KALAU TIDAK DIBERIKAN DATA POLUTAN
def load_seed_window(
    model_dir: str | Path, feat_cols: List[str], time_step: int
) -> pd.DataFrame:
    model_dir = (
        Path(model_dir) if Path(model_dir).is_absolute() else MODELS_ROOT / model_dir
    )

    csv = model_dir / "seed_window.csv"

    if csv.exists():
        df = pd.read_csv(csv)
        if "Tanggal" in df.columns:
            df["Tanggal"] = pd.to_datetime(df["Tanggal"])
            df = df.sort_values("Tanggal").set_index("Tanggal")
    else:
        raise FileNotFoundError(
            f"No seed window found in {model_dir}. seed_window.csv."
        )

    missing = [c for c in feat_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Seed window missing required feature columns: {missing}")
    if len(df) < time_step:
        raise ValueError(f"Seed window has {len(df)} rows but time_step={time_step}.")

    return df.sort_index().iloc[-time_step:].copy()


def predict_future_pollutants(
    df_hist: pd.DataFrame | None,
    df_meteorology: pd.DataFrame,
    model_dir: str | Path,
) -> pd.DataFrame:

    model, scaler_X, scaler_y, metadata = load_saved_model(model_dir)
    time_step: int = int(metadata["time_step"])
    feat_cols: List[str] = list(metadata["features"])
    target_cols: List[str] = list(metadata["targets"])

    df_meteorology = _ensure_datetime_index(df_meteorology)

    # KALAU ADA HISTORY
    if df_hist is not None:
        df_hist = _ensure_datetime_index(df_hist)
        missing_hist = [c for c in feat_cols if c not in df_hist.columns]
        if missing_hist:
            raise ValueError(
                f"df_hist is missing required feature columns: {missing_hist}"
            )
        hist_feats = _preprocess_history(df_hist, feat_cols, target_cols)
        window = hist_feats.iloc[-time_step:].copy(deep=True)
    else:
        # KALAU TIDAK ADA HISTORY PAKE SEED WINDOW
        window = load_seed_window(model_dir, feat_cols, time_step)

    # CEK NAN PADA WINDOW
    if window.isna().any().any():
        bad_cols = window.columns[window.isna().any()].tolist()
        raise ValueError(
            "Initial window contains NaNs. Fix your seed_window or supply history. "
            f"Affected columns: {bad_cols}"
        )

    # CEK TIPE DATA METEOROLOGY
    for m in meteorology:
        if m not in df_meteorology.columns:
            raise ValueError(f"df_future_met missing required column: '{m}'")
        df_meteorology[m] = pd.to_numeric(df_meteorology[m], errors="coerce")

    preds_out: List[tuple] = []

    for dt, row in df_meteorology.iterrows():
        new_row = pd.Series(index=feat_cols, dtype=float)

        # MASUKIN METEOROLOGI
        for m in meteorology:
            val = row[m]
            if pd.isna(val):
                raise ValueError(
                    f"Future meteorology has NaN/invalid value on {pd.to_datetime(dt).date()} for '{m}'."
                )
            new_row[m] = float(val)

        # PLACEHOLDER UNTUK PREDIKSI
        for prediction in target_cols:
            new_row[prediction] = np.nan

        new_row_df = pd.DataFrame([new_row], index=[pd.to_datetime(dt)])
        next_window_uns = (
            pd.concat(
                [
                    pd.DataFrame(window.values, columns=feat_cols, index=window.index),
                    new_row_df,
                ],
                axis=0,
            )
            .iloc[-time_step:]
            .copy(deep=True)
        )

        if next_window_uns.iloc[:-1].isna().any().any():
            next_window_uns.iloc[:-1] = next_window_uns.iloc[:-1].ffill().bfill()

        prev_vals = next_window_uns.iloc[-2][target_cols].to_numpy(dtype=float)
        col_idx = [next_window_uns.columns.get_loc(c) for c in target_cols]
        next_window_uns.iloc[-1, col_idx] = prev_vals

        if next_window_uns.isna().any().any():
            bad = next_window_uns.isna()
            bad_locs = []
            for r in range(bad.shape[0]):
                cols = bad.columns[bad.iloc[r]].tolist()
                if cols:
                    bad_locs.append(f"{next_window_uns.index[r]} -> {cols}")
            raise ValueError("NaNs remain before scaling: " + "; ".join(bad_locs))

        # SCALE
        X_step_scaled = scaler_X.transform(next_window_uns.values)[np.newaxis, :, :]
        y_next_scaled = model.predict(X_step_scaled, verbose=0)
        y_next = scaler_y.inverse_transform(y_next_scaled)[0]

        # SIMPAN HASIL PREDIKSI
        preds_out.append(
            (pd.to_datetime(dt), dict(zip(target_cols, map(float, y_next))))
        )

        final_next_row = new_row.copy()
        for ip, prediction in enumerate(target_cols):
            final_next_row[prediction] = float(y_next[ip])

        window = (
            pd.concat([window, final_next_row.to_frame().T], axis=0)
            .iloc[-time_step:]
            .copy(deep=True)
        )

    # Build output
    if not preds_out:
        return pd.DataFrame(columns=target_cols)

    pred_df = pd.DataFrame({dt: vals for dt, vals in preds_out}).T
    pred_df.index = pd.to_datetime(pred_df.index)
    pred_df.index.name = "Tanggal"
    pred_df = pred_df.sort_index()
    pred_df = pred_df[target_cols]
    return pred_df


def create_meteorology_df(
    tanggal: Iterable[pd.Timestamp],
    temperatur: Iterable[float],
    kelembapan: Iterable[float],
    curah_hujan: Iterable[float],
    penyinaran_matahari: Iterable[float],
    kecepatan_angin: Iterable[float],
) -> pd.DataFrame:
    df = pd.DataFrame(
        {
            "Tanggal": pd.to_datetime(list(tanggal)),
            "Temperatur": list(temperatur),
            "Kelembapan": list(kelembapan),
            "Curah Hujan": list(curah_hujan),
            "Penyinaran Matahari": list(penyinaran_matahari),
            "Kecepatan Angin": list(kecepatan_angin),
        }
    )
    return df


def extend_meteorology(
    df_future_met_week1: pd.DataFrame,
    extra_days: int = 7,  # 1 minggu
) -> pd.DataFrame:

    df_future_met_week1 = df_future_met_week1.copy()
    df_future_met_week1 = _ensure_datetime_index(df_future_met_week1)

    last_date = df_future_met_week1.index.max()
    new_index = pd.date_range(
        last_date + pd.Timedelta(days=1), periods=extra_days, freq="D"
    )

    last_row = df_future_met_week1.iloc[-1]
    ext = pd.DataFrame(
        [last_row.values] * extra_days,
        columns=df_future_met_week1.columns,
        index=new_index,
    )

    ext.index.name = "Tanggal"
    return ext.reset_index()


def prepare_history_from_user(
    history_df: pd.DataFrame,
    model_dir: str | Path,
) -> pd.DataFrame:

    _, _, _, metadata = load_saved_model(model_dir)
    features_cols = list(metadata["features"])
    target_cols = list(metadata["targets"])
    time_step = int(metadata["time_step"])

    h = _ensure_datetime_index(history_df).copy()
    user_cols = set(h.columns)

    if set(features_cols).issubset(user_cols):
        h = h[features_cols].sort_index()

    if not set(target_cols).issubset(user_cols):
        raise ValueError(
            "history_file must contain either ALL feature columns "
            f"{features_cols} or at least ALL target columns {target_cols}."
        )

    seed = load_seed_window(model_dir, features_cols, time_step)
    all_idx = seed.index.union(h.index).sort_values()
    base = seed.reindex(all_idx)

    # Kalau user memberikan target_cols, overwrite seed window
    for c in target_cols:
        base.loc[h.index, c] = pd.to_numeric(h[c], errors="coerce")

    # Isi meteorology dengan forward-fill kalau ada nan
    base[meteorology] = base[meteorology].ffill().bfill()
    base = base[features_cols].sort_index()
    return base


def predict_next_week(
    model_dir: str | Path,
    df_preds_week1: pd.DataFrame,
    df_future_met_week1: pd.DataFrame,
) -> pd.DataFrame:

    _, _, _, metadata = load_saved_model(model_dir)
    features_cols = list(metadata["features"])
    target_cols = list(metadata["targets"])
    time_step = int(metadata["time_step"])

    seed = load_seed_window(model_dir, features_cols, time_step)

    week_1_meteorology = _ensure_datetime_index(df_future_met_week1)
    week_1_features = week_1_meteorology.copy()
    preds_w1 = _ensure_datetime_index(df_preds_week1)

    for c in target_cols:
        if c not in preds_w1.columns:
            raise ValueError(f"preds_week1 missing column '{c}'.")
        week_1_features[c] = preds_w1[c]

    week_1_features = week_1_features[features_cols]

    df_preds_next_week = pd.concat([seed, week_1_features]).sort_index()
    return df_preds_next_week


def predict_pollutants(
    df_meteorology: pd.DataFrame,
    model_dir: str | Path | None = None,
    df_history_from_user: pd.DataFrame | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:

    # ? DEFAULT MODEL
    model_dir = read_active_model_name() if model_dir is None else model_dir

    # CEK APAKAH ADA HISTORY
    df_history = None
    if df_history_from_user is not None:
        df_history = prepare_history_from_user(df_history_from_user, model_dir)

    input_prediction = predict_future_pollutants(
        df_hist=df_history,
        df_meteorology=df_meteorology,
        model_dir=model_dir,
    )

    if df_history is None:
        df_hist_week2 = predict_next_week(
            model_dir=model_dir,
            df_preds_week1=input_prediction,
            df_future_met_week1=df_meteorology,
        )
    else:
        _, _, _, metadata = load_saved_model(model_dir)
        feat_cols = list(metadata["features"])
        target_cols = list(metadata["targets"])
        w1_met = _ensure_datetime_index(df_meteorology)
        w1_feats = w1_met.copy()
        preds_w1 = _ensure_datetime_index(input_prediction)
        for c in target_cols:
            w1_feats[c] = preds_w1[c]
        w1_feats = w1_feats[feat_cols]
        df_hist_week2 = pd.concat([df_history, w1_feats]).sort_index()

    df_future_met_week2 = extend_meteorology(
        df_future_met_week1=df_meteorology,
        extra_days=7,
    )

    future_prediction = predict_future_pollutants(
        df_hist=df_hist_week2,
        df_meteorology=df_future_met_week2,
        model_dir=model_dir,
    )

    predictions = pd.concat([input_prediction, future_prediction]).sort_index()
    return input_prediction, future_prediction, predictions


# ? TEST
# future_dates = pd.date_range("2025-10-20", periods=7, freq="D")
# df_future_met = make_future_met_df(
#     dates=future_dates,
# temperatur=[27.1, 27.3, 27.0, 27.2, 27.4, 27.1, 26.9],
# kelembapan=[85, 86, 84, 83, 85, 84, 86],
# curah_hujan=[10, 0, 5.2, 3, 1, 0, 2.5],
# penyinaran_matahari=[5, 6, 4.5, 5.5, 6.2, 6, 4.8],
# kecepatan_angin=[2.3, 2.0, 2.5, 2.1, 2.0, 2.2, 2.4],
# )

# Week-1 meteorology (you already have this):
# future_dates = pd.date_range("2025-10-20", periods=7, freq="D")
# df_future_met = make_future_met_df(
#     dates=future_dates,
#     temperatur=[27.1, 27.3, 27.0, 27.2, 27.4, 27.1, 26.9],
#     kelembapan=[85, 86, 84, 83, 85, 84, 86],
#     curah_hujan=[10, 0, 5.2, 3, 1, 0, 2.5],
#     penyinaran_matahari=[5, 6, 4.5, 5.5, 6.2, 6, 4.8],
#     kecepatan_angin=[2.3, 2.0, 2.5, 2.1, 2.0, 2.2, 2.4],
# )


# preds_week1, preds_week2, preds_all = forecast_two_weeks_from_week1_met(
#     df_future_met_week1=df_future_met,
#     model_dir=None,  # None -> uses read_active_model_name()
# )

# print(preds_week1)
# print(preds_week2)
# print(preds_all)
