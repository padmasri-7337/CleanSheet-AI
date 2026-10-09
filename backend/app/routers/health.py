from fastapi import APIRouter
from app.database import db_manager
from app.services.ai_cleaner import ai_cleaner
from app.config import settings
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["health"])

@router.get("/health")
def get_health():
    """Returns application health, MongoDB status, and Gemini AI status."""
    db_status = db_manager.get_status()
    ai_status = ai_cleaner.get_status()
    
    return {
        "status": "healthy",
        "app_name": "CleanSheet AI",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "ai_engine": ai_status,
        "storage": {
            "mode": "ephemeral_memory",
            "retention_ttl_minutes": settings.TEMP_STORAGE_TTL_SECONDS // 60,
            "max_file_size_mb": settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)
        }
    }

@router.post("/db/test")
def test_db_connection():
    """Forces an active ping test of the MongoDB connection."""
    success = db_manager.connect()
    return {
        "success": success,
        "database": db_manager.get_status()
    }
