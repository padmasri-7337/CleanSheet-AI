import io
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.services.cleaning_engine import cleaning_engine
from app.services.ai_cleaner import ai_cleaner
from app.database import db_manager
from app.services.auth import hash_password, verify_password, create_access_token, decode_access_token

client = TestClient(app)

# -------------------------------------------------------------
# 1. Core Cleaning Engine Tests
# -------------------------------------------------------------
def test_remove_duplicates():
    df = pd.DataFrame({
        "id": [1, 2, 2, 3],
        "name": ["Alice", "Bob", "Bob", "Charlie"]
    })
    cleaned, detail = cleaning_engine.remove_duplicates(df, keep="first")
    assert len(cleaned) == 3
    assert detail["rows_removed"] == 1
    assert list(cleaned["id"]) == [1, 2, 3]

def test_missing_values_fill_median_and_mode():
    df = pd.DataFrame({
        "age": [20.0, 30.0, np.nan, 40.0],
        "city": ["New York", "London", "New York", None]
    })
    # Fill numeric with median
    cleaned_num, _ = cleaning_engine.handle_missing(df, strategy="fill_median", columns=["age"])
    assert cleaned_num["age"].isna().sum() == 0
    assert cleaned_num["age"].iloc[2] == 30.0

    # Fill categorical with value
    cleaned_cat, _ = cleaning_engine.handle_missing(cleaned_num, strategy="fill_value", columns=["city"], value="Unknown")
    assert cleaned_cat["city"].isna().sum() == 0
    assert cleaned_cat["city"].iloc[3] == "Unknown"

def test_normalize_headers():
    df = pd.DataFrame({
        "  First Name  ": [1],
        "Order-ID (#)": [2],
        "Total Amount": [3]
    })
    cleaned, detail = cleaning_engine.normalize_headers(df, style="snake_case")
    assert "first_name" in cleaned.columns
    assert "order_id" in cleaned.columns
    assert "total_amount" in cleaned.columns

def test_trim_whitespace():
    df = pd.DataFrame({
        "name": ["  John Doe  ", "Alice   Smith ", "Bob"]
    })
    cleaned, detail = cleaning_engine.trim_whitespace(df, columns=["name"], collapse_internal=True)
    assert list(cleaned["name"]) == ["John Doe", "Alice Smith", "Bob"]
    assert detail["cells_affected"] == 2

def test_inconsistent_dates_parsing():
    df = pd.DataFrame({
        "date": ["2023-01-15", "15/01/2023", "Jan 16, 2023", "2023/01/18", None]
    })
    cleaned, detail = cleaning_engine.convert_types(df, columns=["date"], target_type="datetime")
    assert cleaned["date"].iloc[0] == "2023-01-15"
    assert cleaned["date"].iloc[1] == "2023-01-15"
    assert cleaned["date"].iloc[2] == "2023-01-16"
    assert cleaned["date"].iloc[3] == "2023-01-18"
    assert pd.isna(cleaned["date"].iloc[4]) or cleaned["date"].iloc[4] is None

def test_leading_zeroes_preservation():
    df = pd.DataFrame({
        "zip_code": ["00101", "007", "04390"]
    })
    cleaned, detail = cleaning_engine.convert_types(df, columns=["zip_code"], target_type="identifier")
    assert list(cleaned["zip_code"]) == ["00101", "007", "04390"]
    # Check that they remain strings with exact length preserved
    assert all(isinstance(val, str) for val in cleaned["zip_code"])

def test_currency_string_conversion():
    df = pd.DataFrame({
        "price": ["$1,250.50", "€45.00", "  £899.99  ", None]
    })
    cleaned, detail = cleaning_engine.convert_types(df, columns=["price"], target_type="currency_numeric")
    assert cleaned["price"].iloc[0] == 1250.50
    assert cleaned["price"].iloc[1] == 45.00
    assert cleaned["price"].iloc[2] == 899.99
    assert np.isnan(cleaned["price"].iloc[3])

# -------------------------------------------------------------
# 2. API Integration Tests (Upload, Profiling, Download)
# -------------------------------------------------------------
def test_upload_messy_csv_and_profile():
    csv_content = b" Name , Age , City \n  Alice  , 25 , NYC \n  Alice  , 25 , NYC \nBob,,London"
    response = client.post(
        "/api/data/upload",
        files={"file": ("test.csv", csv_content, "text/csv")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["row_count"] == 3
    assert data["duplicate_rows"] == 1
    assert data["total_missing_cells"] == 1
    assert len(data["issues"]) > 0
    assert "retention_policy" in data

def test_empty_file_rejected():
    response = client.post(
        "/api/data/upload",
        files={"file": ("empty.csv", b"", "text/csv")}
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_invalid_file_format_rejected():
    response = client.post(
        "/api/data/upload",
        files={"file": ("malicious.exe", b"binarycontent", "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "unsupported" in response.json()["detail"].lower() or "invalid" in response.json()["detail"].lower()

def test_sample_dataset_loading():
    response = client.get("/api/data/sample/messy_sales")
    assert response.status_code == 200
    data = response.json()
    assert data["row_count"] > 0
    assert data["duplicate_rows"] >= 1
    assert data["quality_score"] > 0

def test_clean_step_and_diff():
    # Load sample
    load_res = client.get("/api/data/sample/messy_sales")
    session_id = load_res.json()["session_id"]
    orig_rows = load_res.json()["row_count"]

    # Deduplicate
    step_res = client.post("/api/clean/step", json={
        "session_id": session_id,
        "operation": "remove_duplicates",
        "params": {"keep": "first"}
    })
    assert step_res.status_code == 200
    res_data = step_res.json()
    assert res_data["row_count"] < orig_rows
    assert len(res_data["applied_operations"]) == 1

def test_download_clean_csv_and_xlsx():
    load_res = client.get("/api/data/sample/messy_sales")
    session_id = load_res.json()["session_id"]

    # CSV
    csv_dl = client.get(f"/api/data/download/{session_id}?format=csv")
    assert csv_dl.status_code == 200
    assert "text/csv" in csv_dl.headers.get("content-type")

    # XLSX
    xlsx_dl = client.get(f"/api/data/download/{session_id}?format=xlsx")
    assert xlsx_dl.status_code == 200
    assert "spreadsheetml" in xlsx_dl.headers.get("content-type")

# -------------------------------------------------------------
# 3. AI Plan & Fallback Tests
# -------------------------------------------------------------
def test_ai_heuristic_plan_fallback():
    load_res = client.get("/api/data/sample/messy_sales")
    session_id = load_res.json()["session_id"]

    plan_res = client.post("/api/ai/plan", json={
        "session_id": session_id,
        "instruction": "Clean headers, remove duplicate orders, and fix dates"
    })
    assert plan_res.status_code == 200
    plan = plan_res.json()
    assert "steps" in plan
    assert len(plan["steps"]) >= 2
    assert "privacy_disclosure" in plan
    
    # Test execution of approved steps
    exec_res = client.post("/api/ai/execute", json={
        "session_id": session_id,
        "steps": plan["steps"]
    })
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert len(exec_data["applied_operations"]) >= 2

# -------------------------------------------------------------
# 4. Database Resilience & Recipes Tests
# -------------------------------------------------------------
def test_db_status_never_claims_connected_unless_tested():
    status = db_manager.get_status()
    assert "is_connected" in status
    assert "mode" in status
    assert "status" in status
    # In test mode without Atlas URI, is_connected must be False
    if not db_manager.is_connected:
        assert status["is_connected"] is False
        assert "fallback" in status["mode"].lower() or "local" in status["mode"].lower()

def test_recipe_lifecycle_in_memory_or_db():
    recipes_res = client.get("/api/recipes")
    assert recipes_res.status_code == 200
    data = recipes_res.json()
    assert len(data["presets"]) >= 2

    # Save custom recipe
    save_res = client.post("/api/recipes/save", json={
        "name": "Custom Test Pipeline",
        "description": "Trim and remove duplicates",
        "operations": [
            {"operation": "trim_whitespace", "params": {}},
            {"operation": "remove_duplicates", "params": {}}
        ]
    })
    assert save_res.status_code == 200
    recipe_id = save_res.json()["id"]

    # Delete custom recipe
    del_res = client.delete(f"/api/recipes/{recipe_id}")
    assert del_res.status_code == 200

# -------------------------------------------------------------
# 5. Security & Auth Tests
# -------------------------------------------------------------
def test_bcrypt_hashing_and_jwt():
    pwd = "SecretPassword123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

    token = create_access_token({"sub": "user_42", "username": "alice"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user_42"
    assert payload["username"] == "alice"
