export interface ColumnProfile {
  name: string;
  inferred_type: string;
  dtype: string;
  total_count: number;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  sample_values: string[];
}

export interface DetectedIssue {
  id: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  affected_columns: string[];
  suggested_action: string;
  suggested_params: Record<string, any>;
}

export interface DiffSummary {
  original_rows: number;
  cleaned_rows: number;
  rows_removed: number;
  original_cols: number;
  cleaned_cols: number;
  cols_delta: number;
  original_missing: number;
  cleaned_missing: number;
  missing_resolved: number;
  original_duplicates: number;
  cleaned_duplicates: number;
  duplicates_removed: number;
  original_quality_score: number;
  cleaned_quality_score: number;
  quality_score_improvement: number;
  changed_cells_count: number;
}

export interface AppliedOperation {
  step_number: number;
  timestamp: string;
  operation: string;
  params: Record<string, any>;
  detail: {
    description?: string;
    rows_removed?: number;
    cells_affected?: number;
    columns_renamed?: number;
    [key: string]: any;
  };
  ai_reasoning?: string;
}

export interface DatasetPreview {
  session_id: string;
  filename: string;
  file_size: number;
  file_format: string;
  created_at: number;
  row_count: number;
  column_count: number;
  duplicate_rows: number;
  total_missing_cells: number;
  missing_pct: number;
  quality_score: number;
  columns: ColumnProfile[];
  issues: DetectedIssue[];
  preview_rows: Record<string, any>[];
  raw_preview_rows?: Record<string, any>[];
  applied_operations: AppliedOperation[];
  diff_summary: DiffSummary;
  retention_policy: string;
}

export interface AIStep {
  id: string;
  operation: string;
  params: Record<string, any>;
  description: string;
  reasoning: string;
  risk_level: 'low' | 'medium' | 'high';
  approved: boolean;
}

export interface AIPlan {
  plan_id: string;
  summary: string;
  source: string;
  note?: string;
  total_steps: number;
  steps: AIStep[];
  privacy_disclosure?: string;
}

export interface CleaningRecipe {
  _id: string;
  name: string;
  description: string;
  is_preset?: boolean;
  operations: { operation: string; params: Record<string, any> }[];
  created_at?: string;
}

export interface HistoryItem {
  _id: string;
  session_id: string;
  filename: string;
  file_size: number;
  created_at: string;
  operations_count: number;
  operations_summary: { op: string; desc: string }[];
  result_metrics: DiffSummary;
}

export interface AuditReport {
  session_id: string;
  filename: string;
  timestamp: string;
  initial_stats: {
    row_count: number;
    column_count: number;
    duplicate_rows: number;
    total_missing_cells: number;
    quality_score: number;
    columns: ColumnProfile[];
  };
  final_stats: {
    row_count: number;
    column_count: number;
    duplicate_rows: number;
    total_missing_cells: number;
    quality_score: number;
    columns: ColumnProfile[];
  };
  operations_executed: AppliedOperation[];
  diff_summary: DiffSummary;
  retention_policy: string;
}

export interface HealthStatus {
  status: string;
  app_name: string;
  version: string;
  timestamp: string;
  database: {
    is_connected: boolean;
    status: string;
    error?: string;
    database_name?: string;
    cluster_info?: string;
    last_tested_at?: string;
    mode: string;
  };
  ai_engine: {
    is_configured: boolean;
    model: string;
    provider: string;
    privacy_disclosure: string;
  };
  storage: {
    mode: string;
    retention_ttl_minutes: number;
    max_file_size_mb: number;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}
