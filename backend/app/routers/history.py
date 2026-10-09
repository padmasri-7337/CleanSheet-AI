from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from app.database import db_manager

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("")
def list_cleaning_history(limit: int = Query(30, ge=1, le=100)):
    """Retrieves previous cleaning session metadata and summary results from MongoDB (or fallback)."""
    history = db_manager.get_history(limit=limit)
    return {
        "count": len(history),
        "history": history,
        "note": "Only transformation metadata, timestamps, and aggregate metrics are stored. Raw spreadsheet contents are not retained."
    }

@router.get("/{history_id}")
def get_history_detail(history_id: str):
    """Retrieves full details for a specific cleaning session history record."""
    history_items = db_manager.get_history(limit=100)
    item = next((h for h in history_items if str(h.get("_id")) == history_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cleaning history record not found.")
    return item
