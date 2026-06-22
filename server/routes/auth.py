import random
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..config import config
from ..db import query
from ..deps import get_current_user_id

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


def _sign_token(user_id) -> str:
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


def _format_user(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "full_name": row["full_name"],
        "email_verified": row["email_verified"],
        "created_date": row["created_at"].isoformat() if row["created_at"] else None,
    }


@router.post("/register")
def register(body: RegisterBody):
    email = body.email.lower()
    existing = query("SELECT id FROM users WHERE email = %s", [email])
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    password_hash = bcrypt.hashpw(
        body.password.encode("utf-8"),
        bcrypt.gensalt(rounds=10),
    ).decode("utf-8")
    user_rows = query(
        "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING *",
        [email, password_hash],
    )
    user = user_rows[0]
    otp = config["auth"].get("devOtp") or str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    query(
        "INSERT INTO otp_codes (email, code, expires_at) VALUES (%s, %s, %s)",
        [email, otp, expires_at],
    )
    print(f"[auth] OTP for {email}: {otp}")
    return {"ok": True, "user_id": str(user["id"])}


@router.post("/verify-otp")
def verify_otp(body: VerifyOtpBody):
    email = body.email.lower()
    otp_rows = query(
        """SELECT * FROM otp_codes
           WHERE email = %s AND code = %s AND expires_at > NOW()
           ORDER BY created_at DESC LIMIT 1""",
        [email, body.otpCode],
    )
    if not otp_rows:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    user_rows = query(
        """UPDATE users SET email_verified = TRUE, updated_at = NOW()
           WHERE email = %s RETURNING *""",
        [email],
    )
    if not user_rows:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_rows[0]
    access_token = _sign_token(user["id"])
    return {"access_token": access_token, "user": _format_user(user)}


@router.post("/resend-otp")
def resend_otp(body: ResendOtpBody):
    email = body.email.lower()
    otp = config["auth"].get("devOtp") or str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    query(
        "INSERT INTO otp_codes (email, code, expires_at) VALUES (%s, %s, %s)",
        [email, otp, expires_at],
    )
    print(f"[auth] OTP for {email}: {otp}")
    return {"ok": True}


@router.post("/login")
def login(body: LoginBody):
    email = body.email.lower()
    user_rows = query("SELECT * FROM users WHERE email = %s", [email])
    if not user_rows:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = user_rows[0]
    if not bcrypt.checkpw(
        body.password.encode("utf-8"),
        user["password_hash"].encode("utf-8"),
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user["email_verified"]:
        raise HTTPException(status_code=403, detail="Please verify your email first")

    access_token = _sign_token(user["id"])
    return {"access_token": access_token, "user": _format_user(user)}


@router.get("/me")
def get_me(user_id: str = Depends(get_current_user_id)):
    user_rows = query("SELECT * FROM users WHERE id = %s", [user_id])
    if not user_rows:
        raise HTTPException(status_code=404, detail="User not found")
    return _format_user(user_rows[0])


@router.patch("/me")
def update_me(body: UpdateMeBody, user_id: str = Depends(get_current_user_id)):
    user_rows = query(
        """UPDATE users SET full_name = %s, updated_at = NOW()
           WHERE id = %s RETURNING *""",
        [body.full_name, user_id],
    )
    return _format_user(user_rows[0])


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordBody):
    email = body.email.lower()
    user_rows = query("SELECT id FROM users WHERE email = %s", [email])
    if user_rows:
        token = secrets.token_hex(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        query(
            """INSERT INTO password_reset_tokens (user_id, token, expires_at)
               VALUES (%s, %s, %s)""",
            [user_rows[0]["id"], token, expires_at],
        )
        print(f"[auth] Password reset link token for {email}: {token}")
    return {"ok": True}


@router.post("/reset-password")
def reset_password(body: ResetPasswordBody):
    token_rows = query(
        """SELECT * FROM password_reset_tokens
           WHERE token = %s AND expires_at > NOW()""",
        [body.resetToken],
    )
    if not token_rows:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    token_row = token_rows[0]
    password_hash = bcrypt.hashpw(
        body.newPassword.encode("utf-8"),
        bcrypt.gensalt(rounds=10),
    ).decode("utf-8")
    query(
        "UPDATE users SET password_hash = %s, updated_at = NOW() WHERE id = %s",
        [password_hash, token_row["user_id"]],
    )
    query("DELETE FROM password_reset_tokens WHERE id = %s", [token_row["id"]])
    return {"ok": True}
