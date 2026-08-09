from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus


class TaskRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        *,
        user_id: UUID,
        title: str,
        description: str | None,
        priority: int,
        due_date: date | None,
    ) -> Task:
        task = Task(
            user_id=user_id,
            title=title,
            description=description,
            priority=priority,
            due_date=due_date,
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def list_for_user(
        self,
        *,
        user_id: UUID,
        status: TaskStatus | None,
        limit: int,
        offset: int,
    ) -> list[Task]:
        query = select(Task).where(Task.user_id == user_id)
        if status is not None:
            query = query.where(Task.status == status)
        query = query.order_by(Task.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.scalars(query)
        return list(result.all())

    async def get_for_user(self, *, task_id: UUID, user_id: UUID) -> Task | None:
        task = await self.db.get(Task, task_id)
        if not task or task.user_id != user_id:
            return None
        return task

    async def update(self, task: Task, **fields) -> Task:
        for field, value in fields.items():
            setattr(task, field, value)
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete(self, task: Task) -> None:
        await self.db.delete(task)
        await self.db.commit()
