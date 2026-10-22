import * as XLSX from 'xlsx';
import type { AiJob, AiProviderId, AiSettingsInput, AiStatus, AiTask, DataRow, DatasetUpload, GenerateRequest, JobItem, JobStatus, TemplateInfo } from '../types';
import { parseTemplateFile, readFileBuffer } from '../lib/placeholders';
import { type Api } from './types';

/** Mode MOCK (VITE_USE_MOCK=true): semua data di memori, tanpa server. Untuk pengembangan dan tes. */
interface MockJob {
  req: GenerateRequest;
  polls: number;
  items: JobItem[];
}

const MOCK_PROVIDERS: Array<{ id: AiProviderId; label: string; model: string; models: string[]; nativePdf: boolean }> = [
  { id: 'claude', label: 'Claude (Anthropic)', model: 'claude-sonnet-5-5', models: ['claude-sonnet-5-5', 'claude-opus-4-1', 'claude-haiku-4-5'], nativePdf: true },
  { id: 'openai', label: 'GPT (OpenAI)', model: 'gpt-4o-mini', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'], nativePdf: false },
  { id: 'gemini', label: 'Gemini (Google)', model: 'gemini-2.0-flash', models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'], nativePdf: true },
];

const store = {
  templates: new Map<string, TemplateInfo>(),
  participants: new Map<string, DataRow>(),
  jobs: new Map<string, MockJob>(),
  ai: new Map<string, AiJob>(),
  aiProvider: 'claude' as AiProviderId,
  aiModel: '',
  aiEnabled: true,
  aiKeys: new Set<AiProviderId>(['claude']),
  seq: 0,
};

function mockAiStatus(): AiStatus {
  const providers = MOCK_PROVIDERS.map((p) => ({
    ...p,
    hasKey: store.aiKeys.has(p.id),
    model: p.id === store.aiProvider && store.aiModel ? store.aiModel : p.model,
  }));
  const active = providers.find((p) => p.id === store.aiProvider) ?? providers[0]!;
  const enabled = store.aiEnabled && active.hasKey;
  return {
    enabled,
    provider: active.id,
    providerLabel: active.label,
    model: active.model,
    providers,
    reason: enabled ? null : store.aiEnabled ? `Kunci API untuk ${active.label} belum diatur.` : 'Langkah AI dimatikan pada pengaturan aplikasi.',
  };
}

const id = (p: string) => `${p}-${(++store.seq).toString(16).padStart(8, '0')}-mock`;

export function resetMock(): void {
  store.templates.clear();
  store.participants.clear();
  store.jobs.clear();
  store.ai.clear();
  store.aiProvider = 'claude';
  store.aiModel = '';
  store.aiEnabled = true;
  store.aiKeys = new Set<AiProviderId>(['claude']);
  store.seq = 0;
}

function rowsToWorkbookUrl(data: DataRow): string {
  const ws = XLSX.utils.aoa_to_sheet([['Kolom', 'Nilai'], ...Object.entries(data)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CV');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return URL.createObjectURL(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

export const mockApi: Api = {
  async listTemplates() {
    return Array.from(store.templates.values());
  },
  async uploadTemplate(file) {
    const placeholders = await parseTemplateFile(file);
    const t: TemplateInfo = { id: id('tpl'), name: file.name.replace(/\.xlsx$/i, ''), placeholders };
    store.templates.set(t.id, t);
    return t;
  },
  async renameTemplate(tid, name) {
    const t = store.templates.get(tid);
    if (t) t.name = name;
  },
  async deleteTemplate(tid) {
    store.templates.delete(tid);
  },
  async downloadSampleTemplate() {
    /* tidak ada berkas di mode MOCK */
  },
  async downloadSampleData() {
    /* tidak ada berkas di mode MOCK */
  },

  async uploadDataset(file): Promise<DatasetUpload> {
    const wb = XLSX.read(await readFileBuffer(file), { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0] ?? ''];
    const rows = ws ? XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false }) : [];
    const columns = rows[0] ? Object.keys(rows[0]) : [];
    const participants = rows.slice(0, 500).map((r) => {
      const pid = id('p');
      const data: DataRow = {};
      for (const [k, v] of Object.entries(r)) data[k] = String(v ?? '').trim();
      store.participants.set(pid, data);
      return { participantId: pid, ...data };
    });
    return { id: id('ds'), columns, rows: participants.slice(0, 20), participants, rowCount: participants.length };
  },
  async createParticipant(data) {
    const pid = id('p');
    store.participants.set(pid, { ...data });
    return { id: pid };
  },
  async updateParticipant(pid, data) {
    store.participants.set(pid, { ...data });
  },
  async deleteParticipant(pid) {
    store.participants.delete(pid);
  },
  async purgeSession() {
    store.participants.clear();
    store.jobs.clear();
    store.ai.clear();
  },

  async aiStatus() {
    return mockAiStatus();
  },
  async updateAiSettings(input: AiSettingsInput) {
    if (input.provider) {
      store.aiProvider = input.provider;
      store.aiModel = '';
    }
    if (typeof input.model === 'string') store.aiModel = input.model;
    if (typeof input.enabled === 'boolean') store.aiEnabled = input.enabled;
    if (input.apiKey) store.aiKeys.add(store.aiProvider);
    return mockAiStatus();
  },
  async startAiSuggest(pids: string[], tasks: AiTask[]) {
    const jid = id('ai');
    const suggestions = pids.flatMap((pid) => {
      const d = store.participants.get(pid) ?? {};
      const out: NonNullable<NonNullable<AiJob['result']>['suggestions']> = [];
      if (tasks.includes('katakana') && d.nama_romaji) {
        out.push({ pid, field: 'nama_katakana', original: d.nama_katakana ?? '', suggested: `[MOCK] ${d.nama_romaji}`, status: 'suggested' });
      }
      return out;
    });
    store.ai.set(jid, { kind: 'suggest', status: 'done', result: { suggestions } });
    return { jobId: jid };
  },
  async getAiJob(jid) {
    return store.ai.get(jid) ?? { kind: 'suggest', status: 'failed', error: 'Tugas tidak ditemukan.' };
  },
  async importPdf() {
    const jid = id('ai');
    store.ai.set(jid, { kind: 'import', status: 'done', result: { fields: { nama_romaji: 'CONTOH MOCK' }, warnings: ['Data contoh (mode MOCK).'], hasPhoto: false } });
    return { jobId: jid };
  },
  importPhotoUrl: () => '',
  async fetchImportPhoto() {
    return null;
  },

  async generate(req) {
    const jid = id('job');
    const items: JobItem[] = req.participantIds.map((pid) => {
      const d = store.participants.get(pid) ?? {};
      const name = (d[req.mapping.nama_romaji ?? 'nama_romaji'] ?? '').toUpperCase() || 'CV';
      const warnings: string[] = [];
      if (!d.nama_romaji) warnings.push('Nama kosong.');
      return {
        participantName: name,
        status: 'done',
        warnings,
        xlsxUrl: rowsToWorkbookUrl(d),
        pdfUrl: req.options.pdf ? rowsToWorkbookUrl(d) : null,
      };
    });
    store.jobs.set(jid, { req, polls: 0, items });
    return { jobId: jid };
  },
  async getJob(jid): Promise<JobStatus> {
    const j = store.jobs.get(jid);
    if (!j) return { status: 'failed', items: [] };
    j.polls += 1;
    if (j.polls < 2) {
      return { status: 'processing', items: j.items.map((i) => ({ ...i, status: 'processing', xlsxUrl: null, pdfUrl: null })) };
    }
    return { status: 'done', items: j.items, zipUrl: j.items.length > 1 ? rowsToWorkbookUrl({ info: 'ZIP (MOCK)' }) : null };
  },
};
