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
        search: str | None,
        sort_by: str,
        order: str,
        limit: int,
        offset: int,
    ) -> list[Task]:
        query = select(Task).where(Task.user_id == user_id)

        if status is not None:
            query = query.where(Task.status == status)

        if search is not None:
            query = query.where(Task.title.ilike(f"%{search}%"))

        sort_columns = {
            "created_at": Task.created_at,
            "due_date": Task.due_date,
            "priority": Task.priority,
        }

        sort_column = sort_columns[sort_by]

        if order == "asc":
            sort_column = sort_column.asc()
        else:
            sort_column = sort_column.desc()

        query = query.order_by(sort_column).limit(limit).offset(offset)

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
