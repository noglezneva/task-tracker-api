from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import DBSessionDep, CurrentUserDep
from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate


router = APIRouter()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    db: DBSessionDep,
    current_user: CurrentUserDep,
) -> TaskRead:
    task = Task(
        user_id=current_user.id,
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority,
        due_date=task_in.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=list[TaskRead])
def list_tasks(
    status: Literal["open", "done"] | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: DBSessionDep = None,
    current_user: CurrentUserDep = None,
) -> list[TaskRead]:
    query = select(Task).where(Task.user_id == current_user.id)
    if status is not None:
        query = query.where(Task.status == TaskStatus(status))
    query = query.order_by(Task.created_at.desc()).limit(limit).offset(offset)
    tasks = db.scalars(query).all()
    return list(tasks)


def _get_task_for_user(db: Session, task_id: UUID, user_id: UUID) -> Task:
    task = db.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: UUID,
    db: DBSessionDep,
    current_user: CurrentUserDep,
) -> TaskRead:
    task = _get_task_for_user(db, task_id, current_user.id)
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    db: DBSessionDep,
    current_user: CurrentUserDep,
) -> TaskRead:
    task = _get_task_for_user(db, task_id, current_user.id)

    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: UUID,
    db: DBSessionDep,
    current_user: CurrentUserDep,
) -> None:
    task = _get_task_for_user(db, task_id, current_user.id)
    db.delete(task)
    db.commit()
    return None


