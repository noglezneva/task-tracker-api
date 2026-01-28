from datetime import datetime, date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.task import TaskStatus


class TaskBase(BaseModel):
    title: str = Field(max_length=255)
    description: Optional[str] = None
    priority: int = 1
    due_date: Optional[date] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    priority: Optional[int] = None
    due_date: Optional[date] = None
    status: Optional[TaskStatus] = None


class TaskRead(TaskBase):
    id: UUID
    status: TaskStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


