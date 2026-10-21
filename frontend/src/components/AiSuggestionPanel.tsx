import { useState } from 'react';
import type { AiSuggestion, AiTask } from '../types';
import { EmptyState } from './Skeleton';

const TASKS: Array<{ id: AiTask; label: string }> = [
  { id: 'katakana', label: 'Katakana (nama, tempat lahir, nama keluarga)' },
  { id: 'translate', label: 'Terjemahan Jepang (informasi personal)' },
  { id: 'equivalent', label: 'Padanan Jepang (pekerjaan, jurusan)' },
];

interface Props {
  enabled: boolean;
  busy: boolean;
  error?: string | null;
  suggestions: AiSuggestion[];
  labelOf: (pid: string) => string;
  onRequest: (tasks: AiTask[]) => void;
  onDecide: (s: AiSuggestion, status: AiSuggestion['status'], value?: string) => void;
}

function Row({ s, onDecide }: { s: AiSuggestion; onDecide: Props['onDecide'] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.suggested ?? '');
  const statusText = { suggested: 'Menunggu keputusan', accepted: 'Diterima', edited: 'Diedit & diterima', rejected: 'Ditolak' }[s.status];
  return (
    <li className="rounded-md border border-slate-200 p-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <code className="text-xs">{s.field}</code>
        <span className="badge bg-gold/20 text-navy">Disarankan AI</span>
        <span className="text-xs text-slate-500">{statusText}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">Asli: {s.original || '(kosong)'}</p>
      {editing ? (
        <div className="mt-1 flex gap-2">
          <label className="sr-only" htmlFor={`ai-${s.pid}-${s.field}`}>Edit saran {s.field}</label>
          <input id={`ai-${s.pid}-${s.field}`} className="input py-1" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button type="button" className="btn-primary py-1" onClick={() => { onDecide(s, 'edited', draft); setEditing(false); }}>Simpan</button>
        </div>
      ) : (
        <p className="mt-1">{s.finalValue ?? s.suggested ?? <em className="text-slate-400">Tidak ada saran valid</em>}</p>
      )}
      {s.warning && <p className="mt-1 text-xs text-amber-800">{s.warning}</p>}
      {s.suggested !== null && !editing && (
        <div className="mt-2 flex gap-2">
          <button type="button" className="btn-secondary py-1" onClick={() => onDecide(s, 'accepted', s.suggested ?? '')}>Terima</button>
          <button type="button" className="btn-secondary py-1" onClick={() => { setDraft(s.finalValue ?? s.suggested ?? ''); setEditing(true); }}>Edit</button>
          <button type="button" className="btn-danger py-1" onClick={() => onDecide(s, 'rejected')}>Tolak</button>
        </div>
      )}
    </li>
  );
}

export function AiSuggestionPanel({ enabled, busy, error, suggestions, labelOf, onRequest, onDecide }: Props) {
  const [tasks, setTasks] = useState<AiTask[]>(['katakana', 'translate']);
  if (!enabled) {
    return <EmptyState title="Langkah AI belum diaktifkan" hint="Isi ANTHROPIC_API_KEY di server untuk memakai saran katakana dan terjemahan Jepang." />;
  }
  const byPerson = new Map<string, AiSuggestion[]>();
  for (const s of suggestions) byPerson.set(s.pid, [...(byPerson.get(s.pid) ?? []), s]);
  const pending = suggestions.filter((s) => s.status === 'suggested' && s.suggested !== null).length;

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">Tugas AI</legend>
        <div className="space-y-1">
          {TASKS.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={tasks.includes(t.id)} onChange={(e) => setTasks((xs) => (e.target.checked ? [...xs, t.id] : xs.filter((x) => x !== t.id)))} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="button" className="btn-primary" disabled={busy || tasks.length === 0} onClick={() => onRequest(tasks)}>
        {busy ? 'Meminta saran…' : 'Minta saran AI'}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {suggestions.length > 0 && (
        <>
          <p className="text-xs text-slate-600">{pending} saran menunggu keputusan. Saran yang belum diterima tidak dipakai saat CV dibuat.</p>
          {Array.from(byPerson.entries()).map(([pid, list]) => (
            <section key={pid} aria-label={`Saran untuk ${labelOf(pid)}`}>
              <h4 className="mb-1 text-sm font-semibold text-navy">{labelOf(pid)}</h4>
              <ul className="space-y-2">{list.map((s) => <Row key={s.field} s={s} onDecide={onDecide} />)}</ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
