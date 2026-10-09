from fastapi import APIRouter, HTTPException
from app.services.session_storage import session_storage
from app.services.cleaning_engine import cleaning_engine
from app.services.ai_cleaner import ai_cleaner
from app.models.schemas import AIPlanRequest, AIPlanResponse, AIPlanExecuteRequest, DatasetPreviewResponse
from app.routers.clean import _execute_operation
from app.routers.data import _build_preview_response
from app.database import db_manager
from datetime import datetime, timezone

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/status")
def get_ai_status():
    """Returns AI model status, active provider, and privacy disclosure."""
    return ai_cleaner.get_status()

@router.post("/plan", response_model=AIPlanResponse)
def generate_cleaning_plan(req: AIPlanRequest):
    """Converts natural language user instructions into a structured, validated cleaning plan."""
    session = session_storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found or expired.")

    # Profile current dataset
    profile = cleaning_engine.profile_dataframe(session.current_df)
    plan = ai_cleaner.generate_plan(
        instruction=req.instruction,
        profile=profile,
        context_notes=req.context_notes
    )
    return plan

@router.post("/execute", response_model=DatasetPreviewResponse)
def execute_approved_plan(req: AIPlanExecuteRequest):
    """Executes only the user-approved steps from the AI proposed plan."""
    session = session_storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found or expired.")

    # Filter to approved steps only
    approved_steps = [s for s in req.steps if s.get("approved", True)]
    if not approved_steps:
        raise HTTPException(status_code=400, detail="No approved cleaning steps to execute.")

    for step in approved_steps:
        op = step.get("operation")
        params = step.get("params", {})
        if not op:
            continue
        new_df, detail = _execute_operation(session.current_df, op, params)
        session.current_df = new_df

        if op == "convert_types" and params.get("target_type") == "identifier":
            for col in params.get("columns", []):
                if col not in session.protected_columns:
                    session.protected_columns.append(col)
                iss_id = f"leading_zeros_{col}"
                if iss_id not in session.dismissed_issues:
                    session.dismissed_issues.append(iss_id)
        
        log_entry = {
            "step_number": len(session.applied_operations) + 1,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operation": op,
            "params": params,
            "detail": detail,
            "ai_reasoning": step.get("reasoning", "")
        }
        session.applied_operations.append(log_entry)
        session.audit_log.append(log_entry)

    # Persist summary if requested
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
