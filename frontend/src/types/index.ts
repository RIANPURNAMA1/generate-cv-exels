export type DataRow = Record<string, string>;

export interface DetectedPlaceholder {
  name: string;
  type: string; // text | number | date | dropdown | textarea | photo
  cells: string[];
  sheet: string;
  options: string[] | null;
  known: boolean;
}

export interface TemplateInfo {
  id: string;
  name: string;
  placeholders: DetectedPlaceholder[];
}

export interface Participant {
  id: string;
  data: DataRow;
  hasPhoto: boolean;
}

export interface DatasetUpload {
  id: string;
  columns: string[];
  rows: Array<DataRow & { participantId: string }>;
  participants: Array<DataRow & { participantId: string }>;
  rowCount: number;
}

export interface GenerateOptions {
  pdf: boolean;
  normalizePhone: boolean;
  autoAge: boolean;
  jpDate: boolean;
}

export interface GenerateRequest {
  templateId: string;
  participantIds: string[];
  mapping: Record<string, string>;
  options: GenerateOptions;
}

export type JobState = 'queued' | 'processing' | 'done' | 'failed' | 'expired';

export interface JobItem {
  participantName: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  warnings: string[];
  error?: string | null;
  xlsxUrl?: string | null;
  pdfUrl?: string | null;
}

export interface JobStatus {
  status: JobState;
  items: JobItem[];
  zipUrl?: string | null;
}

export type AiTask = 'katakana' | 'translate' | 'equivalent';
export type AiDecision = 'suggested' | 'accepted' | 'edited' | 'rejected';

export interface AiSuggestion {
  pid: string;
  field: string;
  original: string;
  suggested: string | null;
  warning?: string | null;
  status: AiDecision;
  finalValue?: string;
}

export interface AiJob {
  kind: 'suggest' | 'import';
  status: 'queued' | 'processing' | 'done' | 'failed';
  error?: string | null;
  result?: {
    suggestions?: AiSuggestion[];
    fields?: DataRow;
    warnings?: string[];
    hasPhoto?: boolean;
  } | null;
}

export type Severity = 'error' | 'warning';

export interface Issue {
  participantId: string;
  participantLabel: string;
  field: string | null;
  message: string;
  severity: Severity;
  current?: string;
  suggestion?: string;
  choices?: string[];
}
