import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.json"

_env_path = ROOT / ".env"
if _env_path.exists():
    for line in _env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))

with CONFIG_PATH.open(encoding="utf-8") as f:
    config = json.load(f)


def get_db_config() -> dict:
    db = config["database"]
    return {
        "host": db["host"],
        "port": db["port"],
        "user": db["user"],
        "password": db["password"],
        "dbname": db["database"],
    }


def get_llm_config() -> dict:
    llm = config.get("llm", {})
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to your environment or a local .env file."
        )
    return {
        "api_key": api_key,
        "model": llm.get("model", "gemini-2.5-flash"),
        "analyze_prompt": llm.get("analyzePrompt", ""),
        "max_wait_seconds": int(llm.get("maxWaitSeconds", 120)),
        "retry_delay_seconds": int(llm.get("retryDelaySeconds", 5)),
    }
