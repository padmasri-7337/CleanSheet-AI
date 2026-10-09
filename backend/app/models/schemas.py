from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional

# --- Authentication Schemas ---
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Dataset & Preview Schemas ---
class ColumnProfile(BaseModel):
    name: str
    inferred_type: str
    dtype: str
    total_count: int
    missing_count: int
    missing_pct: float
    unique_count: int
    sample_values: List[str]

class DetectedIssue(BaseModel):
    id: str
    severity: str
    category: str
    title: str
    description: str
    affected_columns: List[str]
    suggested_action: str
    suggested_params: Dict[str, Any]

class DatasetPreviewResponse(BaseModel):
    session_id: str
    filename: str
    file_size: int
    file_format: str
    created_at: float
    row_count: int
    column_count: int
    duplicate_rows: int
    total_missing_cells: int
    missing_pct: float
    quality_score: int
    columns: List[ColumnProfile]
    issues: List[DetectedIssue]
    preview_rows: List[Dict[str, Any]]
    raw_preview_rows: Optional[List[Dict[str, Any]]] = None
    applied_operations: List[Dict[str, Any]] = []
    diff_summary: Optional[Dict[str, Any]] = None
    retention_policy: str

# --- Cleaning Request Schemas ---
class SingleOperationRequest(BaseModel):
    session_id: str
    operation: str
    params: Dict[str, Any] = {}

class BatchCleaningRequest(BaseModel):
    session_id: str
    operations: List[Dict[str, Any]]
    save_to_history: bool = True

class DiffResponse(BaseModel):
    session_id: str
    diff_summary: Dict[str, Any]
    preview_rows: List[Dict[str, Any]]
    raw_preview_rows: List[Dict[str, Any]]
    applied_operations: List[Dict[str, Any]]

# --- AI Integration Schemas ---
class AIPlanRequest(BaseModel):
    session_id: str
    instruction: str
    context_notes: Optional[str] = None

class AIStep(BaseModel):
    id: str
    operation: str
    params: Dict[str, Any]
    description: str
    reasoning: str
    risk_level: str
    approved: bool = True

class AIPlanResponse(BaseModel):
    plan_id: str
    summary: str
    source: str
    note: Optional[str] = None
    total_steps: int
    steps: List[AIStep]
    privacy_disclosure: Optional[str] = None

class AIPlanExecuteRequest(BaseModel):
    session_id: str
    steps: List[Dict[str, Any]]
    save_to_history: bool = True

# --- Recipe Schemas ---
class SaveRecipeRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    operations: List[Dict[str, Any]]
    is_public: bool = True

class ApplyRecipeRequest(BaseModel):
    session_id: str
    recipe_id: Optional[str] = None
    operations: Optional[List[Dict[str, Any]]] = None

# --- Cleaning Report Schema ---
class AuditReportResponse(BaseModel):
    session_id: str
    filename: str
    timestamp: str
    initial_stats: Dict[str, Any]
    final_stats: Dict[str, Any]
    operations_executed: List[Dict[str, Any]]
    diff_summary: Dict[str, Any]
    retention_policy: str
