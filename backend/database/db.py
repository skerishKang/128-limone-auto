import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime

DB_PATH = Path("../data/limone-auto.db")

def init_db():
    """데이터베이스 초기화 및 테이블 생성"""
    DB_PATH.parent.mkdir(exist_ok=True)

    with get_db() as conn:
        # 대화 테이블
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT 'default_user',
                title TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 메시지 테이블
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER,
                role TEXT CHECK(role IN ('user', 'assistant', 'system')) NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,  -- JSON 형태로 추가 정보 저장
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )
        """)

        # 파일 테이블
        conn.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                file_type TEXT,
                file_size INTEGER,
                processed BOOLEAN DEFAULT 0,
                result TEXT,  -- AI 분석 결과
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id)
            )
        """)

        # 외부 서비스 연동 테이블
        conn.execute("""
            CREATE TABLE IF NOT EXISTS integrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_name TEXT UNIQUE NOT NULL,
                access_token TEXT,
                refresh_token TEXT,
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        print("✅ Database initialized successfully")

@contextmanager
def get_db():
    """데이터베이스 연결 컨텍스트 매니저"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def create_conversation(title: str = "New Chat", user_id: str = "default_user"):
    """새 대화 생성"""
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO conversations (title, user_id) VALUES (?, ?)",
            (title, user_id)
        )
        return cursor.lastrowid

def get_conversation(conversation_id: int):
    """대화 조회"""
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM conversations WHERE id = ?",
            (conversation_id,)
        ).fetchone()

def list_conversations(user_id: str = "default_user", limit: int = 50):
    """대화 목록 조회"""
    with get_db() as conn:
        return conn.execute(
            """
            SELECT c.*, COUNT(m.id) as message_count
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.created_at DESC
            LIMIT ?
            """,
            (user_id, limit)
        ).fetchall()

def add_message(
    conversation_id: int,
    role: str,
    content: str,
    metadata: dict = None
):
    """메시지 추가"""
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO messages (conversation_id, role, content, metadata)
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, role, content, str(metadata) if metadata else None)
        )
        return cursor.lastrowid

def get_messages(conversation_id: int):
    """대화의 모든 메시지 조회"""
    with get_db() as conn:
        return conn.execute(
            """
            SELECT * FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
            """,
            (conversation_id,)
        ).fetchall()

def save_file_info(
    message_id: int,
    filename: str,
    filepath: str,
    file_type: str,
    file_size: int
):
    """파일 정보 저장"""
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO files (message_id, filename, filepath, file_type, file_size)
            VALUES (?, ?, ?, ?, ?)
            """,
            (message_id, filename, filepath, file_type, file_size)
        )
        return cursor.lastrowid

def get_file_info(file_id: int):
    """파일 정보 조회"""
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM files WHERE id = ?",
            (file_id,)
        ).fetchone()

def update_file_processed(file_id: int, result: str):
    """파일 처리 완료 업데이트"""
    with get_db() as conn:
        conn.execute(
            "UPDATE files SET processed = 1, result = ? WHERE id = ?",
            (result, file_id)
        )

def save_integration_token(
    service_name: str,
    access_token: str,
    refresh_token: str = None,
    expires_at: datetime = None
):
    """외부 서비스 토큰 저장/업데이트"""
    with get_db() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO integrations
            (service_name, access_token, refresh_token, expires_at, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (service_name, access_token, refresh_token, expires_at)
        )

def get_integration_token(service_name: str):
    """외부 서비스 토큰 조회"""
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM integrations WHERE service_name = ? AND is_active = 1",
            (service_name,)
        ).fetchone()

def delete_conversation(conversation_id: int):
    """대화 삭제 (모든 관련 메시지도 삭제)"""
    with get_db() as conn:
        conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
