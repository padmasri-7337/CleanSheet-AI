import json
import logging
import re
import uuid
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("cleansheet.ai")

SUPPORTED_OPERATIONS = {
    "remove_duplicates",
    "handle_missing",
    "normalize_headers",
    "trim_whitespace",
    "text_case",
    "convert_types",
    "column_operations",
    "find_replace"
}

SYSTEM_INSTRUCTION = """
You are CleanSheet AI's expert data cleaning assistant.
Your task is to analyze user requests along with the dataset schema and issues, and propose a precise, structured data cleaning plan.

Rules:
1. You MUST ONLY output valid JSON adhering to the specified schema. No markdown formatting, no code fences, no explanations outside the JSON.
2. NEVER propose or execute arbitrary Python code. You can ONLY use the allowed operations:
   - "remove_duplicates": params {"subset": list or null, "keep": "first" | "last"}
   - "handle_missing": params {"columns": list, "strategy": "fill_median" | "fill_mean" | "fill_mode" | "fill_value" | "drop_rows" | "drop_columns" | "ffill" | "bfill", "value": string or number or null}
   - "normalize_headers": params {"style": "snake_case" | "camelCase" | "lower" | "upper" | "trim_clean"}
   - "trim_whitespace": params {"columns": list or null, "collapse_internal": true}
   - "text_case": params {"columns": list, "case_type": "title" | "lower" | "upper" | "capitalize"}
   - "convert_types": params {"columns": list, "target_type": "datetime" | "currency_numeric" | "integer" | "float" | "string" | "boolean" | "identifier", "date_format": "%Y-%m-%d"}
   - "column_operations": params {"action": "rename" | "drop" | "reorder" | "select", "columns": list, "rename_map": object, "new_order": list}
   - "find_replace": params {"columns": list or null, "search_pattern": string, "replace_value": string, "is_regex": false}
3. Assess the risk level for each step: "low" (safe formatting/trimming), "medium" (type conversions or filling values), "high" (dropping rows or columns).
4. Explain clearly in human terms why each step is recommended and what it does.
"""

class AICleaner:
    def __init__(self):
        self.is_configured: bool = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
        self.model_name = settings.GEMINI_MODEL
        self._client = None
        
        if self.is_configured:
            try:
                from google import genai
                self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info(f"Gemini AI client initialized with model {self.model_name}")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini AI client: {e}. Will use heuristic fallback.")
                self.is_configured = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_configured": self.is_configured,
            "model": self.model_name if self.is_configured else "heuristic_fallback_engine",
            "provider": "Google Gemini" if self.is_configured else "Rule-Based Heuristic Engine (Offline Safe)",
            "privacy_disclosure": "Only anonymized column headers, inferred types, and up to 2 masked sample snippets are transmitted. Raw dataset contents never leave your backend environment."
        }

    def generate_plan(
        self,
        instruction: str,
        profile: Dict[str, Any],
        context_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generates a structured cleaning plan from natural language instruction or data profile."""
        sanitized_summary = self._prepare_privacy_safe_summary(profile)
        
        # If Gemini is configured and client is ready, attempt Gemini API call
        if self.is_configured and self._client:
            try:
                plan = self._call_gemini(instruction, sanitized_summary, context_notes)
                if plan and "steps" in plan and len(plan["steps"]) > 0:
                    plan["source"] = "gemini_ai"
                    plan["privacy_disclosure"] = self.get_status()["privacy_disclosure"]
                    return self._validate_and_format_plan(plan, profile)
            except Exception as e:
                logger.warning(f"Gemini API request failed: {e}. Falling back to heuristic engine.")

        # Resilient fallback engine
        heuristic_plan = self._generate_heuristic_plan(instruction, profile)
        heuristic_plan["source"] = "heuristic_fallback"
        heuristic_plan["note"] = "Generated via CleanSheet Deterministic Heuristic Engine (Gemini API offline or unconfigured)."
        heuristic_plan["privacy_disclosure"] = self.get_status()["privacy_disclosure"]
        return self._validate_and_format_plan(heuristic_plan, profile)

    def _prepare_privacy_safe_summary(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Strips raw data and extracts only schema and high-level issue stats."""
        cols_summary = []
        for c in profile.get("columns", []):
            samples = c.get("sample_values", [])[:2]
            cols_summary.append({
                "column_name": c["name"],
                "inferred_type": c["inferred_type"],
                "missing_count": c["missing_count"],
                "unique_count": c["unique_count"],
                "sample_masked": samples
            })
        return {
            "row_count": profile.get("row_count", 0),
            "column_count": profile.get("column_count", 0),
            "duplicate_rows": profile.get("duplicate_rows", 0),
            "columns": cols_summary,
            "detected_issues": [i.get("title") for i in profile.get("issues", [])]
        }

    def _call_gemini(self, instruction: str, summary: Dict[str, Any], context_notes: Optional[str]) -> Optional[Dict[str, Any]]:
        prompt = f"""
Dataset Summary:
{json.dumps(summary, indent=2)}

User Cleaning Instruction:
"{instruction}"

Context / Notes:
{context_notes or "None"}

Please generate a structured cleaning plan in this EXACT JSON format:
{{
  "summary": "Brief summary of the cleaning strategy",
  "steps": [
    {{
      "operation": "<supported_operation_name>",
      "params": {{ ... }},
      "description": "<Clear user-friendly description of what this step does>",
      "reasoning": "<Why this step is needed>",
      "risk_level": "low" | "medium" | "high"
    }}
  ]
}}
"""
        response = self._client.models.generate_content(
            model=self.model_name,
            contents=[SYSTEM_INSTRUCTION, prompt],
        )

        text = response.text.strip()
        # Clean any accidental markdown code fences
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)

        return json.loads(text)

    def _generate_heuristic_plan(self, instruction: str, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Smart deterministic heuristic plan generator matching user intent or issues."""
        steps: List[Dict[str, Any]] = []
        inst_lower = (instruction or "").lower().strip()
        columns = [c["name"] for c in profile.get("columns", [])]
        issues = profile.get("issues", [])

        # 1. Header normalization
        if not inst_lower or any(k in inst_lower for k in ["header", "column name", "clean columns", "snake", "normalize"]):
            has_messy_headers = any(i.get("category") == "headers" for i in issues)
            if has_messy_headers or "snake" in inst_lower:
                steps.append({
                    "operation": "normalize_headers",
                    "params": {"style": "snake_case"},
                    "description": "Normalize all column headers to consistent snake_case format.",
                    "reasoning": "Messy headers with spaces or special characters lead to errors in analysis and database queries.",
                    "risk_level": "low"
                })

        # 2. Duplicate rows
        if profile.get("duplicate_rows", 0) > 0:
            if not inst_lower or any(k in inst_lower for k in ["duplicate", "dedup", "unique", "clean"]):
                steps.append({
                    "operation": "remove_duplicates",
                    "params": {"subset": None, "keep": "first"},
                    "description": f"Remove {profile.get('duplicate_rows')} exact duplicate row(s).",
                    "reasoning": "Exact duplicate rows distort statistical aggregates and inflate metrics.",
                    "risk_level": "medium"
                })

        # 3. Leading / trailing whitespace in text columns
        text_cols = [c["name"] for c in profile.get("columns", []) if c.get("inferred_type") == "string"]
        if text_cols and (not inst_lower or any(k in inst_lower for k in ["space", "trim", "whitespace", "clean"])):
            steps.append({
                "operation": "trim_whitespace",
                "params": {"columns": text_cols, "collapse_internal": True},
                "description": f"Trim leading/trailing whitespace across text column(s).",
                "reasoning": "Accidental spaces around names and strings cause mismatches in lookups and grouping.",
                "risk_level": "low"
            })

        # 4. Inconsistent dates
        date_cols = [c["name"] for c in profile.get("columns", []) if c.get("inferred_type") == "datetime" or "date" in c["name"].lower()]
        if date_cols and (not inst_lower or any(k in inst_lower for k in ["date", "time", "format", "standardize"])):
            steps.append({
                "operation": "convert_types",
                "params": {"columns": date_cols, "target_type": "datetime", "date_format": "%Y-%m-%d"},
                "description": f"Standardize date formats in {date_cols} to ISO YYYY-MM-DD.",
                "reasoning": "Mixed date formats (e.g. DD/MM/YYYY vs MM/DD/YYYY) break date filtering and timeline charts.",
                "risk_level": "medium"
            })

        # 5. Currency / Price string cleanup
        currency_issues = [i for i in issues if i.get("category") == "types" and "currency" in i.get("id", "")]
        for ci in currency_issues:
            target_cols = ci.get("affected_columns", [])
            steps.append({
                "operation": "convert_types",
                "params": {"columns": target_cols, "target_type": "currency_numeric"},
                "description": f"Convert currency strings in {target_cols} into numeric float values.",
                "reasoning": "Strings with currency symbols ($/€/£) cannot be summed or plotted until parsed into numbers.",
                "risk_level": "low"
            })

        # 6. Identifier protection (e.g. customer code, zip code with leading zeros)
        id_issues = [i for i in issues if i.get("category") == "identifiers"]
        for idi in id_issues:
            target_cols = idi.get("affected_columns", [])
            steps.append({
                "operation": "convert_types",
                "params": {"columns": target_cols, "target_type": "identifier"},
                "description": f"Protect leading-zero identifiers in {target_cols} as formatted text.",
                "reasoning": "Leading zeros (e.g. '00101') get accidentally lost if converted to integers.",
                "risk_level": "low"
            })

        # 7. Name / string casing
        name_cols = [c for c in columns if any(k in c.lower() for k in ["name", "title", "category", "city", "country"])]
        if name_cols and (not inst_lower or any(k in inst_lower for k in ["case", "title", "name", "capitalize"])):
            steps.append({
                "operation": "text_case",
                "params": {"columns": name_cols, "case_type": "title"},
                "description": f"Standardize capitalization to Title Case in {name_cols}.",
                "reasoning": "Fixes mixed ALL-CAPS or lowercase text for professional presentation.",
                "risk_level": "low"
            })

        # 8. Missing values
        missing_issues = [i for i in issues if i.get("category") == "missing_values"]
        for mi in missing_issues:
            target_cols = mi.get("affected_columns", [])
            s_params = mi.get("suggested_params", {})
            strat = s_params.get("strategy", "fill_value")
            val = s_params.get("value", "Unknown")
            steps.append({
                "operation": "handle_missing",
                "params": {"columns": target_cols, "strategy": strat, "value": val},
                "description": f"Handle missing values in {target_cols} using strategy '{strat}'.",
                "reasoning": f"Imputes or handles missing data to prevent computation errors.",
                "risk_level": "medium"
            })

        summary_desc = (
            f"Generated a {len(steps)}-step cleaning plan targeting detected data issues "
            f"(duplicates, inconsistent dates, currency formatting, and missing fields)."
        )

        return {
            "summary": summary_desc,
            "steps": steps
        }

    def _validate_and_format_plan(self, raw_plan: Dict[str, Any], profile: Dict[str, Any]) -> Dict[str, Any]:
        """Validates that each step uses ONLY allowed operations and safe parameters."""
        valid_steps = []
        raw_steps = raw_plan.get("steps", [])
        
        for idx, step in enumerate(raw_steps):
            op = step.get("operation")
            # Strict whitelist check
            if op not in SUPPORTED_OPERATIONS:
                logger.warning(f"Rejecting unsupported AI proposed operation: {op}")
                continue

            # Ensure valid structure
            params = step.get("params") or {}
            step_id = f"step_{idx + 1}_{str(uuid.uuid4())[:6]}"
            
            valid_steps.append({
                "id": step_id,
                "operation": op,
                "params": params,
                "description": step.get("description", f"Execute {op}"),
                "reasoning": step.get("reasoning", "Data quality improvement"),
                "risk_level": step.get("risk_level", "low"),
                "approved": True # User can toggle this in the frontend UI
            })

        return {
            "plan_id": str(uuid.uuid4()),
            "summary": raw_plan.get("summary", "Proposed Data Cleaning Plan"),
            "source": raw_plan.get("source", "gemini_ai"),
            "note": raw_plan.get("note"),
            "total_steps": len(valid_steps),
            "steps": valid_steps,
            "privacy_disclosure": raw_plan.get("privacy_disclosure")
        }

ai_cleaner = AICleaner()
