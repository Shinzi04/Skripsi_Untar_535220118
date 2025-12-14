import datetime as dt
import os
import secrets
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

load_dotenv()

ADMIN_USER = os.getenv("ADMIN_USER")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", 60))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _verify_admin_credentials(username: str, password: str) -> bool:
    return (
        secrets.compare_digest(username, ADMIN_USER)
        and ADMIN_PASSWORD
        and secrets.compare_digest(password, ADMIN_PASSWORD)
    )

def create_access_token(subject: str, extra: Optional[Dict[str, Any]] = None) -> str:
    now = dt.datetime.utcnow()
    exp = now + dt.timedelta(minutes=JWT_EXPIRES_MIN)
    payload = {"sub": subject, "role": "admin", "iat": int(now.timestamp()), "exp": exp}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from e

def admin_required(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    data = decode_access_token(token)
    if data.get("role") != "admin" or not data.get("sub"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return {"username": data["sub"], "role": "admin"}
