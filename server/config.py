import json
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.json"

# Load env files (later files override earlier ones).
# .env.example is a dev fallback when .env has not been created yet.
for env_name in (".env.example", ".env", ".env.local"):
    env_path = ROOT / env_name
    if env_path.is_file():
        load_dotenv(env_path, override=env_name != ".env.example")

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
            "GEMINI_API_KEY is not set. Copy .env.example to .env and set your key, "
            "or export GEMINI_API_KEY in the shell."
        )
    return {
        "api_key": api_key,
        "model": llm.get("model", "gemini-2.5-flash"),
        "analyze_prompt": llm.get("analyzePrompt", ""),
        "max_wait_seconds": int(llm.get("maxWaitSeconds", 120)),
        "retry_delay_seconds": int(llm.get("retryDelaySeconds", 5)),
    }
