import type {
  AiJob, AiSettingsInput, AiStatus, AiTask, DataRow, DatasetUpload, GenerateRequest, JobStatus, TemplateInfo,
} from '../types';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface Api {
  listTemplates(): Promise<TemplateInfo[]>;
  uploadTemplate(file: File): Promise<TemplateInfo>;
  renameTemplate(id: string, name: string): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  downloadSampleTemplate(): Promise<void>;
  downloadSampleData(templateId: string): Promise<void>;

  uploadDataset(file: File): Promise<DatasetUpload>;
  createParticipant(data: DataRow, photo?: Blob | null, importId?: string | null): Promise<{ id: string }>;
  updateParticipant(id: string, data: DataRow, photo?: Blob | null): Promise<void>;
  deleteParticipant(id: string): Promise<void>;
  purgeSession(): Promise<void>;

  aiStatus(): Promise<AiStatus>;
  updateAiSettings(input: AiSettingsInput): Promise<AiStatus>;
  startAiSuggest(participantIds: string[], tasks: AiTask[]): Promise<{ jobId: string }>;
  getAiJob(id: string): Promise<AiJob>;
  importPdf(file: File): Promise<{ jobId: string }>;
  importPhotoUrl(jobId: string): string;
  fetchImportPhoto(jobId: string): Promise<string | null>;

  generate(req: GenerateRequest): Promise<{ jobId: string }>;
  getJob(id: string): Promise<JobStatus>;
}

export const POLL_MS = import.meta.env.MODE === 'test' ? 40 : 1500;
