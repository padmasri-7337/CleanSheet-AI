from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from app.services.session_storage import session_storage
from app.services.cleaning_engine import cleaning_engine
from app.database import db_manager
from app.models.schemas import (
    SingleOperationRequest,
    BatchCleaningRequest,
    DatasetPreviewResponse,
    AuditReportResponse
)
from app.routers.data import _build_preview_response

router = APIRouter(prefix="/api/clean", tags=["cleaning"])

def _execute_operation(df, operation: str, params: Dict[str, Any]):
    """Executes a single deterministic cleaning operation on a DataFrame."""
    if operation == "remove_duplicates":
        return cleaning_engine.remove_duplicates(
            df,
            subset=params.get("subset"),
            keep=params.get("keep", "first")
        )
    elif operation == "handle_missing":
        return cleaning_engine.handle_missing(
            df,
            strategy=params.get("strategy", "fill_value"),
            columns=params.get("columns"),
            value=params.get("value"),
            threshold=params.get("threshold")
        )
    elif operation == "normalize_headers":
        return cleaning_engine.normalize_headers(
            df,
            style=params.get("style", "snake_case")
        )
    elif operation == "trim_whitespace":
        return cleaning_engine.trim_whitespace(
            df,
            columns=params.get("columns"),
            collapse_internal=params.get("collapse_internal", True)
        )
    elif operation == "text_case":
        return cleaning_engine.text_case(
            df,
            columns=params.get("columns", []),
            case_type=params.get("case_type", "title")
        )
    elif operation == "convert_types":
        return cleaning_engine.convert_types(
            df,
            columns=params.get("columns", []),
            target_type=params.get("target_type", "string"),
            date_format=params.get("date_format", "%Y-%m-%d"),
            fill_invalid=params.get("fill_invalid")
        )
    elif operation == "column_operations":
        return cleaning_engine.column_operations(
            df,
            action=params.get("action", "rename"),
            columns=params.get("columns"),
            rename_map=params.get("rename_map"),
            new_order=params.get("new_order")
        )
    elif operation == "find_replace":
        return cleaning_engine.find_replace(
            df,
            search_pattern=params.get("search_pattern", ""),
            replace_value=params.get("replace_value", ""),
            columns=params.get("columns"),
            is_regex=params.get("is_regex", False)
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported operation '{operation}'")

@router.post("/step", response_model=DatasetPreviewResponse)
def apply_single_step(req: SingleOperationRequest):
    """Applies a single deterministic cleaning operation to the session's DataFrame."""
    session = session_storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found or expired.")

    initial_rows = len(session.current_df)
    new_df, detail = _execute_operation(session.current_df, req.operation, req.params)
    
    session.current_df = new_df
    log_entry = {
        "step_number": len(session.applied_operations) + 1,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "operation": req.operation,
        "params": req.params,
        "detail": detail
    }
    session.applied_operations.append(log_entry)
    session.audit_log.append(log_entry)

    return _build_preview_response(session)

@router.post("/batch", response_model=DatasetPreviewResponse)
def apply_batch_cleaning(req: BatchCleaningRequest):
    """Executes a list of cleaning operations in order."""
    session = session_storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found or expired.")

    for op_item in req.operations:
        op = op_item.get("operation")
        params = op_item.get("params", {})
        if not op:
            continue
        new_df, detail = _execute_operation(session.current_df, op, params)
        session.current_df = new_df
        log_entry = {
            "step_number": len(session.applied_operations) + 1,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operation": op,
            "params": params,
            "detail": detail
        }
        session.applied_operations.append(log_entry)
        session.audit_log.append(log_entry)

    # Optionally persist summary to database history
    if req.save_to_history and len(session.applied_operations) > 0:
        diff = cleaning_engine.compute_diff_summary(session.raw_df, session.current_df)
        db_manager.save_history({
            "session_id": session.session_id,
            "filename": session.filename,
            "file_size": session.file_size,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "operations_count": len(session.applied_operations),
            "operations_summary": [
                {"op": o["operation"], "desc": o["detail"].get("description", "")}
                for o in session.applied_operations
            ],
            "result_metrics": diff
        })

    return _build_preview_response(session)

@router.get("/report/{session_id}", response_model=AuditReportResponse)
def get_audit_report(session_id: str):
    """Generates an audit report showing all changes, row/cell deltas, and quality score improvements."""
    session = session_storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found or expired.")

    raw_profile = cleaning_engine.profile_dataframe(session.raw_df)
    clean_profile = cleaning_engine.profile_dataframe(session.current_df)
    diff = cleaning_engine.compute_diff_summary(session.raw_df, session.current_df)

    return AuditReportResponse(
        session_id=session.session_id,
        filename=session.filename,
        timestamp=datetime.now(timezone.utc).isoformat(),
        initial_stats=raw_profile,
        final_stats=clean_profile,
        operations_executed=session.applied_operations,
        diff_summary=diff,
        retention_policy=session_storage.retention_policy
    )
