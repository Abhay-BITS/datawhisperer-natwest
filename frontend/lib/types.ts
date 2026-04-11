export interface DataSource {
  source_id: string;
  name: string;
  safe_name: string;
  db_type: 'postgresql' | 'mysql' | 'sqlite' | 'csv' | 'excel';
  table_count: number;
  is_connected: boolean;
  connected_at: string;
  schema?: SourceSchema;
}

export interface SourceSchema {
  tables: Record<string, TableInfo>;
}

export interface TableInfo {
  row_count: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  pk: boolean;
  fk: string | null;
  nullable: boolean;
}

export interface Assumption {
  statement: string;
  risk: 'SAFE' | 'RISKY' | 'UNKNOWN';
  mitigation: string;
  audit_note?: string;
}

export interface TrustTraceEntry {
  agent: string;
  action: string;
  output: string;
  color: string;
  timestamp: string;
  details?: {
    // Semantic Agent
    intent?: string;
    intent_type?: string;
    sources?: string[];
    source_rationale?: string;
    metric_mappings?: Record<string, string>;
    assumptions?: { statement: string; risk: 'SAFE' | 'RISKY' | 'UNKNOWN'; mitigation?: string }[];
    // Coder Agent
    sql?: string;
    explanation?: string;
    dialect?: string;
    mode?: string;
    is_retry?: boolean;
    retry_error?: string | null;
    // Critic Agent
    checks?: { label: string; pass: boolean; note: string }[];
    is_verified?: boolean;
    row_count?: number;
    columns?: string[];
  };
}

export interface ExecutionResult {
  columns: string[];
  rows: any[][];
  row_count: number;
  truncated: boolean;
  error: string | null;
}

export interface Visualization {
  chart_type: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'none';
  x_axis: string;
  y_axis: string;
  title: string;
}

export interface ChatResponse {
  session_id: string;
  user_message: string;
  mode: string;
  insight_narrative: string;
  execution_result: ExecutionResult | null;
  visualization: Visualization;
  assumptions: Assumption[];
  trust_trace: TrustTraceEntry[];
  confidence_score: number | null;
  confidence_reasoning: string | null;
  suggested_followups: string[];
  generated_code: string;
  code_explanation: string;
  is_verified: boolean;
  verification_note: string;
  resolved_question: string;
  error?: string;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: string;
  response?: ChatResponse;
  mode?: string;
}

export interface Mode {
  value: 'quick' | 'deep' | 'compare';
  label: string;
}

export interface HistoryEntry {
  id: string;
  question: string;
  timestamp: string;
  result_type: 'chart' | 'table' | 'number' | 'error';
  response: ChatResponse;
}
