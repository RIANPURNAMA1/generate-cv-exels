import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AiProviderSwitch, useAiSettings } from '../components/AiSettingsDialog';
import { DataPreviewTable } from '../components/DataPreviewTable';
import { Dropzone } from '../components/Dropzone';
import { useFooterAction } from '../components/FooterBar';
import { Icon } from '../components/Icon';
import { ParticipantForm } from '../components/ParticipantForm';
import { PhotoCropper } from '../components/PhotoCropper';
import { EmptyState, Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { dropdownChoicesFor, participantLabel } from '../lib/validator';
import { useAiJob } from '../hooks/useJobPolling';
import { getApi } from '../services/api';
import { useWizard } from '../state/wizard';
import type { AiStatus, DataRow, Participant } from '../types';

type Tab = 'upload' | 'manual' | 'pdf';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'upload', label: 'Upload Excel/CSV' },
  { id: 'manual', label: 'Input manual' },
  { id: 'pdf', label: 'Impor dari PDF (AI)' },
];

function useOptionsFor() {
  const { state } = useWizard();
  return (field: string): string[] | null => {
    const ph = state.template?.placeholders.find((p) => p.name === field);
    return dropdownChoicesFor(field, ph?.options ?? null);
  };
}

function UploadTab() {
  const { state, dispatch } = useWizard();
  const toast = useToast();
  const [lastColumns, setLastColumns] = useState<string[]>([]);
  const [lastRows, setLastRows] = useState<DataRow[]>([]);

  const up = useMutation({
    mutationFn: (f: File) => getApi().uploadDataset(f),
    onSuccess: (r) => {
      for (const row of r.participants) {
        const { participantId, ...data } = row;
        dispatch({ type: 'ADD_PARTICIPANT', participant: { id: participantId, data, hasPhoto: false } });
      }
      setLastColumns(r.columns);
      setLastRows(r.rows.map(({ participantId: _id, ...d }) => d));
      toast.push(`${r.rowCount} peserta dimuat.`, 'success');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  return (
    <div className="space-y-3">
      <Dropzone accept=".xlsx,.csv" label="Upload data peserta (.xlsx / .csv)" hint="Satu baris per peserta, baris pertama berisi nama kolom. Maks 500 baris." notes={['Excel (.xlsx)', 'CSV (.csv)', 'Maks 500 baris']} busy={up.isPending} onFile={(f) => up.mutate(f)} />
      {up.isPending ? <Skeleton lines={4} /> : <DataPreviewTable columns={lastColumns.length ? lastColumns : state.columns} rows={lastRows.length ? lastRows : state.participants.map((p) => p.data)} />}
    </div>
  );
}

function ManualTab() {
  const { dispatch } = useWizard();
  const toast = useToast();
  const optionsFor = useOptionsFor();
  return (
    <ParticipantForm
      optionsFor={optionsFor}
      onSubmit={async (data, photo) => {
        try {
          const { id } = await getApi().createParticipant(data, photo);
          dispatch({ type: 'ADD_PARTICIPANT', participant: { id, data, hasPhoto: !!photo } });
          toast.push('Peserta disimpan.', 'success');
        } catch (e) {
          toast.push(e instanceof Error ? e.message : 'Gagal menyimpan peserta.', 'error');
          throw e;
        }
      }}
    />
  );
}

function PdfTab() {
  const { dispatch } = useWizard();
  const toast = useToast();
  const optionsFor = useOptionsFor();
  const aiDialog = useAiSettings();
  const status = useQuery<AiStatus>({ queryKey: ['ai-status'], queryFn: () => getApi().aiStatus() });
  const [jobId, setJobId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const job = useAiJob(jobId);

  const start = useMutation({
    mutationFn: (f: File) => getApi().importPdf(f),
    onSuccess: (r) => { setPhotoUrl(null); setJobId(r.jobId); },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const done = job.data?.status === 'done' ? job.data : null;
  useEffect(() => {
    if (jobId && done?.result?.hasPhoto) void getApi().fetchImportPhoto(jobId).then(setPhotoUrl);
  }, [jobId, done?.result?.hasPhoto]);

  if (status.isLoading) return <Skeleton lines={2} />;

  return (
    <div className="space-y-3">
      <AiProviderSwitch />
      {!status.data?.enabled && (
        <div className="banner-warning flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">
            <strong className="font-semibold">Langkah AI belum aktif.</strong>{' '}
            {status.data?.reason ?? 'Kunci API belum diatur.'} Aktifkan dengan menambah kunci API untuk penyedia pilihan.
          </span>
          <button type="button" className="btn-primary btn-sm" onClick={() => aiDialog.setOpen(true)}>
            <Icon name="key" className="h-4 w-4" />
            Atur AI
          </button>
        </div>
      )}
      <Dropzone accept=".pdf" label="Upload PDF CV lama" hint="Maks 15 MB. Hasil ditampilkan sebagai form yang bisa diedit sebelum dipakai." notes={['PDF', 'Maks 15 MB', 'Ekstraksi AI']} disabled={!status.data?.enabled} busy={start.isPending || (!!jobId && !done && job.data?.status !== 'failed')} onFile={(f) => start.mutate(f)} />
      {job.data?.status === 'failed' && <p role="alert" className="text-sm text-google-red">{job.data.error ?? 'Impor gagal.'}</p>}
      {done && (
        <div className="space-y-3">
          <p className="text-sm"><span className="badge mr-2 bg-google-yellow-surface text-google-yellow-hover">Disarankan AI</span>Periksa dan perbaiki hasil ekstraksi sebelum menyimpan.</p>
          {(done.result?.warnings ?? []).length > 0 && <ul className="list-disc pl-5 text-xs text-google-gray-600">{(done.result?.warnings ?? []).map((w) => <li key={w}>{w}</li>)}</ul>}
          <ParticipantForm
            key={jobId}
            initial={done.result?.fields ?? {}}
            initialPhotoUrl={photoUrl}
            optionsFor={optionsFor}
            onSubmit={async (data, photo) => {
              const hasImported = !!done.result?.hasPhoto && !photo;
              const { id } = await getApi().createParticipant(data, photo, hasImported ? jobId : null);
              dispatch({ type: 'ADD_PARTICIPANT', participant: { id, data, hasPhoto: !!photo || hasImported } });
              toast.push('Peserta dari PDF disimpan.', 'success');
              setJobId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ParticipantRow({ p }: { p: Participant }) {
  const { state, dispatch } = useWizard();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: () => getApi().deleteParticipant(p.id),
    onSuccess: () => dispatch({ type: 'REMOVE_PARTICIPANT', id: p.id }),
    onError: (e: Error) => toast.push(e.message, 'error'),
  });
  const attach = useMutation({
    mutationFn: (blob: Blob) => getApi().updateParticipant(p.id, p.data, blob),
    onSuccess: () => {
      dispatch({ type: 'SET_HAS_PHOTO', id: p.id, hasPhoto: true });
      toast.push('Foto dipasang.', 'success');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });
  const label = participantLabel(p, state.mapping);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <span>{label} <span className={`badge ml-1 ${p.hasPhoto ? 'bg-google-green-surface text-google-green-hover' : 'bg-google-yellow-surface text-google-yellow-hover'}`}>{p.hasPhoto ? 'Foto ada' : 'Tanpa foto'}</span></span>
      <span className="flex items-center gap-2">
        <details>
          <summary className="cursor-pointer text-xs font-medium text-google-blue hover:underline">Foto</summary>
          <div className="absolute z-10 mt-1 rounded-inner border border-slate-200 bg-white p-3 shadow-card-hover">
            <PhotoCropper onChange={(b) => b && attach.mutate(b)} />
          </div>
        </details>
        <button type="button" className="btn-danger py-1" onClick={() => remove.mutate()}>Hapus</button>
      </span>
    </li>
  );
}

export function DataPage() {
  const { state } = useWizard();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('upload');

  useFooterAction(
    <button type="button" className="btn-primary" disabled={!state.template || state.participants.length === 0} onClick={() => nav('/matching')}>
      Lanjut ke pencocokan
      <Icon name="arrow-right" className="h-4 w-4" />
    </button>,
    [state.template, state.participants.length, nav],
  );

  if (!state.template) {
    return <EmptyState title="Pilih template dulu" hint="Kembali ke langkah 1 untuk meng-upload template." />;
  }
  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-6" aria-labelledby="d-title">
        <p className="text-xs font-semibold tracking-wide text-google-blue">Langkah 2 · Data peserta</p>
        <h2 id="d-title" className="text-lg font-semibold text-google-gray-900">Data peserta</h2>
        <div role="tablist" aria-label="Sumber data" className="flex flex-wrap gap-2 border-b border-slate-200">
          {TABS.map((t) => (
            <button key={t.id} role="tab" type="button" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
              className={`-mb-px rounded-t-md border px-3 py-2 text-sm transition-colors ${tab === t.id ? 'border-slate-200 border-b-white bg-white font-semibold text-google-blue' : 'border-transparent text-google-gray-600 hover:bg-google-gray-50 hover:text-google-gray-900'}`}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'upload' && <UploadTab />}
          {tab === 'manual' && <ManualTab />}
          {tab === 'pdf' && <PdfTab />}
        </div>
      </section>

      <section className="card p-6" aria-labelledby="d-list">
        <h2 id="d-list" className="mb-3 text-base font-semibold text-google-gray-900">Peserta ({state.participants.length})</h2>
        {state.participants.length === 0 ? <EmptyState title="Belum ada peserta" hint="Upload berkas, isi form, atau impor dari PDF." icon="file" /> : (
          <ul className="divide-y divide-slate-100">{state.participants.map((p) => <ParticipantRow key={p.id} p={p} />)}</ul>
        )}
      </section>

      <div className="flex justify-between">
        <Link to="/template" className="btn-secondary">
          <Icon name="arrow-left" className="h-4 w-4" />
          Kembali
        </Link>
      </div>
    </div>
  );
}
