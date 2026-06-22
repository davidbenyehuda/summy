from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_db_config


class Base(DeclarativeBase):
    pass


def _database_url() -> str:
    db = get_db_config()
    return (
        f"postgresql+psycopg://{db['user']}:{db['password']}"
        f"@{db['host']}:{db['port']}/{db['dbname']}"
    )


engine = create_engine(_database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(
            text("ALTER TABLE summary_history ADD COLUMN IF NOT EXISTS result_url TEXT")
        )
        conn.commit()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
