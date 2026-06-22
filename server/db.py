from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import get_db_config

_db = get_db_config()
_conninfo = (
    f"host={_db['host']} port={_db['port']} user={_db['user']} "
    f"password={_db['password']} dbname={_db['dbname']}"
)

pool = ConnectionPool(conninfo=_conninfo, min_size=1, max_size=10, open=True)


def init_db() -> None:
    schema_path = Path(__file__).parent / "schema.sql"
    with pool.connection() as conn:
        conn.execute(schema_path.read_text(encoding="utf-8"))
        conn.commit()


def query(sql: str, params=None):
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, params or ())
            if cur.description:
                rows = cur.fetchall()
                conn.commit()
                return rows
            conn.commit()
            return []
