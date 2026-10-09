import io
import os
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
import pandas as pd
from app.config import settings
from app.services.session_storage import session_storage
from app.services.cleaning_engine import cleaning_engine
from app.models.schemas import DatasetPreviewResponse

router = APIRouter(prefix="/api/data", tags=["data"])

SAMPLE_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "sample_data"

def _df_to_records_safe(df: pd.DataFrame, limit: int = 100) -> List[dict]:
    """Converts a slice of DataFrame to JSON-safe dictionary records."""
    # Replace NaN, inf with None for clean JSON serialization
    safe_slice = df.head(limit).copy()
    safe_slice = safe_slice.replace([float('inf'), float('-inf')], None)
    safe_slice = safe_slice.where(pd.notnull(safe_slice), None)
    return safe_slice.to_dict(orient="records")

def _load_dataframe_from_bytes(content: bytes, filename: str) -> pd.DataFrame:
    """Safely parse uploaded bytes into a Pandas DataFrame."""
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    ext = Path(filename).suffix.lower()
    
    if ext in (".csv", ".txt", ".tsv"):
        # Attempt UTF-8 then latin-1 with sniffing, standard separators, and graceful on_bad_lines fallback
        for encoding in ("utf-8", "utf-8-sig", "latin1", "cp1252"):
            for sep in (None, ",", "\t", ";"):
                try:
                    df = pd.read_csv(
                        io.BytesIO(content),
                        encoding=encoding,
                        sep=sep,
                        engine="python",
                        dtype=str
                    )
                    if not df.empty or len(df.columns) > 0:
                        return df
                except Exception:
                    continue
            # Try with on_bad_lines='skip'
            try:
                df = pd.read_csv(
                    io.BytesIO(content),
                    encoding=encoding,
                    sep=",",
                    engine="python",
                    dtype=str,
                    on_bad_lines="skip"
                )
                if not df.empty or len(df.columns) > 0:
                    return df
            except Exception:
                continue

        raise HTTPException(status_code=400, detail="Unable to decode CSV file with supported encodings.")

    elif ext in (".xlsx", ".xls"):
        try:
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl", dtype=str)
            if df.empty and len(df.columns) == 0:
                raise HTTPException(status_code=400, detail="Excel spreadsheet has no rows or columns.")
            return df
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read Excel spreadsheet: {str(e)}")

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Please upload a .csv, .tsv, or .xlsx file."
        )

def _build_preview_response(session) -> DatasetPreviewResponse:
    protected_cols = getattr(session, "protected_columns", [])
    dismissed_iss = getattr(session, "dismissed_issues", [])
    profile = cleaning_engine.profile_dataframe(
        session.current_df,
        protected_columns=protected_cols,
        dismissed_issues=dismissed_iss
    )
    diff = cleaning_engine.compute_diff_summary(session.raw_df, session.current_df)
    
    return DatasetPreviewResponse(
        session_id=session.session_id,
        filename=session.filename,
        file_size=session.file_size,
        file_format=session.file_format,
        created_at=session.created_at,
        row_count=profile["row_count"],
        column_count=profile["column_count"],
        duplicate_rows=profile["duplicate_rows"],
        total_missing_cells=profile["total_missing_cells"],
        missing_pct=profile["missing_pct"],
        quality_score=profile["quality_score"],
        columns=profile["columns"],
        issues=profile["issues"],
        preview_rows=_df_to_records_safe(session.current_df, limit=100),
        raw_preview_rows=_df_to_records_safe(session.raw_df, limit=100),
        applied_operations=session.applied_operations,
        diff_summary=diff,
        retention_policy=session_storage.retention_policy
    )

@router.post("/upload", response_model=DatasetPreviewResponse)
async def upload_file(file: UploadFile = File(...)):
    """Uploads a CSV or Excel file, profiles its data, and creates an active cleaning session."""
    filename = file.filename or "uploaded_spreadsheet.csv"
    ext = Path(filename).suffix.lower()
    
    if ext not in (".csv", ".tsv", ".txt", ".xlsx", ".xls"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Supported formats: CSV, TSV, XLSX."
        )

    content = await file.read()
    file_size = len(content)

    if file_size > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum upload size of {settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    df = _load_dataframe_from_bytes(content, filename)
    session = session_storage.create_session(filename, file_size, ext, df)
    return _build_preview_response(session)

@router.get("/preview/{session_id}", response_model=DatasetPreviewResponse)
def get_preview(session_id: str):
    """Retrieves the current preview, profiling stats, and diff for a session."""
    session = session_storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found or expired.")
    return _build_preview_response(session)

@router.post("/reset/{session_id}", response_model=DatasetPreviewResponse)
def reset_session(session_id: str):
    """Resets the cleaned dataset back to the original raw uploaded version."""
    session = session_storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found or expired.")
    session.current_df = session.raw_df.copy()
    session.applied_operations = []
    session.audit_log = []
    return _build_preview_response(session)

@router.get("/sample/{sample_name}", response_model=DatasetPreviewResponse)
def load_sample_dataset(sample_name: str = "messy_sales"):
    """Loads a pre-packaged messy dataset for instant demonstration and testing."""
    sample_filename = "messy_sales_data.csv"
    file_path = SAMPLE_DATA_DIR / sample_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Sample dataset '{sample_name}' not found.")
        
    with open(file_path, "rb") as f:
        content = f.read()

    df = _load_dataframe_from_bytes(content, sample_filename)
    session = session_storage.create_session(sample_filename, len(content), ".csv", df)
    return _build_preview_response(session)

@router.get("/download/{session_id}")
def download_cleaned_file(session_id: str, format: str = Query("csv", pattern="^(csv|xlsx)$")):
    """Downloads the cleaned spreadsheet dataset in CSV or formatted Excel XLSX format."""
    session = session_storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found or expired.")

    base_name = Path(session.filename).stem
    out_filename = f"{base_name}_cleaned.{format}"

    if format == "csv":
        stream = io.StringIO()
        session.current_df.to_csv(stream, index=False)
        stream.seek(0)
        return StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=\"{out_filename}\""}
        )
    else: # xlsx
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            session.current_df.to_excel(writer, index=False, sheet_name="Cleaned Data")
            # Auto-fit columns for polished Excel export
            worksheet = writer.sheets["Cleaned Data"]
            for col in worksheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = col[0].column_letter
                worksheet.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 50)

        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=\"{out_filename}\""}
        )
