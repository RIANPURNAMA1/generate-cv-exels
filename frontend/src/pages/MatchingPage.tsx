import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AiSuggestionPanel } from '../components/AiSuggestionPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MappingTable } from '../components/MappingTable';
import { EmptyState } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useAiJob } from '../hooks/useJobPolling';
import { autoMatch, unusedColumns } from '../lib/automatch';
import { participantLabel, validateParticipants } from '../lib/validator';
import { getApi } from '../services/api';
import { useWizard } from '../state/wizard';
import type { AiSuggestion, AiTask, GenerateOptions } from '../types';

const OPTION_LABELS: Array<[keyof GenerateOptions, string]> = [
  ['jpDate', 'Format tanggal lahir Jepang (年 月 日)'],
  ['autoAge', 'Hitung usia otomatis dari tanggal lahir'],
  ['normalizePhone', 'Normalisasi No. HP ke (+62)8xxx'],
  ['pdf', 'Buat juga PDF (A4, 1 halaman)'],
];

export function MatchingPage() {
  const { state, dispatch } = useWizard();
  const toast = useToast();
  const nav = useNavigate();
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const placeholders = useMemo(() => state.template?.placeholders ?? [], [state.template]);

  // Auto-match: hanya mengisi placeholder yang belum dipetakan.
  useEffect(() => {
    const auto = autoMatch(placeholders, state.columns);
    const merged = { ...auto, ...state.mapping };
    if (JSON.stringify(merged) !== JSON.stringify(state.mapping)) dispatch({ type: 'SET_MAPPING', mapping: merged });
  }, [placeholders, state.columns, state.mapping, dispatch]);

  const issues = useMemo(
    () => validateParticipants(state.participants, { placeholders, mapping: state.mapping, options: state.options }),
    [state.participants, placeholders, state.mapping, state.options],
  );
  const hasErrors = issues.some((i) => i.severity === 'error');
  const unused = unusedColumns(state.columns, state.mapping, placeholders);

  // AI
  const aiStatus = useQuery({ queryKey: ['ai-status'], queryFn: () => getApi().aiStatus() });
  const aiJob = useAiJob(aiJobId);
  const startAi = useMutation({
    mutationFn: (tasks: AiTask[]) => getApi().startAiSuggest(state.participants.map((p) => p.id), tasks),
    onSuccess: (r) => setAiJobId(r.jobId),
    onError: (e: Error) => toast.push(e.message, 'error'),
  });
  useEffect(() => {
    if (aiJob.data?.status === 'done' && aiJob.data.result?.suggestions) {
      dispatch({ type: 'SET_AI', ai: aiJob.data.result.suggestions.map((s) => ({ ...s, status: 'suggested' as const })) });
      setAiJobId(null);
    }
  }, [aiJob.data, dispatch]);

  const decide = (s: AiSuggestion, status: AiSuggestion['status'], value?: string) => {
    if ((status === 'accepted' || status === 'edited') && value !== undefined) {
      dispatch({ type: 'UPDATE_FIELD', id: s.pid, field: state.mapping[s.field] ?? s.field, value });
    }
    dispatch({ type: 'DECIDE_AI', pid: s.pid, field: s.field, status, ...(value !== undefined ? { finalValue: value } : {}) });
  };

  const generate = useMutation({
    mutationFn: async () => {
      const api = getApi();
      await Promise.all(state.dirty.map((id) => {
        const p = state.participants.find((x) => x.id === id);
        return p ? api.updateParticipant(id, p.data) : Promise.resolve();
      }));
      dispatch({ type: 'CLEAN_DIRTY' });
      return api.generate({
        templateId: state.template?.id ?? '',
        participantIds: state.participants.map((p) => p.id),
        mapping: state.mapping,
        options: state.options,
      });
    },
    onSuccess: (r) => {
      dispatch({ type: 'SET_JOB', jobId: r.jobId });
      nav('/result');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  if (!state.template || state.participants.length === 0) {
    return (
      <EmptyState title="Template atau data peserta belum lengkap" hint="Selesaikan langkah 1 dan 2 dulu." />
    );
  }

  const pending = state.ai.filter((s) => s.status === 'suggested' && s.suggested !== null).length;
  const labelOf = (pid: string) => {
    const p = state.participants.find((x) => x.id === pid);
    return p ? participantLabel(p, state.mapping) : pid.slice(0, 6);
  };
  const run = () => (pending > 0 ? setConfirmPending(true) : generate.mutate());

  return (
    <div className="space-y-6">
      <section className="card space-y-3" aria-labelledby="m-map">
        <h2 id="m-map" className="text-base font-semibold text-navy">Langkah 3 · Pencocokan</h2>
        <MappingTable placeholders={placeholders} columns={state.columns} mapping={state.mapping} onChange={(ph, col) => {
          const next = { ...state.mapping };
          if (col) next[ph] = col; else delete next[ph];
          dispatch({ type: 'SET_MAPPING', mapping: next });
        }} />
        {unused.length > 0 && <p className="text-xs text-slate-600"><span className="badge mr-1 bg-slate-100 text-slate-700">Tidak terpakai</span>{unused.join(', ')}</p>}
      </section>

      <section className="card space-y-2" aria-labelledby="m-opt">
        <h2 id="m-opt" className="text-base font-semibold text-navy">Opsi pemrosesan</h2>
        {OPTION_LABELS.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={state.options[k]} onChange={(e) => dispatch({ type: 'SET_OPTION', key: k, value: e.target.checked })} />
            {label}
          </label>
        ))}
      </section>

      <section className="card space-y-3" aria-labelledby="m-val">
        <h2 id="m-val" className="text-base font-semibold text-navy">Validasi</h2>
        <ValidationBlock issues={issues} onFix={(pid, field, value) => dispatch({ type: 'UPDATE_FIELD', id: pid, field: state.mapping[field] ?? field, value })} />
      </section>

      <section className="card space-y-3" aria-labelledby="m-ai">
        <h2 id="m-ai" className="text-base font-semibold text-navy">Saran AI (opsional)</h2>
        <AiSuggestionPanel
          enabled={!!aiStatus.data?.enabled}
          busy={startAi.isPending || (!!aiJobId && aiJob.data?.status !== 'failed')}
          error={aiJob.data?.status === 'failed' ? aiJob.data.error ?? 'Saran AI gagal.' : null}
          suggestions={state.ai}
          labelOf={labelOf}
          onRequest={(t) => startAi.mutate(t)}
          onDecide={decide}
        />
      </section>

      <div className="flex items-center justify-between">
        <Link to="/data" className="btn-secondary">← Kembali</Link>
        <div className="text-right">
          {hasErrors && <p role="alert" className="mb-1 text-xs text-red-700">Perbaiki galat validasi terlebih dahulu.</p>}
          <button type="button" className="btn-primary" disabled={hasErrors || generate.isPending} onClick={run}>{generate.isPending ? 'Memulai…' : `Buat CV (${state.participants.length})`}</button>
        </div>
      </div>

      <ConfirmDialog open={confirmPending} title="Ada saran AI yang belum diputuskan" onCancel={() => setConfirmPending(false)} onConfirm={() => { setConfirmPending(false); generate.mutate(); }}>
        {pending} saran masih berstatus “Disarankan AI”. Saran yang belum diterima tidak dipakai; data asli yang akan masuk ke CV. Lanjutkan?
      </ConfirmDialog>
    </div>
  );
}

import { ValidationPanel } from '../components/ValidationPanel';
import type { Issue } from '../types';
function ValidationBlock({ issues, onFix }: { issues: Issue[]; onFix: (pid: string, field: string, value: string) => void }) {
  return <ValidationPanel issues={issues} onFix={onFix} />;
}
