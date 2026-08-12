from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "task_tracker",
    broker=settings.REDIS_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.celery_tasks.deadlines"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.CELERY_TIMEZONE,
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "check-upcoming-deadlines-daily": {
            "task": "app.celery_tasks.deadlines.check_upcoming_deadlines",
            "schedule": crontab(
                hour=settings.DEADLINE_CHECK_HOUR_UTC,
                minute=0,
            ),
        },
    },
)
