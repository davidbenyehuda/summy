import bcrypt

from .config import config
from .db import query


def seed_dev_user() -> None:
    dev_user = config.get("auth", {}).get("devUser")
    if not dev_user or not dev_user.get("email") or not dev_user.get("password"):
        return

    email = dev_user["email"].lower()
    existing = query("SELECT id FROM users WHERE email = %s", [email])
    if existing:
        print(f"[seed] Dev user already exists: {email}")
        return

    password_hash = bcrypt.hashpw(
        dev_user["password"].encode("utf-8"),
        bcrypt.gensalt(rounds=10),
    ).decode("utf-8")
    user_rows = query(
        """INSERT INTO users (email, password_hash, full_name, email_verified)
           VALUES (%s, %s, %s, TRUE) RETURNING id""",
        [email, password_hash, dev_user.get("fullName") or "Dev User"],
    )
    user_id = user_rows[0]["id"]

    query(
        """INSERT INTO student_profiles
           (user_id, full_name, grade, subjects, learning_goal, onboarding_complete)
           VALUES (%s, %s, %s, %s, %s, TRUE)""",
        [
            user_id,
            dev_user.get("fullName") or "Dev User",
            "י׳12",
            '["ביולוגיה"]',
            "פיתוח מקומי",
        ],
    )
    print(f"[seed] Dev user created: {email}")


def log_dev_credentials() -> None:
    dev_user = config.get("auth", {}).get("devUser")
    if not dev_user or not dev_user.get("email") or not dev_user.get("password"):
        return

    print("--- Dev login (skip registration) ---")
    print(f"  Email:    {dev_user['email']}")
    print(f"  Password: {dev_user['password']}")
    print("-------------------------------------")
