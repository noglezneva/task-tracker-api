from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def _to_sync_database_url(database_url: str) -> str:
    return (
        database_url.replace(
            "postgresql+asyncpg://",
            "postgresql+psycopg2://",
        )
        .replace(
            "postgresql+psycopg://",
            "postgresql+psycopg2://",
        )
        .replace(
            "sqlite+aiosqlite://",
            "sqlite://",
        )
    )


celery_engine = create_engine(
    _to_sync_database_url(str(settings.DATABASE_URL)),
    pool_pre_ping=True,
)

CelerySessionLocal = sessionmaker(
    bind=celery_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)
