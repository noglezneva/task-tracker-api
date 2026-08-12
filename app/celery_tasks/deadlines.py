from datetime import datetime, timedelta, timezone

from celery import shared_task
from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.core.celery_db import CelerySessionLocal
from app.core.config import settings
from app.models.task import Task, TaskStatus

logger = get_task_logger(__name__)


@shared_task(name="app.celery_tasks.deadlines.check_upcoming_deadlines")
def check_upcoming_deadlines() -> dict[str, int | str]:
    today = datetime.now(timezone.utc).date()

    reminder_until = today + timedelta(days=settings.DEADLINE_REMINDER_DAYS)

    query = (
        select(Task)
        .where(
            Task.status == TaskStatus.OPEN,
            Task.due_date >= today,
            Task.due_date <= reminder_until,
        )
        .order_by(Task.due_date.asc())
    )

    with CelerySessionLocal() as db:
        due_tasks = list(db.scalars(query).all())

    for task in due_tasks:
        days_left = (task.due_date - today).days

        if days_left == 0:
            deadline_text = "due today"
        elif days_left == 1:
            deadline_text = "due tomorrow"
        else:
            deadline_text = f"due in {days_left} days"

        logger.warning(
            ("Deadline reminder: user_id=%s task_id=%s title=%r due_date=%s (%s)"),
            task.user_id,
            task.id,
            task.title,
            task.due_date,
            deadline_text,
        )

    return {
        "reminders": len(due_tasks),
        "from_date": today.isoformat(),
        "to_date": reminder_until.isoformat(),
    }
