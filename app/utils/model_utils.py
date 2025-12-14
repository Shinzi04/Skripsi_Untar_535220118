import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import HTTPException, status

PREDICTIONS_BASE = Path(__file__).resolve().parents[1] / "predictions_model"
MODELS_BASE = PREDICTIONS_BASE / "models"
MODEL_INFO_PATH = MODELS_BASE / "model_information.json"


def _read_json(path: Path) -> Optional[dict]:
    try:
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return None


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    tmp.replace(path)


def _active_model_name() -> Optional[str]:
    info = _read_json(MODEL_INFO_PATH)
    if not info:
        return None
    for key in ("active", "active_model", "activeModel"):
        val = info.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def _required_files_present(model_dir: Path) -> bool:
    requirments = {
        "bilstm_model.keras": model_dir / "bilstm_model.keras",
        "evaluation.json": model_dir / "evaluation.json",
        "metadata.json": model_dir / "metadata.json",
        "scaler_X.joblib": model_dir / "scaler_X.joblib",
        "scaler_y.joblib": model_dir / "scaler_y.joblib",
    }
    return all(p.exists() for p in requirments.values())


def _collect_model_entry(model_dir: Path) -> Dict:
    meta = _read_json(model_dir / "metadata.json") or {}
    eval_ = _read_json(model_dir / "evaluation.json") or {}
    overall = eval_.get("Overall")

    try:
        unix_time = int(model_dir.stat().st_mtime)
        created_at = datetime.fromtimestamp(unix_time).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        created_at = None

    return {
        "name": model_dir.name,
        "created_at": created_at,
        "overall": overall,
    }


def _list_trained_models() -> List[Dict]:
    if not MODELS_BASE.exists():
        return []
    items: List[Dict] = []
    for p in MODELS_BASE.iterdir():
        if p.is_dir() and _required_files_present(p):
            items.append(_collect_model_entry(p))
    items.sort(key=lambda x: (x["created_at"] or 0), reverse=True)
    return items


def _ensure_model_exists(name: str) -> Path:
    model_dir = MODELS_BASE / name
    if not model_dir.exists() or not model_dir.is_dir():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Model "{name}" not found in {MODELS_BASE}.',
        )
    if not _required_files_present(model_dir):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'Model "{name}" is incomplete; missing required files.',
        )
    return model_dir
