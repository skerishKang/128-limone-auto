from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database.db import list_tasks, create_task, update_task, delete_task

router = APIRouter()


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    priority: str = Field(default="medium")
    due_date: Optional[str] = None
    user_id: str = Field(default="default_user")


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None


@router.get("/", summary="할 일 목록 조회")
def get_tasks(user_id: str = "default_user"):
    try:
        return list_tasks(user_id=user_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tasks: {exc}") from exc


@router.post("/", summary="할 일 생성")
def post_task(payload: TaskCreate):
    try:
        return create_task(
            title=payload.title,
            priority=payload.priority,
            user_id=payload.user_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {exc}") from exc


@router.patch("/{task_id}", summary="할 일 업데이트")
def patch_task(task_id: str, payload: TaskUpdate):
    try:
        updates = payload.model_dump(exclude_none=True)
        if not updates:
            return update_task(task_id, {})
        return update_task(task_id, updates)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update task: {exc}") from exc


@router.delete("/{task_id}", summary="할 일 삭제")
def remove_task(task_id: str):
    try:
        delete_task(task_id)
        return {"success": True}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {exc}") from exc
