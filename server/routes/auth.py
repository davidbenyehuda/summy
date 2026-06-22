import random
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import config
from ..db import get_db
from ..deps import get_current_user_id
from ..models import OtpCode, PasswordResetToken, User

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: str
    password: str


class VerifyOtpBody(BaseModel):
    email: str
    otpCode: str


class ResendOtpBody(BaseModel):
    email: str


class LoginBody(BaseModel):
    email: str
    password: str


class UpdateMeBody(BaseModel):
    full_name: str | None = None


class ForgotPasswordBody(BaseModel):
    email: str


class ResetPasswordBody(BaseModel):
    resetToken: str
    newPassword: str


def _sign_token(user_id: uuid.UUID) -> str:
    expires_in = config["auth"]["jwtExpiresIn"]
    match = re.fullmatch(r"(\d+)([dhms])", expires_in)
    if not match:
        delta = timedelta(days=7)
    else:
        amount, unit = int(match.group(1)), match.group(2)
        deltas = {
            "d": timedelta(days=amount),
            "h": timedelta(hours=amount),
            "m": timedelta(minutes=amount),
            "s": timedelta(seconds=amount),
        }
        delta = deltas[unit]
    exp = datetime.now(timezone.utc) + delta
    return jwt.encode(
        {"sub": str(user_id), "exp": exp},
        config["auth"]["jwtSecret"],
        algorithm="HS256",
    )


def _format_user(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "email_verified": user.email_verified,
        "created_date": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    email = body.email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    password_hash = bcrypt.hashpw(
        body.password.encode("utf-8"),
        bcrypt.gensalt(rounds=10),
    ).decode("utf-8")
    user = User(email=email, password_hash=password_hash)
    db.add(user)

    otp = config["auth"].get("devOtp") or str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.add(OtpCode(email=email, code=otp, expires_at=expires_at))
    db.commit()
    db.refresh(user)

    print(f"[auth] OTP for {email}: {otp}")
    return {"ok": True, "user_id": str(user.id)}


@router.post("/verify-otp")
def verify_otp(body: VerifyOtpBody, db: Session = Depends(get_db)):
    email = body.email.lower()
    now = datetime.now(timezone.utc)
    otp_row = db.scalar(
        select(OtpCode)
        .where(
            OtpCode.email == email,
            OtpCode.code == body.otpCode,
            OtpCode.expires_at > now,
        )
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    )
    if not otp_row:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.email_verified = True
    user.updated_at = now
    db.commit()
    db.refresh(user)

    access_token = _sign_token(user.id)
    return {"access_token": access_token, "user": _format_user(user)}


@router.post("/resend-otp")
def resend_otp(body: ResendOtpBody, db: Session = Depends(get_db)):
    email = body.email.lower()
    otp = config["auth"].get("devOtp") or str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.add(OtpCode(email=email, code=otp, expires_at=expires_at))
    db.commit()
    print(f"[auth] OTP for {email}: {otp}")
    return {"ok": True}


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    email = body.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not bcrypt.checkpw(
        body.password.encode("utf-8"),
        user.password_hash.encode("utf-8"),
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email first")

    access_token = _sign_token(user.id)
    return {"access_token": access_token, "user": _format_user(user)}


@router.get("/me")
def get_me(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _format_user(user)


@router.patch("/me")
def update_me(
    body: UpdateMeBody,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.full_name = body.full_name
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return _format_user(user)


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordBody, db: Session = Depends(get_db)):
    email = body.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if user:
        token = secrets.token_hex(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.add(
            PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
        )
        db.commit()
        print(f"[auth] Password reset link token for {email}: {token}")
    return {"ok": True}


@router.post("/reset-password")
def reset_password(body: ResetPasswordBody, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    token_row = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token == body.resetToken,
            PasswordResetToken.expires_at > now,
        )
    )
    if not token_row:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.get(User, token_row.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = bcrypt.hashpw(
        body.newPassword.encode("utf-8"),
        bcrypt.gensalt(rounds=10),
    ).decode("utf-8")
    user.updated_at = now
    db.delete(token_row)
    db.commit()
    return {"ok": True}
