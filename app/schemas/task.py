from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.task import TaskStatus


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    priority: int = Field(default=1, ge=1, le=3)
    due_date: date | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    description: str | None = None
    priority: int | None = Field(default=None, ge=1, le=3)
    due_date: date | None = None
    status: TaskStatus | None = None


class TaskRead(TaskBase):
    id: UUID
    status: TaskStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskStats(BaseModel):
    total: int
    open: int
    done: int
    overdue: int
