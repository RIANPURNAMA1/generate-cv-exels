import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dropzone } from '../components/Dropzone';
import { PlaceholderList } from '../components/PlaceholderList';
import { EmptyState, ErrorState, Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { parseTemplateFile } from '../lib/placeholders';
import { getApi } from '../services/api';
import { useWizard } from '../state/wizard';
import type { DetectedPlaceholder, TemplateInfo } from '../types';

export function TemplatePage() {
  const { state, dispatch } = useWizard();
  const toast = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [preview, setPreview] = useState<DetectedPlaceholder[] | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<TemplateInfo | null>(null);

  const list = useQuery({ queryKey: ['templates'], queryFn: () => getApi().listTemplates() });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      setPreview(await parseTemplateFile(file).catch(() => null)); // pratinjau cepat dengan SheetJS
      return getApi().uploadTemplate(file);
    },
    onSuccess: (t) => {
      dispatch({ type: 'SET_TEMPLATE', template: t });
      setPreview(null);
      void qc.invalidateQueries({ queryKey: ['templates'] });
      toast.push(`Template "${t.name}" dibaca: ${t.placeholders.length} placeholder.`, 'success');
    },
    onError: (e: Error) => {
      setPreview(null);
      toast.push(e.message, 'error');
    },
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => getApi().renameTemplate(id, name),
    onSuccess: () => {
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => getApi().deleteTemplate(id),
    onSuccess: (_d, id) => {
      if (state.template?.id === id) dispatch({ type: 'SET_TEMPLATE', template: null });
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const shown = preview ?? state.template?.placeholders ?? null;

  return (
    <div className="space-y-6">
      <section aria-labelledby="t-upload" className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="t-upload" className="text-base font-semibold text-navy">Langkah 1 · Template</h2>
          <button type="button" className="btn-secondary" onClick={() => getApi().downloadSampleTemplate().catch((e: Error) => toast.push(e.message, 'error'))}>Unduh template contoh</button>
        </div>
        <Dropzone accept=".xlsx" label="Upload template CV (.xlsx)" hint="Sel berisi placeholder seperti {nama_romaji}. Maks 10 MB, tanpa makro." busy={upload.isPending} onFile={(f) => upload.mutate(f)} />
        {state.template && !upload.isPending && (
          <p className="text-sm text-slate-700">Template terpilih: <strong>{state.template.name}</strong></p>
        )}
      </section>

      <section aria-labelledby="t-ph" className="card space-y-3">
        <h2 id="t-ph" className="text-base font-semibold text-navy">Placeholder terdeteksi</h2>
        {upload.isPending && !shown ? <Skeleton lines={5} /> : shown ? <PlaceholderList placeholders={shown} /> : <EmptyState title="Belum ada template" hint="Upload template atau pilih dari daftar “Template saya”." />}
        {state.template && (
          <button type="button" className="btn-secondary" onClick={() => getApi().downloadSampleData(state.template?.id ?? '').catch((e: Error) => toast.push(e.message, 'error'))}>Unduh CSV contoh data</button>
        )}
      </section>

      <section aria-labelledby="t-mine" className="card space-y-3">
        <h2 id="t-mine" className="text-base font-semibold text-navy">Template saya</h2>
        {list.isLoading ? <Skeleton lines={3} /> : list.isError ? <ErrorState message="Daftar template gagal dimuat." onRetry={() => void list.refetch()} /> : (list.data ?? []).length === 0 ? <EmptyState title="Belum ada template tersimpan" /> : (
          <ul className="divide-y divide-slate-100">
            {(list.data ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                {editing?.id === t.id ? (
                  <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (editing.name.trim()) rename.mutate({ id: t.id, name: editing.name.trim() }); }}>
                    <label className="sr-only" htmlFor={`rn-${t.id}`}>Nama template</label>
                    <input id={`rn-${t.id}`} className="input py-1" value={editing.name} onChange={(e) => setEditing({ id: t.id, name: e.target.value })} />
                    <button type="submit" className="btn-primary py-1">Simpan</button>
                    <button type="button" className="btn-secondary py-1" onClick={() => setEditing(null)}>Batal</button>
                  </form>
                ) : (
                  <>
                    <span className="text-sm">{t.name} <span className="text-xs text-slate-500">({t.placeholders.length} placeholder)</span>{state.template?.id === t.id && <span className="badge ml-2 bg-gold/20 text-navy">Dipakai</span>}</span>
                    <span className="flex gap-2">
                      <button type="button" className="btn-secondary py-1" onClick={() => dispatch({ type: 'SET_TEMPLATE', template: t })}>Pakai</button>
                      <button type="button" className="btn-secondary py-1" onClick={() => setEditing({ id: t.id, name: t.name })}>Ganti nama</button>
                      <button type="button" className="btn-danger py-1" onClick={() => setToDelete(t)}>Hapus</button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex justify-end">
        <button type="button" className="btn-primary" disabled={!state.template} onClick={() => nav('/data')}>Lanjut ke data peserta →</button>
      </div>

      <ConfirmDialog open={!!toDelete} danger title="Hapus template?" confirmLabel="Hapus" onCancel={() => setToDelete(null)} onConfirm={() => toDelete && remove.mutate(toDelete.id)}>
        Template “{toDelete?.name}” akan dihapus permanen.
      </ConfirmDialog>
    </div>
  );
}
