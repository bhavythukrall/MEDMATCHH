"""Auth routes: register, login, logout, me."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User
from schemas import RegisterIn, LoginIn, UserOut
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

VALID_ROLES = {"patient", "asha", "hospital"}


@router.post("/register", response_model=UserOut)
async def register(body: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    email = body.email.lower()
    res = await db.execute(select(User).where(User.email == email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email, password_hash=hash_password(body.password),
        name=body.name, phone=body.phone, role=body.role, hospital_id=body.hospital_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    set_auth_cookies(response, create_access_token(user.id, user.email, user.role), create_refresh_token(user.id))
    return user


@router.post("/login", response_model=UserOut)
async def login(body: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    set_auth_cookies(response, create_access_token(user.id, user.email, user.role), create_refresh_token(user.id))
    return user


@router.post("/logout")
async def logout(response: Response, _: User = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"success": True}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
