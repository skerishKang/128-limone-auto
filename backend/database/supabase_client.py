"""Supabase 클라이언트 초기화 모듈."""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Final

from dotenv import load_dotenv
from supabase import Client, create_client


load_dotenv()

_SUPABASE_URL_ENV: Final[str] = "SUPABASE_URL"
_SUPABASE_SERVICE_KEY_ENV: Final[str] = "SUPABASE_SERVICE_ROLE_KEY"


def _get_env_value(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"환경 변수 '{name}'가 설정되어 있지 않습니다.")
    return value


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Supabase 클라이언트를 싱글턴 형태로 반환."""
    url = _get_env_value(_SUPABASE_URL_ENV)
    service_key = _get_env_value(_SUPABASE_SERVICE_KEY_ENV)
    return create_client(url, service_key)


supabase: Client = get_supabase_client()
