import * as XLSX from 'xlsx';
import type { AiJob, AiTask, DataRow, DatasetUpload, GenerateRequest, JobItem, JobStatus, TemplateInfo } from '../types';
import { parseTemplateFile, readFileBuffer } from '../lib/placeholders';
import { type Api } from './types';

/** Mode MOCK (VITE_USE_MOCK=true): semua data di memori, tanpa server. Untuk pengembangan dan tes. */
interface MockJob {
  req: GenerateRequest;
  polls: number;
  items: JobItem[];
}

const store = {
  templates: new Map<string, TemplateInfo>(),
  participants: new Map<string, DataRow>(),
  jobs: new Map<string, MockJob>(),
  ai: new Map<string, AiJob>(),
  seq: 0,
};

const id = (p: string) => `${p}-${(++store.seq).toString(16).padStart(8, '0')}-mock`;

export function resetMock(): void {
  store.templates.clear();
  store.participants.clear();
  store.jobs.clear();
  store.ai.clear();
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
    return { enabled: true };
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
