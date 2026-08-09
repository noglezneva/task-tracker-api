from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DBSessionDep, CurrentUserDep
from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.repositories import TaskRepository


router = APIRouter()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    db: DBSessionDep,
    current_user: CurrentUserDep,
) -> TaskRead:
    return await TaskRepository(db).create(
        user_id=current_user.id,
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority,
        due_date=task_in.due_date,
    )


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    status: Literal["open", "done"] | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: DBSessionDep = None,
    current_user: CurrentUserDep = None,
) -> list[TaskRead]:
    return await TaskRepository(db).list_for_user(
        user_id=current_user.id,
        status=TaskStatus(status) if status is not None else None,
        limit=limit,
        offset=offset,
    )


async def _get_task_for_user(db: DBSessionDep, task_id: UUID, user_id: UUID) -> Task:
    task = await TaskRepository(db).get_for_user(task_id=task_id, user_id=user_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return task


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: UUID,
    db: DBSessionDep,
    current_user: CurrentUserDep,
) -> TaskRead:
    return await _get_task_for_user(db, task_id, current_user.id)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    db: DBSessionDep,
    current_user: CurrentUserDep,
) -> TaskRead:
    task = await _get_task_for_user(db, task_id, current_user.id)

    update_data = task_in.model_dump(exclude_unset=True)
    return await TaskRepository(db).update(task, **update_data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    db: DBSessionDep,
    current_user: CurrentUserDep,
) -> None:
    task = await _get_task_for_user(db, task_id, current_user.id)
    await TaskRepository(db).delete(task)
    return None
