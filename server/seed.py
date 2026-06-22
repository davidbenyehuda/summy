import bcrypt
from sqlalchemy import select

from .config import config
from .db import SessionLocal
from .models import StudentProfile, User


def seed_dev_user() -> None:
    dev_user = config.get("auth", {}).get("devUser")
    if not dev_user or not dev_user.get("email") or not dev_user.get("password"):
        return

    email = dev_user["email"].lower()
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            print(f"[seed] Dev user already exists: {email}")
            return

        password_hash = bcrypt.hashpw(
            dev_user["password"].encode("utf-8"),
            bcrypt.gensalt(rounds=10),
        ).decode("utf-8")
        user = User(
            email=email,
            password_hash=password_hash,
            full_name=dev_user.get("fullName") or "Dev User",
            email_verified=True,
        )
        db.add(user)
        db.flush()

        db.add(
            StudentProfile(
                user_id=user.id,
                full_name=dev_user.get("fullName") or "Dev User",
                grade="י׳12",
                subjects=["ביולוגיה"],
                learning_goal="פיתוח מקומי",
                onboarding_complete=True,
            )
        )
        db.commit()
        print(f"[seed] Dev user created: {email}")
    finally:
        db.close()


def log_dev_credentials() -> None:
    dev_user = config.get("auth", {}).get("devUser")
    if not dev_user or not dev_user.get("email") or not dev_user.get("password"):
        return

    print("--- Dev login (skip registration) ---")
    print(f"  Email:    {dev_user['email']}")
    print(f"  Password: {dev_user['password']}")
    print("-------------------------------------")
