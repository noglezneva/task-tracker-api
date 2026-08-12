from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "Task Tracker API"
    ENV: str = "development"
    DEBUG: bool = True

    DATABASE_URL: AnyUrl = Field(..., description="SQLAlchemy database URL")

    JWT_SECRET_KEY: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    REDIS_URL: str = Field(..., description="Redis broker URL")
    CELERY_RESULT_BACKEND: str = Field(..., description="Celery result backend URL")
    CELERY_TIMEZONE: str = "UTC"

    DEADLINE_REMINDER_DAYS: int = Field(default=1, ge=0, le=30)
    DEADLINE_CHECK_HOUR_UTC: int = Field(default=8, ge=0, le=23)

    TEST_DATABASE_URL: AnyUrl | None = None


settings = Settings()
