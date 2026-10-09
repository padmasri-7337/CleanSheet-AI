import uuid
import time
from typing import Dict, Any, Optional, List
import pandas as pd
from app.config import settings

class SessionDataset:
    def __init__(self, filename: str, file_size: int, file_format: str, raw_df: pd.DataFrame):
        self.session_id: str = str(uuid.uuid4())
        self.filename: str = filename
        self.file_size: int = file_size
        self.file_format: str = file_format
        self.created_at: float = time.time()
        self.last_accessed: float = time.time()
        
        # We keep the raw original and the working version
        self.raw_df: pd.DataFrame = raw_df.copy()
        self.current_df: pd.DataFrame = raw_df.copy()
        
        # History of applied operations
        self.applied_operations: List[Dict[str, Any]] = []
        # Audit log of changes
        self.audit_log: List[Dict[str, Any]] = []

    def touch(self):
        self.last_accessed = time.time()

    def is_expired(self, ttl_seconds: int) -> bool:
        return (time.time() - self.last_accessed) > ttl_seconds

class SessionStorage:
    def __init__(self):
        self._sessions: Dict[str, SessionDataset] = {}
        self.retention_policy: str = (
            f"Uploaded spreadsheets are processed temporarily in volatile application memory "
            f"with an automatic {settings.TEMP_STORAGE_TTL_SECONDS // 60}-minute TTL. "
            f"No raw spreadsheet contents are written to permanent database storage."
        )

    def cleanup_expired(self):
        expired_ids = [
            sid for sid, s in self._sessions.items()
            if s.is_expired(settings.TEMP_STORAGE_TTL_SECONDS)
        ]
        for sid in expired_ids:
            del self._sessions[sid]

    def create_session(self, filename: str, file_size: int, file_format: str, df: pd.DataFrame) -> SessionDataset:
        self.cleanup_expired()
        session = SessionDataset(
            filename=filename,
            file_size=file_size,
            file_format=file_format,
            raw_df=df
        )
        self._sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[SessionDataset]:
        self.cleanup_expired()
        session = self._sessions.get(session_id)
        if session:
            session.touch()
        return session

    def delete_session(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

session_storage = SessionStorage()
