from typing import List, Optional, Union

import pandas as pd
from pydantic import BaseModel, Field, field_validator, model_validator


class HistoryFullFeatures(BaseModel):
    tanggal: List[str]
    temperatur: List[float]
    kelembapan: List[float]
    curah_hujan: List[float]
    penyinaran_matahari: List[float]
    kecepatan_angin: List[float]
    PM10: List[float]
    SO2: List[float]
    CO: List[float]
    O3: List[float]
    NO2: List[float]

    @field_validator("*", mode="before")
    @classmethod
    def not_empty(cls, v, info):
        if info.field_name == "tanggal":
            return v
        if v is None:
            raise ValueError(f"{info.field_name} is required")
        return v

    # Cross-field length checks
    @model_validator(mode="after")
    def check_lengths(self):
        n = len(self.tanggal)
        for name in ["PM10", "SO2", "CO", "O3", "NO2"]:
            if len(getattr(self, name)) != n:
                raise ValueError(f"{name} length must equal dates length")
        for name in [
            "temperatur",
            "kelembapan",
            "curah_hujan",
            "penyinaran_matahari",
            "kecepatan_angin",
        ]:
            if len(getattr(self, name)) != n:
                raise ValueError(f"{name} length must equal dates length")
        return self


class HistoryPollutantsOnly(BaseModel):
    tanggal: List[str]
    PM10: List[float]
    SO2: List[float]
    CO: List[float]
    O3: List[float]
    NO2: List[float]

    @model_validator(mode="after")
    def check_lengths(self):
        n = len(self.tanggal)
        for name in ["PM10", "SO2", "CO", "O3", "NO2"]:
            if len(getattr(self, name)) != n:
                raise ValueError(f"{name} length must equal dates length")
        return self


HistoryPayload = Union[HistoryFullFeatures, HistoryPollutantsOnly]


class PredictRequest(BaseModel):
    tanggal: List[str] = Field(..., description="YYYY-MM-DD strings")
    temperatur: List[float]
    kelembapan: List[float]
    curah_hujan: List[float]
    penyinaran_matahari: List[float]
    kecepatan_angin: List[float]

    history: Optional[HistoryPayload] = Field(
        default=None,
        description="Optional user-provided history: full features or pollutants-only",
    )

    @model_validator(mode="after")
    def check_week1_lengths(self):
        n = len(self.tanggal)
        for name in [
            "temperatur",
            "kelembapan",
            "curah_hujan",
            "penyinaran_matahari",
            "kecepatan_angin",
        ]:
            if len(getattr(self, name)) != n:
                raise ValueError(f"{name} length must equal dates length")
        return self


def _history_to_dataframe(h: HistoryPayload) -> pd.DataFrame:
    """Turn history (either full features or pollutants-only) into a DataFrame."""
    if isinstance(h, HistoryFullFeatures):
        df = pd.DataFrame(
            {
                "Tanggal": pd.to_datetime(h.tanggal),
                "Temperatur": h.temperatur,
                "Kelembapan": h.kelembapan,
                "Curah Hujan": h.curah_hujan,
                "Penyinaran Matahari": h.penyinaran_matahari,
                "Kecepatan Angin": h.kecepatan_angin,
                "PM10": h.PM10,
                "SO2": h.SO2,
                "CO": h.CO,
                "O3": h.O3,
                "NO2": h.NO2,
            }
        )
        return df
    else:
        df = pd.DataFrame(
            {
                "Tanggal": pd.to_datetime(h.tanggal),
                "PM10": h.PM10,
                "SO2": h.SO2,
                "CO": h.CO,
                "O3": h.O3,
                "NO2": h.NO2,
            }
        )
        return df
