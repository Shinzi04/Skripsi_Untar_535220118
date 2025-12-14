from pathlib import Path
from typing import List

import numpy as np
import pandas as pd

PREDICTIONS_BASE = Path(__file__).resolve().parents[1] / "predictions_model"
MODELS_BASE = PREDICTIONS_BASE / "models"
MODEL_INFO_PATH = MODELS_BASE / "model_information.json"


# CEK KOLOM TANGGAL
def _ensure_datetime_index(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "Tanggal" in df.columns:
        df["Tanggal"] = pd.to_datetime(df["Tanggal"])
        df = df.sort_values("Tanggal").set_index("Tanggal")
    if not isinstance(df.index, pd.DatetimeIndex):
        raise ValueError("DataFrame must have a DatetimeIndex or a 'Tanggal' column.")
    return df


def _preprocess_history(
    df_hist: pd.DataFrame, feat_cols: List[str], target_cols: List[str]
) -> pd.DataFrame:
    dfh = df_hist.copy()
    dfh[target_cols] = dfh[target_cols].replace(0, np.nan)
    dfh = dfh.sort_index()
    dfh = dfh.interpolate(method="linear", limit_direction="both")
    return dfh[feat_cols]


def _first_existing(*paths: Path) -> Path:
    for p in paths:
        if p.exists():
            return p
    raise FileNotFoundError(f"None of the expected files exist: {paths}")
