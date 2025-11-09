from __future__ import annotations

import json
from datetime import datetime, date, time, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from postgrest import APIError

from uuid import uuid4

from .supabase_client import supabase


def init_db() -> None:
    """Supabase는 이미 스키마가 생성되어 있으므로 추가 작업이 필요하지 않습니다."""
    return None


def _handle_response(response) -> List[Dict[str, Any]]:
    error = getattr(response, "error", None)
    if error:
        if isinstance(error, APIError):
            raise RuntimeError(f"Supabase 오류: {error.message}") from error
        raise RuntimeError(f"Supabase 오류: {error}")

    data = getattr(response, "data", None)
    if data is None:
        return []
    if isinstance(data, list):
        return data
    return [data]


_TASKS_LOCAL_PATH = Path(__file__).resolve().parent / "tasks_local.json"


def _load_local_task_map() -> Dict[str, List[Dict[str, Any]]]:
    if not _TASKS_LOCAL_PATH.exists():
        return {}
    try:
        raw = json.loads(_TASKS_LOCAL_PATH.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            return {str(k): list(v) for k, v in raw.items() if isinstance(v, list)}
        if isinstance(raw, list):
            return {"default_user": list(raw)}
    except json.JSONDecodeError:
        pass
    return {}


def _save_local_task_map(task_map: Dict[str, List[Dict[str, Any]]]) -> None:
    _TASKS_LOCAL_PATH.write_text(json.dumps(task_map, ensure_ascii=False, indent=2), encoding="utf-8")


def _get_local_tasks(user_id: str) -> List[Dict[str, Any]]:
    task_map = _load_local_task_map()
    return list(task_map.get(user_id, []))


def _set_local_tasks(user_id: str, tasks: List[Dict[str, Any]]) -> None:
    task_map = _load_local_task_map()
    task_map[user_id] = tasks
    _save_local_task_map(task_map)


def _upsert_local_task(user_id: str, task: Dict[str, Any]) -> None:
    tasks = _get_local_tasks(user_id)
    filtered = [t for t in tasks if str(t.get("id")) != str(task.get("id"))]
    filtered.append(task)
    _set_local_tasks(user_id, filtered)


def _remove_local_task(task_id: str) -> None:
    task_map = _load_local_task_map()
    changed = False
    for user_id, tasks in list(task_map.items()):
        filtered = [t for t in tasks if str(t.get("id")) != str(task_id)]
        if len(filtered) != len(tasks):
            task_map[user_id] = filtered
            changed = True
    if changed:
        _save_local_task_map(task_map)

def create_conversation(title: str = "New Chat", user_id: str = "default_user"):
    response = (
        supabase
        .table("conversations")
        .insert({"title": title, "user_id": user_id}, returning="representation")
        .execute()
    )
    data = _handle_response(response)
    if data:
        return data[0].get("id")

    # representation을 받아오지 못한 경우 가장 최근 대화를 조회하여 ID 반환
    conversations = list_conversations(user_id=user_id, limit=1)
    if not conversations:
        raise RuntimeError("대화 생성에 실패했습니다.")
    return conversations[0]["id"]

def get_conversation(conversation_id: int):
    response = (
        supabase
        .table("conversations")
        .select("*")
        .eq("id", conversation_id)
        .limit(1)
        .execute()
    )
    data = _handle_response(response)
    return data[0] if data else None

def list_conversations(user_id: str = "default_user", limit: int = 50):
    response = (
        supabase
        .table("conversations")
        .select("id,title,user_id,created_at,messages(count)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    data = _handle_response(response)
    conversations: List[Dict[str, Any]] = []
    for item in data:
        message_count = 0
        messages_info = item.pop("messages", None)
        if isinstance(messages_info, list) and messages_info:
            message_count = messages_info[0].get("count", 0) or 0
        item["message_count"] = message_count
        conversations.append(item)
    return conversations

def add_message(
    conversation_id: int,
    role: str,
    content: str,
    metadata: dict = None
):
    payload: Dict[str, Any] = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
    }
    if metadata is not None:
        payload["metadata"] = metadata

    response = (
        supabase
        .table("messages")
        .insert(payload, returning="representation")
        .execute()
    )
    data = _handle_response(response)
    if data:
        return data[0].get("id")

    # representation이 비어 있을 경우 최신 메시지를 조회하여 ID 반환
    messages = (
        supabase
        .table("messages")
        .select("id")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    fetched = _handle_response(messages)
    if not fetched:
        raise RuntimeError("메시지 저장에 실패했습니다.")
    return fetched[0]["id"]

def get_messages(conversation_id: int):
    response = (
        supabase
        .table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    return _handle_response(response)


def save_conversation_memory(
    conversation_id: int,
    user_id: str,
    content: str,
    title: Optional[str] = None,
    created_by: str = "user_command",
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
    importance: Optional[int] = None,
):
    payload: Dict[str, Any] = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "content": content,
        "created_by": created_by,
    }
    if title:
        payload["title"] = title
    if metadata is not None:
        payload["metadata"] = metadata
    if tags is not None:
        payload["tags"] = tags
    if importance is not None:
        payload["importance"] = importance

    response = (
        supabase
        .table("conversation_memories")
        .insert(payload, returning="representation")
        .execute()
    )
    data = _handle_response(response)
    if data:
        return data[0]

    fetched = (
        supabase
        .table("conversation_memories")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    data = _handle_response(fetched)
    if not data:
        raise RuntimeError("대화 메모리 저장에 실패했습니다.")
    return data[0]


def list_conversation_memories(conversation_id: int, limit: int = 10):
    response = (
        supabase
        .table("conversation_memories")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return _handle_response(response)


def get_latest_conversation_memory(conversation_id: int):
    response = (
        supabase
        .table("conversation_memories")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    data = _handle_response(response)
    return data[0] if data else None


def update_conversation_memory(
    memory_id: str,
    updates: Dict[str, Any],
):
    if not updates:
        return None

    response = (
        supabase
        .table("conversation_memories")
        .update(updates)
        .eq("id", memory_id)
        .execute()
    )
    data = _handle_response(response)
    return data[0] if data else None


def save_daily_summary(
    user_id: str,
    summary_date: date,
    content: str,
    created_by: str = "user_command",
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
    importance: Optional[int] = None,
):
    payload: Dict[str, Any] = {
        "user_id": user_id,
        "summary_date": summary_date.isoformat(),
        "content": content,
        "created_by": created_by,
    }
    if metadata is not None:
        payload["metadata"] = metadata
    if tags is not None:
        payload["tags"] = tags
    if importance is not None:
        payload["importance"] = importance

    response = (
        supabase
        .table("daily_summaries")
        .insert(payload, returning="representation")
        .execute()
    )
    data = _handle_response(response)
    if data:
        return data[0]

    fetched = (
        supabase
        .table("daily_summaries")
        .select("*")
        .eq("user_id", user_id)
        .eq("summary_date", summary_date.isoformat())
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    data = _handle_response(fetched)
    if not data:
        raise RuntimeError("일일 요약 저장에 실패했습니다.")
    return data[0]


def list_daily_summaries(user_id: str, limit: int = 7):
    response = (
        supabase
        .table("daily_summaries")
        .select("*")
        .eq("user_id", user_id)
        .order("summary_date", desc=True)
        .limit(limit)
        .execute()
    )
    return _handle_response(response)


def get_daily_summary_by_date(user_id: str, summary_date: date):
    response = (
        supabase
        .table("daily_summaries")
        .select("*")
        .eq("user_id", user_id)
        .eq("summary_date", summary_date.isoformat())
        .limit(1)
        .execute()
    )
    data = _handle_response(response)
    return data[0] if data else None


def update_daily_summary(
    summary_id: str,
    updates: Dict[str, Any],
):
    if not updates:
        return None

    response = (
        supabase
        .table("daily_summaries")
        .update(updates)
        .eq("id", summary_id)
        .execute()
    )
    data = _handle_response(response)
    return data[0] if data else None


def get_messages_for_user_on_date(user_id: str, target_date: date):
    start_dt = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(days=1)

    response = (
        supabase
        .table("messages")
        .select("id, conversation_id, role, content, created_at, conversations!inner(id,title)")
        .gte("created_at", start_dt.isoformat())
        .lt("created_at", end_dt.isoformat())
        .eq("conversations.user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    return _handle_response(response)

def save_file_info(
    message_id: int,
    filename: str,
    filepath: str,
    file_type: str,
    file_size: int
):
    payload = {
        "message_id": message_id,
        "filename": filename,
        "filepath": filepath,
        "file_type": file_type,
        "file_size": file_size,
    }
    response = (
        supabase
        .table("files")
        .insert(payload, returning="representation")
        .execute()
    )
    data = _handle_response(response)
    if data:
        return data[0].get("id")

    fetched = (
        supabase
        .table("files")
        .select("id")
        .eq("message_id", message_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    data = _handle_response(fetched)
    if not data:
        raise RuntimeError("파일 정보 저장에 실패했습니다.")
    return data[0]["id"]

def get_file_info(file_id: int):
    response = (
        supabase
        .table("files")
        .select("*")
        .eq("id", file_id)
        .limit(1)
        .execute()
    )
    data = _handle_response(response)
    return data[0] if data else None

def update_file_processed(file_id: int, result: str):
    payload = {
        "processed": True,
        "result": result,
    }
    response = (
        supabase
        .table("files")
        .update(payload)
        .eq("id", file_id)
        .execute()
    )
    _handle_response(response)


def list_tasks(user_id: str = "default_user") -> List[Dict[str, Any]]:
    try:
        response = (
            supabase
            .table("tasks")
            .select("id,title,completed,priority,due_date,user_id,created_at,updated_at")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        data = _handle_response(response)
        _set_local_tasks(user_id, data)
        return data
    except Exception as exc:
        print(f"[Tasks] Supabase 목록 조회 실패 → 로컬 데이터 사용: {exc}")
        return _get_local_tasks(user_id)


def create_task(title: str, priority: str = "medium", user_id: str = "default_user", due_date: Optional[str] = None) -> Dict[str, Any]:
    payload = {
        "title": title,
        "priority": priority,
        "completed": False,
        "user_id": user_id,
    }
    if due_date:
        payload["due_date"] = due_date
    try:
        response = (
            supabase
            .table("tasks")
            .insert(payload, returning="representation")
            .execute()
        )
        data = _handle_response(response)
        if data:
            task = data[0]
            _upsert_local_task(user_id, task)
            return task
    except Exception as exc:
        print(f"[Tasks] Supabase 생성 실패 → 로컬 저장: {exc}")

    task = {
        "id": str(uuid4()),
        "title": title,
        "priority": priority,
        "completed": False,
        "user_id": user_id,
        "due_date": due_date,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    _upsert_local_task(user_id, task)
    return task


def update_task(task_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    try:
        if not updates:
            task_response = (
                supabase
                .table("tasks")
                .select("*")
                .eq("id", task_id)
                .limit(1)
                .execute()
            )
            data = _handle_response(task_response)
            if data:
                task = data[0]
                _upsert_local_task(task.get("user_id", "default_user"), task)
                return task
            return {}

        response = (
            supabase
            .table("tasks")
            .update(updates)
            .eq("id", task_id)
            .execute()
        )
        data = _handle_response(response)
        if data:
            task = data[0]
            _upsert_local_task(task.get("user_id", "default_user"), task)
            return task

        fetched = (
            supabase
            .table("tasks")
            .select("*")
            .eq("id", task_id)
            .limit(1)
            .execute()
        )
        data = _handle_response(fetched)
        if data:
            task = data[0]
            _upsert_local_task(task.get("user_id", "default_user"), task)
            return task
    except Exception as exc:
        print(f"[Tasks] Supabase 업데이트 실패 → 로컬 데이터 사용: {exc}")

    task_map = _load_local_task_map()
    for user_id, tasks in task_map.items():
        for idx, task in enumerate(tasks):
            if str(task.get("id")) == str(task_id):
                updated_task = {**task, **updates, "updated_at": datetime.utcnow().isoformat()}
                tasks[idx] = updated_task
                _save_local_task_map(task_map)
                return updated_task

    raise RuntimeError("할 일을 업데이트하지 못했습니다.")


def delete_task(task_id: str) -> None:
    try:
        response = (
            supabase
            .table("tasks")
            .delete()
            .eq("id", task_id)
            .execute()
        )
        _handle_response(response)
    except Exception as exc:
        print(f"[Tasks] Supabase 삭제 실패 → 로컬 데이터 사용: {exc}")
    finally:
        _remove_local_task(task_id)

def save_integration_token(
    service_name: str,
    access_token: str,
    refresh_token: str = None,
    expires_at: datetime = None
):
    payload: Dict[str, Any] = {
        "service_name": service_name,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at.isoformat() if isinstance(expires_at, datetime) else expires_at,
        "is_active": True,
    }
    response = (
        supabase
        .table("integrations")
        .upsert(payload, on_conflict="service_name")
        .execute()
    )
    _handle_response(response)

def get_integration_token(service_name: str):
    response = (
        supabase
        .table("integrations")
        .select("*")
        .eq("service_name", service_name)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    data = _handle_response(response)
    return data[0] if data else None


def delete_conversation(conversation_id: int):
    response = (
        supabase
        .table("messages")
        .delete()
        .eq("conversation_id", conversation_id)
        .execute()
    )
    _handle_response(response)

    response = (
        supabase
        .table("conversations")
        .delete()
        .eq("id", conversation_id)
        .execute()
    )
    _handle_response(response)
