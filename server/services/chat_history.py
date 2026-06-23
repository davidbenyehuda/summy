import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..config import ROOT, config

chat_history_dir = (ROOT / config["uploads"]["dir"] / "chat-history").resolve()
chat_history_dir.mkdir(parents=True, exist_ok=True)

DEFAULT_MESSAGES = [
    {"role": "assistant", "content": "העלה מסמך ואני אנתח אותו עבורך."}
]


def _safe_email(email: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]", "_", email)


def chat_history_path(user_id: str, email: str) -> Path:
    return chat_history_dir / f"{user_id}__{_safe_email(email)}.json"


def load_chat_history(user_id: str, email: str) -> dict[str, Any]:
    path = chat_history_path(user_id, email)
    if not path.is_file():
        return _empty_history(user_id, email)

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return _empty_history(user_id, email)

    if data.get("user_id") != user_id:
        return _empty_history(user_id, email)

    return data


def save_chat_history(user_id: str, email: str, payload: dict[str, Any]) -> dict[str, Any]:
    path = chat_history_path(user_id, email)
    data = {
        "user_id": user_id,
        "email": email,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "messages": payload.get("messages", DEFAULT_MESSAGES),
        "analysis": payload.get("analysis"),
        "documentTitle": payload.get("documentTitle"),
        "isImageDocument": payload.get("isImageDocument", False),
        "quizAnswers": payload.get("quizAnswers", {}),
        "quizSubmitted": payload.get("quizSubmitted", False),
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data


def clear_chat_history(user_id: str, email: str) -> dict[str, Any]:
    path = chat_history_path(user_id, email)
    if path.is_file():
        path.unlink()
    return _empty_history(user_id, email)


def _empty_history(user_id: str, email: str) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "email": email,
        "updated_at": None,
        "messages": list(DEFAULT_MESSAGES),
        "analysis": None,
        "documentTitle": None,
        "isImageDocument": False,
        "quizAnswers": {},
        "quizSubmitted": False,
    }
