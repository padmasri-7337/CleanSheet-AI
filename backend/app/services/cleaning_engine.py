import re
import math
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

class CleaningEngine:
    """Deterministic, robust data cleaning and profiling engine."""

    # -------------------------------------------------------------
    # Profiling & Quality Scoring
    # -------------------------------------------------------------
    @staticmethod
    def profile_dataframe(
        df: pd.DataFrame,
        protected_columns: Optional[List[str]] = None,
        dismissed_issues: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Profiles a DataFrame, computes quality metrics, and detects common issues."""
        protected_set = set(protected_columns or [])
        dismissed_set = set(dismissed_issues or [])

        row_count, col_count = df.shape
        duplicate_rows = int(df.duplicated().sum())
        total_cells = row_count * col_count if col_count > 0 else 0
        
        # Calculate missing values per column and total
        missing_per_col = df.isna().sum().to_dict()
        total_missing_cells = int(df.isna().sum().sum())
        missing_pct = (total_missing_cells / total_cells * 100) if total_cells > 0 else 0.0

        # Column profile details
        columns_profile = []
        issues: List[Dict[str, Any]] = []

        # Check duplicate rows issue
        if duplicate_rows > 0 and "duplicate_rows" not in dismissed_set:
            issues.append({
                "id": "duplicate_rows",
                "severity": "high",
                "category": "duplicates",
                "title": f"Found {duplicate_rows} duplicate rows",
                "description": f"The dataset contains {duplicate_rows} exact duplicate rows that may skew your analysis.",
                "affected_columns": [],
                "suggested_action": "remove_duplicates",
                "suggested_params": {"subset": None, "keep": "first"}
            })

        for col in df.columns:
            col_series = df[col]
            missing_count = int(col_series.isna().sum())
            non_null_series = col_series.dropna()
            unique_count = int(col_series.nunique(dropna=True))
            
            # Infer column type
            inferred_type = CleaningEngine._infer_column_type(col_series)
            
            # Detect header issues
            col_str = str(col)
            header_issue_id = f"messy_header_{col_str}"
            if (col_str != col_str.strip() or re.search(r'\s{2,}', col_str) or re.search(r'[^a-zA-Z0-9_\s]', col_str)) and header_issue_id not in dismissed_set:
                issues.append({
                    "id": header_issue_id,
                    "severity": "low",
                    "category": "headers",
                    "title": f"Messy column header: '{col_str}'",
                    "description": f"Column '{col_str}' has unnormalized whitespace or special characters.",
                    "affected_columns": [col_str],
                    "suggested_action": "normalize_headers",
                    "suggested_params": {"style": "snake_case"}
                })

            # Detect missing values in column
            missing_issue_id = f"missing_values_{col_str}"
            if missing_count > 0 and missing_issue_id not in dismissed_set:
                missing_col_pct = (missing_count / row_count * 100) if row_count > 0 else 0
                severity = "high" if missing_col_pct > 30 else "medium"
                
                # Determine smart fallback strategy
                if inferred_type in ("integer", "float"):
                    strat = "fill_median"
                elif inferred_type == "datetime":
                    strat = "ffill"
                else:
                    strat = "fill_value"

                issues.append({
                    "id": missing_issue_id,
                    "severity": severity,
                    "category": "missing_values",
                    "title": f"Missing values in '{col_str}': {missing_count} rows ({missing_col_pct:.1f}%)",
                    "description": f"Column '{col_str}' has missing / null values.",
                    "affected_columns": [col_str],
                    "suggested_action": "handle_missing",
                    "suggested_params": {"columns": [col_str], "strategy": strat, "value": "Unknown" if strat == "fill_value" else None}
                })

            # Detect whitespace in string columns
            ws_issue_id = f"whitespace_{col_str}"
            if inferred_type == "string" and len(non_null_series) > 0 and ws_issue_id not in dismissed_set:
                has_padded_whitespace = non_null_series.apply(
                    lambda v: isinstance(v, str) and (v != v.strip() or "  " in v)
                ).any()
                if has_padded_whitespace:
                    issues.append({
                        "id": ws_issue_id,
                        "severity": "low",
                        "category": "formatting",
                        "title": f"Leading/trailing whitespace in '{col_str}'",
                        "description": f"Text values in '{col_str}' have extra whitespace or padding.",
                        "affected_columns": [col_str],
                        "suggested_action": "trim_whitespace",
                        "suggested_params": {"columns": [col_str], "collapse_internal": True}
                    })

            # Detect currency strings formatted as text
            curr_issue_id = f"currency_format_{col_str}"
            if inferred_type == "string" and len(non_null_series) > 0 and curr_issue_id not in dismissed_set:
                currency_count = non_null_series.apply(
                    lambda v: bool(re.search(r'[\$€£¥]\s*[\d,]+(\.\d+)?', str(v)))
                ).sum()
                if currency_count > 0 and currency_count / len(non_null_series) > 0.5:
                    issues.append({
                        "id": curr_issue_id,
                        "severity": "medium",
                        "category": "types",
                        "title": f"Currency strings in '{col_str}'",
                        "description": f"Column '{col_str}' contains currency symbols ($/€/£). Convert to numeric float for calculation.",
                        "affected_columns": [col_str],
                        "suggested_action": "convert_types",
                        "suggested_params": {"columns": [col_str], "target_type": "currency_numeric"}
                    })

            # Detect leading zeros in potential identifiers
            id_issue_id = f"leading_zeros_{col_str}"
            if col_str not in protected_set and id_issue_id not in dismissed_set and inferred_type in ("string", "identifier") and len(non_null_series) > 0:
                has_leading_zeros = non_null_series.apply(
                    lambda v: bool(re.match(r'^0\d+$', str(v).strip()))
                ).any()
                if has_leading_zeros:
                    issues.append({
                        "id": id_issue_id,
                        "severity": "info",
                        "category": "identifiers",
                        "title": f"Leading zeros detected in '{col_str}'",
                        "description": f"Column '{col_str}' appears to be an identifier (e.g. zip code, ID). Protect as text to avoid truncation.",
                        "affected_columns": [col_str],
                        "suggested_action": "convert_types",
                        "suggested_params": {"columns": [col_str], "target_type": "identifier"}
                    })

            # Sample values (up to 3 non-null masked/anonymized strings)
            sample_vals = [str(val) for val in non_null_series.head(3).tolist()]

            columns_profile.append({
                "name": col_str,
                "inferred_type": inferred_type,
                "dtype": str(df[col].dtype),
                "total_count": row_count,
                "missing_count": missing_count,
                "missing_pct": round((missing_count / row_count * 100), 2) if row_count > 0 else 0,
                "unique_count": unique_count,
                "sample_values": sample_vals
            })

        # Calculate overall quality score (0 to 100)
        quality_score = CleaningEngine._calculate_quality_score(
            row_count=row_count,
            col_count=col_count,
            duplicate_count=duplicate_rows,
            missing_count=total_missing_cells,
            issue_count=len(issues)
        )

        return {
            "row_count": row_count,
            "column_count": col_count,
            "total_cells": total_cells,
            "duplicate_rows": duplicate_rows,
            "total_missing_cells": total_missing_cells,
            "missing_pct": round(missing_pct, 2),
            "quality_score": quality_score,
            "columns": columns_profile,
            "issues": issues,
        }

    @staticmethod
    def _infer_column_type(series: pd.Series) -> str:
        """Heuristically infers human-friendly semantic column types."""
        non_null = series.dropna()
        if len(non_null) == 0:
            return "empty"

        # Check boolean
        if pd.api.types.is_bool_dtype(series):
            return "boolean"
        sample_lower = non_null.astype(str).str.strip().str.lower()
        if set(sample_lower.unique()).issubset({"true", "false", "yes", "no", "1", "0", "t", "f", "y", "n"}):
            return "boolean"

        # Check identifier with leading zero
        if non_null.astype(str).str.match(r'^0\d+$').any():
            return "identifier"

        # Check numeric
        if pd.api.types.is_numeric_dtype(series):
            # Check integer vs float
            if pd.api.types.is_integer_dtype(series):
                return "integer"
            # If all floats are whole numbers
            is_whole = non_null.apply(lambda x: float(x).is_integer() if not math.isnan(float(x)) else True).all()
            return "integer" if is_whole else "float"

        # Check datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"

        # Check date string patterns
        date_pattern = r'(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{4})|(?:[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})'
        date_matches = sample_lower.str.contains(date_pattern, regex=True).sum()
        if date_matches / len(non_null) > 0.6:
            return "datetime"

        return "string"

    @staticmethod
    def _calculate_quality_score(row_count: int, col_count: int, duplicate_count: int, missing_count: int, issue_count: int) -> int:
        """Calculates a transparent dataset quality score between 0 and 100."""
        if row_count == 0 or col_count == 0:
            return 0
            
        score = 100.0
        total_cells = row_count * col_count

        # Penalty for missing values (up to 35 points)
        missing_ratio = missing_count / total_cells if total_cells > 0 else 0
        score -= min(35.0, missing_ratio * 70.0)

        # Penalty for duplicate rows (up to 30 points)
        duplicate_ratio = duplicate_count / row_count if row_count > 0 else 0
        score -= min(30.0, duplicate_ratio * 100.0)

        # Penalty for formatting issues (up to 20 points)
        score -= min(20.0, issue_count * 2.5)

        return max(10, min(100, int(round(score))))

    # -------------------------------------------------------------
    # Cleaning Operations
    # -------------------------------------------------------------
    @staticmethod
    def remove_duplicates(df: pd.DataFrame, subset: Optional[List[str]] = None, keep: str = "first") -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Removes duplicate rows based on subset columns or all columns."""
        initial_count = len(df)
        valid_subset = [c for c in subset if c in df.columns] if subset else None
        keep_val: Any = keep if keep in ("first", "last", False) else "first"
        
        cleaned_df = df.drop_duplicates(subset=valid_subset, keep=keep_val).reset_index(drop=True)
        removed_count = initial_count - len(cleaned_df)
        
        detail = {
            "operation": "remove_duplicates",
            "rows_removed": removed_count,
            "subset": valid_subset or "all_columns",
            "keep": keep,
            "description": f"Removed {removed_count} duplicate row(s) keeping '{keep}' occurrence."
        }
        return cleaned_df, detail

    @staticmethod
    def handle_missing(
        df: pd.DataFrame,
        strategy: str,
        columns: Optional[List[str]] = None,
        value: Optional[Any] = None,
        threshold: Optional[float] = None
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Handles missing values using drop_rows, drop_columns, fill_value, fill_mean, fill_median, fill_mode, ffill, bfill."""
        cleaned_df = df.copy()
        target_cols = [c for c in columns if c in cleaned_df.columns] if columns else list(cleaned_df.columns)
        initial_rows = len(cleaned_df)
        initial_cols = len(cleaned_df.columns)
        affected_cells = 0

        if strategy == "drop_rows":
            cleaned_df = cleaned_df.dropna(subset=target_cols).reset_index(drop=True)
            rows_dropped = initial_rows - len(cleaned_df)
            desc = f"Dropped {rows_dropped} row(s) containing missing values in {len(target_cols)} column(s)."
            detail = {"strategy": strategy, "rows_dropped": rows_dropped, "columns": target_cols, "description": desc}
            return cleaned_df, detail

        elif strategy == "drop_columns":
            if threshold is not None:
                # Drop columns where missing percentage > threshold (0.0 to 1.0)
                cols_to_drop = [
                    col for col in target_cols
                    if (cleaned_df[col].isna().sum() / len(cleaned_df)) >= threshold
                ]
            else:
                cols_to_drop = target_cols
            cleaned_df = cleaned_df.drop(columns=cols_to_drop)
            cols_dropped = initial_cols - len(cleaned_df.columns)
            desc = f"Dropped {cols_dropped} column(s) due to missing values."
            detail = {"strategy": strategy, "columns_dropped": cols_to_drop, "description": desc}
            return cleaned_df, detail

        elif strategy == "fill_value":
            fill_val = "Unknown" if value is None else value
            for col in target_cols:
                missing_in_col = int(cleaned_df[col].isna().sum())
                if missing_in_col > 0:
                    cleaned_df[col] = cleaned_df[col].fillna(fill_val)
                    affected_cells += missing_in_col
            desc = f"Filled missing values in {len(target_cols)} column(s) with constant '{fill_val}' ({affected_cells} cells affected)."
            return cleaned_df, {"strategy": strategy, "fill_value": fill_val, "cells_affected": affected_cells, "description": desc}

        elif strategy == "fill_mean":
            for col in target_cols:
                # Try numeric conversion
                numeric_series = pd.to_numeric(cleaned_df[col], errors='coerce')
                if not numeric_series.dropna().empty:
                    mean_val = round(float(numeric_series.mean()), 2)
                    missing_in_col = int(cleaned_df[col].isna().sum())
                    cleaned_df[col] = cleaned_df[col].fillna(mean_val)
                    affected_cells += missing_in_col
            desc = f"Filled missing numeric values in {len(target_cols)} column(s) with mean ({affected_cells} cells affected)."
            return cleaned_df, {"strategy": strategy, "cells_affected": affected_cells, "description": desc}

        elif strategy == "fill_median":
            for col in target_cols:
                numeric_series = pd.to_numeric(cleaned_df[col], errors='coerce')
                if not numeric_series.dropna().empty:
                    median_val = round(float(numeric_series.median()), 2)
                    missing_in_col = int(cleaned_df[col].isna().sum())
                    cleaned_df[col] = cleaned_df[col].fillna(median_val)
                    affected_cells += missing_in_col
            desc = f"Filled missing numeric values in {len(target_cols)} column(s) with median ({affected_cells} cells affected)."
            return cleaned_df, {"strategy": strategy, "cells_affected": affected_cells, "description": desc}

        elif strategy == "fill_mode":
            for col in target_cols:
                mode_vals = cleaned_df[col].mode()
                if not mode_vals.empty:
                    mode_val = mode_vals.iloc[0]
                    missing_in_col = int(cleaned_df[col].isna().sum())
                    cleaned_df[col] = cleaned_df[col].fillna(mode_val)
                    affected_cells += missing_in_col
            desc = f"Filled missing values in {len(target_cols)} column(s) with mode ({affected_cells} cells affected)."
            return cleaned_df, {"strategy": strategy, "cells_affected": affected_cells, "description": desc}

        elif strategy in ("ffill", "bfill"):
            for col in target_cols:
                missing_in_col = int(cleaned_df[col].isna().sum())
                if strategy == "ffill":
                    cleaned_df[col] = cleaned_df[col].ffill().bfill()
                else:
                    cleaned_df[col] = cleaned_df[col].bfill().ffill()
                affected_cells += missing_in_col
            desc = f"Filled missing values in {len(target_cols)} column(s) using {strategy} ({affected_cells} cells affected)."
            return cleaned_df, {"strategy": strategy, "cells_affected": affected_cells, "description": desc}

        return cleaned_df, {"strategy": strategy, "description": "No missing value operation applied."}

    @staticmethod
    def normalize_headers(df: pd.DataFrame, style: str = "snake_case") -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Normalizes column headers to snake_case, camelCase, lowercase, uppercase, or trimmed clean."""
        cleaned_df = df.copy()
        old_cols = list(cleaned_df.columns)
        new_cols = []
        seen = {}

        for col in old_cols:
            col_str = str(col).strip()
            
            if style == "snake_case":
                # Replace non-alphanumeric chars with underscore, then snake case
                s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', col_str)
                s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
                clean = re.sub(r'[^a-zA-Z0-9]+', '_', s2).strip('_')
            elif style == "camelCase":
                words = re.findall(r'[a-zA-Z0-9]+', col_str)
                if not words:
                    clean = "col"
                else:
                    clean = words[0].lower() + "".join(w.capitalize() for w in words[1:])
            elif style == "lower":
                clean = re.sub(r'\s+', ' ', col_str).lower()
            elif style == "upper":
                clean = re.sub(r'\s+', ' ', col_str).upper()
            else: # trim_clean
                clean = re.sub(r'\s+', ' ', col_str)

            # Deduplicate column names if collisions happen
            if clean in seen:
                seen[clean] += 1
                clean = f"{clean}_{seen[clean]}"
            else:
                seen[clean] = 0

            new_cols.append(clean)

        cleaned_df.columns = new_cols
        changed_count = sum(1 for o, n in zip(old_cols, new_cols) if o != n)
        
        detail = {
            "operation": "normalize_headers",
            "style": style,
            "columns_renamed": changed_count,
            "mapping": dict(zip(old_cols, new_cols)),
            "description": f"Normalized {changed_count} column header(s) to {style} format."
        }
        return cleaned_df, detail

    @staticmethod
    def trim_whitespace(df: pd.DataFrame, columns: Optional[List[str]] = None, collapse_internal: bool = True) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Trims leading/trailing whitespace and optionally collapses internal multiple spaces."""
        cleaned_df = df.copy()
        target_cols = [c for c in columns if c in cleaned_df.columns] if columns else list(cleaned_df.columns)
        affected_cells = 0

        for col in target_cols:
            if cleaned_df[col].dtype == object or pd.api.types.is_string_dtype(cleaned_df[col]):
                def clean_str(val):
                    nonlocal affected_cells
                    if isinstance(val, str):
                        original = val
                        stripped = val.strip()
                        if collapse_internal:
                            stripped = re.sub(r'\s{2,}', ' ', stripped)
                        if stripped != original:
                            affected_cells += 1
                        return stripped
                    return val

                cleaned_df[col] = cleaned_df[col].apply(clean_str)

        detail = {
            "operation": "trim_whitespace",
            "columns": target_cols,
            "cells_affected": affected_cells,
            "description": f"Trimmed whitespace in {len(target_cols)} column(s) ({affected_cells} cells updated)."
        }
        return cleaned_df, detail

    @staticmethod
    def text_case(df: pd.DataFrame, columns: List[str], case_type: str = "title") -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Converts string casing: title, lower, upper, capitalize."""
        cleaned_df = df.copy()
        target_cols = [c for c in columns if c in cleaned_df.columns]
        affected_cells = 0

        for col in target_cols:
            if cleaned_df[col].dtype == object or pd.api.types.is_string_dtype(cleaned_df[col]):
                def change_case(val):
                    nonlocal affected_cells
                    if isinstance(val, str):
                        original = val
                        if case_type == "title":
                            new_val = val.title()
                        elif case_type == "lower":
                            new_val = val.lower()
                        elif case_type == "upper":
                            new_val = val.upper()
                        elif case_type == "capitalize":
                            new_val = val.capitalize()
                        else:
                            new_val = val
                        if new_val != original:
                            affected_cells += 1
                        return new_val
                    return val

                cleaned_df[col] = cleaned_df[col].apply(change_case)

        detail = {
            "operation": "text_case",
            "case_type": case_type,
            "columns": target_cols,
            "cells_affected": affected_cells,
            "description": f"Converted {len(target_cols)} column(s) to {case_type} casing ({affected_cells} cells updated)."
        }
        return cleaned_df, detail

    @staticmethod
    def convert_types(
        df: pd.DataFrame,
        columns: List[str],
        target_type: str,
        date_format: str = "%Y-%m-%d",
        fill_invalid: Optional[Any] = None
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Converts column data types: datetime, currency_numeric, integer, float, string, boolean, identifier."""
        cleaned_df = df.copy()
        target_cols = [c for c in columns if c in cleaned_df.columns]
        affected_cells = 0

        for col in target_cols:
            series = cleaned_df[col]
            
            if target_type == "datetime":
                def parse_date(val):
                    nonlocal affected_cells
                    if pd.isna(val) or val == "" or str(val).strip() == "":
                        return None
                    val_str = str(val).strip()
                    try:
                        # Try standard pandas to_datetime with flexible dayfirst/yearfirst
                        dt = pd.to_datetime(val_str, errors='coerce', format='mixed')
                        if pd.notna(dt):
                            affected_cells += 1
                            return dt.strftime(date_format)
                        return val if fill_invalid is None else fill_invalid
                    except Exception:
                        return val if fill_invalid is None else fill_invalid

                cleaned_df[col] = series.apply(parse_date)

            elif target_type in ("currency_numeric", "numeric", "float"):
                def parse_numeric(val):
                    nonlocal affected_cells
                    if pd.isna(val) or val == "" or str(val).strip() == "":
                        return np.nan
                    val_str = str(val).strip()
                    # Strip $, €, £, ¥, commas, %, spaces
                    cleaned_str = re.sub(r'[\$€£¥\s,%]', '', val_str)
                    try:
                        f_val = float(cleaned_str)
                        # Check if original had % symbol, adjust if so
                        if "%" in val_str:
                            f_val = f_val # keep percentage scale or user choice
                        affected_cells += 1
                        return f_val
                    except Exception:
                        return np.nan if fill_invalid is None else fill_invalid

                cleaned_df[col] = series.apply(parse_numeric)

            elif target_type == "integer":
                def parse_int(val):
                    nonlocal affected_cells
                    if pd.isna(val) or val == "" or str(val).strip() == "":
                        return np.nan
                    val_str = str(val).strip()
                    cleaned_str = re.sub(r'[\$€£¥\s,%]', '', val_str)
                    try:
                        i_val = int(round(float(cleaned_str)))
                        affected_cells += 1
                        return i_val
                    except Exception:
                        return np.nan if fill_invalid is None else fill_invalid

                cleaned_df[col] = series.apply(parse_int)

            elif target_type == "identifier":
                # String that keeps leading zeros untouched!
                def parse_identifier(val):
                    nonlocal affected_cells
                    if pd.isna(val):
                        return ""
                    val_str = str(val).strip()
                    affected_cells += 1
                    return val_str

                cleaned_df[col] = series.apply(parse_identifier).astype(str)

            elif target_type == "boolean":
                true_set = {"true", "yes", "1", "t", "y"}
                false_set = {"false", "no", "0", "f", "n"}
                def parse_bool(val):
                    nonlocal affected_cells
                    if pd.isna(val):
                        return None
                    v_str = str(val).strip().lower()
                    if v_str in true_set:
                        affected_cells += 1
                        return True
                    if v_str in false_set:
                        affected_cells += 1
                        return False
                    return None

                cleaned_df[col] = series.apply(parse_bool)

            elif target_type == "string":
                cleaned_df[col] = series.fillna("").astype(str)

        detail = {
            "operation": "convert_types",
            "target_type": target_type,
            "columns": target_cols,
            "cells_affected": affected_cells,
            "description": f"Converted {len(target_cols)} column(s) to {target_type} ({affected_cells} cells parsed)."
        }
        return cleaned_df, detail

    @staticmethod
    def column_operations(
        df: pd.DataFrame,
        action: str,
        columns: Optional[List[str]] = None,
        rename_map: Optional[Dict[str, str]] = None,
        new_order: Optional[List[str]] = None
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Handles renaming, reordering, dropping, and selecting columns."""
        cleaned_df = df.copy()

        if action == "rename" and rename_map:
            valid_map = {k: v for k, v in rename_map.items() if k in cleaned_df.columns and v.strip()}
            cleaned_df = cleaned_df.rename(columns=valid_map)
            desc = f"Renamed {len(valid_map)} column(s): {valid_map}"
            return cleaned_df, {"action": action, "mapping": valid_map, "description": desc}

        elif action == "drop" and columns:
            valid_cols = [c for c in columns if c in cleaned_df.columns]
            cleaned_df = cleaned_df.drop(columns=valid_cols)
            desc = f"Dropped {len(valid_cols)} column(s): {valid_cols}"
            return cleaned_df, {"action": action, "dropped_columns": valid_cols, "description": desc}

        elif action == "select" and columns:
            valid_cols = [c for c in columns if c in cleaned_df.columns]
            cleaned_df = cleaned_df[valid_cols]
            desc = f"Selected {len(valid_cols)} column(s), omitted remaining."
            return cleaned_df, {"action": action, "selected_columns": valid_cols, "description": desc}

        elif action == "reorder" and new_order:
            existing = [c for c in new_order if c in cleaned_df.columns]
            remaining = [c for c in cleaned_df.columns if c not in existing]
            full_order = existing + remaining
            cleaned_df = cleaned_df[full_order]
            desc = f"Reordered columns to match specified order."
            return cleaned_df, {"action": action, "order": full_order, "description": desc}

        return cleaned_df, {"action": action, "description": "No column operation performed."}

    @staticmethod
    def find_replace(
        df: pd.DataFrame,
        search_pattern: str,
        replace_value: str,
        columns: Optional[List[str]] = None,
        is_regex: bool = False
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Finds and replaces text patterns in specified or all columns."""
        cleaned_df = df.copy()
        target_cols = [c for c in columns if c in cleaned_df.columns] if columns else list(cleaned_df.columns)
        affected_cells = 0

        for col in target_cols:
            if cleaned_df[col].dtype == object or pd.api.types.is_string_dtype(cleaned_df[col]):
                def replacer(val):
                    nonlocal affected_cells
                    if isinstance(val, str):
                        original = val
                        if is_regex:
                            new_val = re.sub(search_pattern, replace_value, val)
                        else:
                            new_val = val.replace(search_pattern, replace_value)
                        if new_val != original:
                            affected_cells += 1
                        return new_val
                    return val

                cleaned_df[col] = cleaned_df[col].apply(replacer)

        desc = f"Replaced '{search_pattern}' with '{replace_value}' in {len(target_cols)} column(s) ({affected_cells} cells affected)."
        return cleaned_df, {
            "operation": "find_replace",
            "search_pattern": search_pattern,
            "replace_value": replace_value,
            "columns": target_cols,
            "cells_affected": affected_cells,
            "description": desc
        }

    # -------------------------------------------------------------
    # Diff & Comparison
    # -------------------------------------------------------------
    @staticmethod
    def compute_diff_summary(raw_df: pd.DataFrame, clean_df: pd.DataFrame) -> Dict[str, Any]:
        """Calculates differences between original raw DataFrame and cleaned DataFrame."""
        raw_rows, raw_cols = raw_df.shape
        clean_rows, clean_cols = clean_df.shape
        
        raw_profile = CleaningEngine.profile_dataframe(raw_df)
        clean_profile = CleaningEngine.profile_dataframe(clean_df)

        # Estimate changed cells on common overlapping rows/columns
        common_cols = [c for c in clean_df.columns if c in raw_df.columns]
        min_rows = min(raw_rows, clean_rows)
        changed_cells_count = 0
        
        if min_rows > 0 and len(common_cols) > 0:
            sub_raw = raw_df[common_cols].iloc[:min_rows].fillna("")
            sub_clean = clean_df[common_cols].iloc[:min_rows].fillna("")
            changed_cells_count = int((sub_raw != sub_clean).sum().sum())

        return {
            "original_rows": raw_rows,
            "cleaned_rows": clean_rows,
            "rows_removed": raw_rows - clean_rows,
            "original_cols": raw_cols,
            "cleaned_cols": clean_cols,
            "cols_delta": clean_cols - raw_cols,
            "original_missing": raw_profile["total_missing_cells"],
            "cleaned_missing": clean_profile["total_missing_cells"],
            "missing_resolved": raw_profile["total_missing_cells"] - clean_profile["total_missing_cells"],
            "original_duplicates": raw_profile["duplicate_rows"],
            "cleaned_duplicates": clean_profile["duplicate_rows"],
            "duplicates_removed": raw_profile["duplicate_rows"] - clean_profile["duplicate_rows"],
            "original_quality_score": raw_profile["quality_score"],
            "cleaned_quality_score": clean_profile["quality_score"],
            "quality_score_improvement": clean_profile["quality_score"] - raw_profile["quality_score"],
            "changed_cells_count": changed_cells_count
        }

cleaning_engine = CleaningEngine()
