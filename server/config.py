import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.json"

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
