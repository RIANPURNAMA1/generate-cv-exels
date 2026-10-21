import type { AiJob, AiTask, DataRow, DatasetUpload, GenerateRequest, JobStatus, TemplateInfo } from '../types';
import { ApiError, type Api } from './types';

const BASE = '/api';

async function request<T>(path: string, init: RequestInit = {}, raw = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0);
  }
  if (!res.ok) {
    let msg = `Permintaan gagal (${res.status}).`;
    try {
      const j = (await res.json()) as { message?: string; errors?: Record<string, string[]> };
      const first = j.errors ? Object.values(j.errors)[0]?.[0] : undefined;
      msg = first ?? j.message ?? msg;
    } catch {
      /* abaikan */
    }
    throw new ApiError(msg, res.status);
  }
  if (raw || res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function json(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

async function saveBlob(path: string, filename: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new ApiError('Unduhan gagal.', res.status);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function participantForm(data: DataRow, photo?: Blob | null, importId?: string | null): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(`data[${k}]`, v);
  if (photo) fd.append('foto', photo, 'foto.jpg');
  if (importId) fd.append('importId', importId);
  return fd;
}

export const realApi: Api = {
  listTemplates: () => request<TemplateInfo[]>('/templates'),
  async uploadTemplate(file) {
    const fd = new FormData();
    fd.append('file', file);
    return request<TemplateInfo>('/templates', { method: 'POST', body: fd });
  },
  async renameTemplate(id, name) {
    await request<void>(`/templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }, true);
  },
  async deleteTemplate(id) {
    await request<void>(`/templates/${id}`, { method: 'DELETE' }, true);
  },
  downloadSampleTemplate: () => saveBlob('/sample-template', 'template_cv_placeholder.xlsx'),
  downloadSampleData: (id) => saveBlob(`/templates/${id}/download-sample-data`, 'contoh_data_peserta.csv'),

  async uploadDataset(file) {
    const fd = new FormData();
    fd.append('file', file);
    return request<DatasetUpload>('/datasets', { method: 'POST', body: fd });
  },
  createParticipant: (data, photo, importId) => request<{ id: string }>('/participants', { method: 'POST', body: participantForm(data, photo, importId) }),
  async updateParticipant(id, data, photo) {
    // PUT multipart tidak terbaca PHP; gunakan POST + _method.
    const fd = participantForm(data, photo);
    fd.append('_method', 'PUT');
    await request<unknown>(`/participants/${id}`, { method: 'POST', body: fd });
  },
  async deleteParticipant(id) {
    await request<void>(`/participants/${id}`, { method: 'DELETE' }, true);
  },
  async purgeSession() {
    await request<void>('/session', { method: 'DELETE' }, true);
  },

  aiStatus: () => request<{ enabled: boolean }>('/ai/status'),
  startAiSuggest: (participantIds: string[], tasks: AiTask[]) => request<{ jobId: string }>('/ai/suggest', json({ participantIds, tasks })),
  getAiJob: (id) => request<AiJob>(`/ai/jobs/${id}`),
  async importPdf(file) {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ jobId: string }>('/imports/pdf', { method: 'POST', body: fd });
  },
  importPhotoUrl: (jobId) => `${BASE}/ai/jobs/${jobId}/photo`,
  async fetchImportPhoto(jobId) {
    const res = await fetch(`${BASE}/ai/jobs/${jobId}/photo`);
    return res.ok ? URL.createObjectURL(await res.blob()) : null;
  },

  generate: (req: GenerateRequest) => request<{ jobId: string }>('/generate', json(req)),
  getJob: (id) => request<JobStatus>(`/jobs/${id}`),
};
