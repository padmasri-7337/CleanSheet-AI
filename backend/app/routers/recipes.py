from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from app.database import db_manager
from app.services.session_storage import session_storage
from app.models.schemas import SaveRecipeRequest, ApplyRecipeRequest, DatasetPreviewResponse
from app.routers.clean import _execute_operation
from app.routers.data import _build_preview_response

router = APIRouter(prefix="/api/recipes", tags=["recipes"])

# Built-in presets available to all users out of the box
PRESET_RECIPES = [
    {
        "_id": "preset_general_hygiene",
        "name": "General Data Hygiene",
        "description": "Standardizes column headers to snake_case, trims whitespace from text, and removes duplicate rows.",
        "is_preset": True,
        "operations": [
            {"operation": "normalize_headers", "params": {"style": "snake_case"}},
            {"operation": "remove_duplicates", "params": {"subset": None, "keep": "first"}},
            {"operation": "trim_whitespace", "params": {"columns": None, "collapse_internal": True}}
        ]
    },
    {
        "_id": "preset_sales_financial",
        "name": "Sales & Financial Formatter",
        "description": "Normalizes headers, converts currency strings into floats, parses mixed dates to YYYY-MM-DD, and protects leading zeros.",
        "is_preset": True,
        "operations": [
            {"operation": "normalize_headers", "params": {"style": "snake_case"}},
            {"operation": "trim_whitespace", "params": {"columns": None, "collapse_internal": True}},
            {"operation": "convert_types", "params": {"columns": [], "target_type": "currency_numeric"}},
            {"operation": "convert_types", "params": {"columns": [], "target_type": "datetime", "date_format": "%Y-%m-%d"}},
            {"operation": "remove_duplicates", "params": {"subset": None, "keep": "first"}}
        ]
    },
    {
        "_id": "preset_impute_missing",
        "name": "Quick Missing Data Imputer",
        "description": "Fills missing text fields with 'Unknown' and missing numerical numbers with column median.",
        "is_preset": True,
        "operations": [
            {"operation": "handle_missing", "params": {"columns": None, "strategy": "fill_median"}},
            {"operation": "handle_missing", "params": {"columns": None, "strategy": "fill_value", "value": "Unknown"}}
        ]
    }
]

@router.get("")
def list_recipes():
    """Lists saved user recipes combined with preset recipes."""
    db_recipes = db_manager.get_recipes()
    return {
        "presets": PRESET_RECIPES,
        "saved_recipes": db_recipes
    }

@router.post("/save")
def save_recipe(req: SaveRecipeRequest):
    """Saves a pipeline of cleaning operations as a reusable recipe in MongoDB (or fallback)."""
    recipe_doc = {
        "name": req.name,
        "description": req.description or "",
        "operations": req.operations,
        "is_public": req.is_public,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    recipe_id = db_manager.save_recipe(recipe_doc)
    return {
        "id": recipe_id,
        "message": f"Recipe '{req.name}' successfully saved.",
        "recipe": recipe_doc
    }

@router.delete("/{recipe_id}")
def delete_recipe(recipe_id: str):
    """Deletes a saved recipe."""
    if recipe_id.startswith("preset_"):
        raise HTTPException(status_code=400, detail="Built-in preset recipes cannot be deleted.")
    success = db_manager.delete_recipe(recipe_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return {"message": "Recipe deleted successfully."}

@router.post("/apply", response_model=DatasetPreviewResponse)
def apply_recipe(req: ApplyRecipeRequest):
    """Applies a recipe's operations to the active session."""
    session = session_storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found or expired.")

    operations = req.operations
    if not operations and req.recipe_id:
        # Check presets
        preset = next((p for p in PRESET_RECIPES if p["_id"] == req.recipe_id), None)
        if preset:
            operations = preset["operations"]
        else:
            saved = [r for r in db_manager.get_recipes() if str(r.get("_id")) == req.recipe_id]
            if saved:
                operations = saved[0].get("operations", [])

    if not operations:
        raise HTTPException(status_code=400, detail="No operations found to apply.")

    for op_item in operations:
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
            "detail": detail,
            "recipe_source": req.recipe_id or "custom"
        }
        session.applied_operations.append(log_entry)
        session.audit_log.append(log_entry)

    return _build_preview_response(session)
