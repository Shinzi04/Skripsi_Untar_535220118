import csv
from typing import List

from fastapi import HTTPException, UploadFile, status

REQUIRED_COLS: List[str] = [
    "PM10",
    "SO2",
    "CO",
    "O3",
    "NO2",
    "Temperatur",
    "Kelembapan",
    "Curah Hujan",
    "Penyinaran Matahari",
    "Kecepatan Angin",
]

ALLOWED_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
}


def _first_nonempty_line(text: str) -> str:
    for line in text.splitlines():
        if line.strip() and not line.lstrip().startswith("#"):
            return line
    return ""


def _detect_header_and_delimiter(text: str):
    try:
        dialect = csv.Sniffer().sniff(text, delimiters=[",", ";", "\t"])
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","
    first_line = _first_nonempty_line(text)
    reader = csv.reader([first_line], delimiter=delimiter)
    try:
        header = next(reader)
    except StopIteration:
        header = []
    if header:
        header[0] = header[0].lstrip("\ufeff")
    header = [h.strip() for h in header]
    return header, delimiter


def validate_data(upload: UploadFile, required_cols: List[str] = REQUIRED_COLS) -> None:
    name_ok = upload.filename.lower().endswith(".csv")
    content_allowed = upload.content_type in ALLOWED_CONTENT_TYPES
    if not (name_ok or content_allowed):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must be CSV (.csv).",
        )

    pos = upload.file.tell()
    sample = upload.file.read(4096)
    try:
        text = sample.decode("utf-8", errors="ignore")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to read CSV header."
        )
    header, _ = _detect_header_and_delimiter(text)

    upload.file.seek(pos)
    if not header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="CSV header is missing."
        )

    header_lower = {h.lower() for h in header}
    missing_cols = [c for c in required_cols if c.lower() not in header_lower]
    if missing_cols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "CSV header missing required columns.",
                "missing": missing_cols,
                "required": required_cols,
                "found": header,
            },
        )
