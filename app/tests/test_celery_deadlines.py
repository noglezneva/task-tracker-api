from datetime import date, datetime, timedelta, timezone
from unittest.mock import Mock
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.celery_tasks import deadlines
from app.models.task import Task, TaskStatus

TODAY = date(2026, 8, 12)


class FrozenDateTime:
    @classmethod
    def now(cls, tz=None) -> datetime:
        value = datetime(
            2026,
            8,
            12,
            12,
            0,
            tzinfo=timezone.utc,
        )

        if tz is None:
            return value.replace(tzinfo=None)

        return value.astimezone(tz)


def _configure_deadline_task(
    monkeypatch: pytest.MonkeyPatch,
    session_factory: sessionmaker[Session],
    *,
    reminder_days: int = 1,
) -> None:
    monkeypatch.setattr(
        deadlines,
        "CelerySessionLocal",
        session_factory,
    )
    monkeypatch.setattr(
        deadlines,
        "datetime",
        FrozenDateTime,
    )
    monkeypatch.setattr(
        deadlines.settings,
        "DEADLINE_REMINDER_DAYS",
        reminder_days,
    )


def _add_task(
    session_factory: sessionmaker[Session],
    *,
    due_date: date | None,
    status: TaskStatus = TaskStatus.OPEN,
    title: str = "Test task",
) -> None:
    with session_factory() as db:
        db.add(
            Task(
                user_id=uuid4(),
                title=title,
                description=None,
                status=status,
                priority=1,
                due_date=due_date,
            )
        )
        db.commit()


@pytest.mark.parametrize(
    ("days_from_today", "status", "expected_reminders"),
    [
        (0, TaskStatus.OPEN, 1),
        (1, TaskStatus.OPEN, 1),
        (2, TaskStatus.OPEN, 0),
        (-1, TaskStatus.OPEN, 0),
        (0, TaskStatus.DONE, 0),
    ],
    ids=[
        "due-today",
        "due-tomorrow",
        "outside-reminder-window",
        "overdue",
        "done-task",
    ],
)
def test_check_upcoming_deadlines_filters_tasks(
    monkeypatch: pytest.MonkeyPatch,
    celery_session_factory: sessionmaker[Session],
    days_from_today: int,
    status: TaskStatus,
    expected_reminders: int,
) -> None:
    _configure_deadline_task(
        monkeypatch,
        celery_session_factory,
    )

    _add_task(
        celery_session_factory,
        due_date=TODAY + timedelta(days=days_from_today),
        status=status,
    )

    result = deadlines.check_upcoming_deadlines()

    assert result["reminders"] == expected_reminders
    assert result["from_date"] == "2026-08-12"
    assert result["to_date"] == "2026-08-13"


def test_check_upcoming_deadlines_uses_configured_window(
    monkeypatch: pytest.MonkeyPatch,
    celery_session_factory: sessionmaker[Session],
) -> None:
    _configure_deadline_task(
        monkeypatch,
        celery_session_factory,
        reminder_days=3,
    )

    _add_task(
        celery_session_factory,
        title="Due in three days",
        due_date=TODAY + timedelta(days=3),
    )
    _add_task(
        celery_session_factory,
        title="Due in four days",
        due_date=TODAY + timedelta(days=4),
    )

    result = deadlines.check_upcoming_deadlines()

    assert result["reminders"] == 1
    assert result["from_date"] == "2026-08-12"
    assert result["to_date"] == "2026-08-15"


def test_check_upcoming_deadlines_logs_reminder_text(
    monkeypatch: pytest.MonkeyPatch,
    celery_session_factory: sessionmaker[Session],
) -> None:
    _configure_deadline_task(
        monkeypatch,
        celery_session_factory,
    )

    _add_task(
        celery_session_factory,
        title="Due today",
        due_date=TODAY,
    )
    _add_task(
        celery_session_factory,
        title="Due tomorrow",
        due_date=TODAY + timedelta(days=1),
    )

    warning_mock = Mock()
    monkeypatch.setattr(deadlines.logger, "warning", warning_mock)

    result = deadlines.check_upcoming_deadlines()

    assert result["reminders"] == 2
    assert warning_mock.call_count == 2

    deadline_texts = [call.args[-1] for call in warning_mock.call_args_list]

    assert deadline_texts == [
        "due today",
        "due tomorrow",
    ]
