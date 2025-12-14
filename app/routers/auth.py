# app/routers/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Form
from utils.auth import _verify_admin_credentials, create_access_token, JWT_EXPIRES_MIN

router = APIRouter()

@router.post("/login")
def login(username: str = Form(...), password: str = Form(...)):
    if not _verify_admin_credentials(username, password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(subject=username)
    return {"access_token": token, "token_type": "bearer", "expires_in": JWT_EXPIRES_MIN * 60}
