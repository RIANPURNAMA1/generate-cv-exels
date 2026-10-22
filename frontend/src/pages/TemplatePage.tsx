import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dropzone } from '../components/Dropzone';
import { useFooterAction } from '../components/FooterBar';
import { Icon } from '../components/Icon';
import { PlaceholderList } from '../components/PlaceholderList';
import { EmptyState, ErrorState, Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { parseTemplateFile } from '../lib/placeholders';
import { getApi } from '../services/api';
import { useWizard } from '../state/wizard';
import type { DetectedPlaceholder, TemplateInfo } from '../types';

const GUIDE_URL = 'https://github.com/RIANPURNAMA1/generate-cv-exels#placeholder';

export function TemplatePage() {
  const { state, dispatch } = useWizard();
  const toast = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [preview, setPreview] = useState<DetectedPlaceholder[] | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<TemplateInfo | null>(null);
  const [query, setQuery] = useState('');
  const fileRef = useRef<File | null>(null);

  const list = useQuery({ queryKey: ['templates'], queryFn: () => getApi().listTemplates() });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      fileRef.current = file;
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
  const count = shown?.length ?? 0;

  const autoDetect = async () => {
    const file = fileRef.current;
    if (!file) {
      const fromServer = state.template?.placeholders ?? [];
      if (fromServer.length === 0) {
        toast.push('Belum ada berkas lokal. Unggah template terlebih dahulu.', 'info');
        return;
      }
      setPreview(fromServer);
      toast.push(`Auto-detect selesai: ${fromServer.length} placeholder pada template "${state.template?.name}".`, 'success');
      return;
    }
    try {
      const found = await parseTemplateFile(file);
      setPreview(found);
      toast.push(`Auto-detect selesai: ${found.length} placeholder ditemukan.`, 'success');
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Auto-detect gagal.', 'error');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = list.data ?? [];
    return q ? all.filter((t) => t.name.toLowerCase().includes(q)) : all;
  }, [list.data, query]);

  useFooterAction(
    <button type="button" className="btn-primary" disabled={!state.template} onClick={() => nav('/data')}>
      Lanjut ke data peserta
      <Icon name="arrow-right" className="h-4 w-4" />
    </button>,
    [state.template, nav],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] lg:items-start">
      {/* ================= Kolom kiri ================= */}
      <div className="space-y-6">
        <section className="card p-6" aria-labelledby="t-upload">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-google-blue">Langkah 1 · Template</p>
              <h2 id="t-upload" className="mt-1 text-lg font-semibold text-google-gray-900">Unggah template CV</h2>
              <p className="mt-1 max-w-xl text-sm text-google-gray-600">
                Berkas .xlsx diperiksa otomatis. Warna, merge, dropdown, dan tata letak template tidak diubah — hanya isi sel.
              </p>
            </div>
            <button
              type="button"
              className="btn-sheets btn-sm"
              onClick={() => getApi().downloadSampleTemplate().catch((e: Error) => toast.push(e.message, 'error'))}
            >
              <Icon name="download" className="h-4 w-4" />
              Unduh template contoh
              <span className="badge bg-white text-google-green-hover">.XLSX</span>
            </button>
          </div>

          <Dropzone
            accept=".xlsx"
            label="Upload template CV (.xlsx)"
            hint="Seret berkas ke area ini, atau pilih dari komputer. Placeholder dibaca dari sel yang memuat kurung kurawal."
            notes={['Microsoft Excel (.xlsx)', 'Maksimal 10MB', 'Tanpa makro']}
            busy={upload.isPending}
            onFile={(f) => upload.mutate(f)}
          />

          {state.template && !upload.isPending && (
            <div className="mt-4 flex items-center gap-3 rounded-inner border border-google-blue-border bg-google-blue-surface px-4 py-3">
              <Icon name="check" className="h-5 w-5 shrink-0 text-google-blue" />
              <p className="text-sm text-google-gray-700">
                Template terpilih: <strong className="font-semibold text-google-gray-900">{state.template.name}</strong>
                <span className="text-google-gray-500"> · {state.template.placeholders.length} placeholder</span>
              </p>
            </div>
          )}
        </section>

        <section className="card p-6" aria-labelledby="t-format">
          <h2 id="t-format" className="text-base font-semibold text-google-gray-900">Format penulisan variabel</h2>
          <p className="mt-1 text-sm text-google-gray-600">
            Placeholder ditulis di dalam kurung kurawal dengan huruf kecil, angka, dan garis bawah saja.
          </p>
          <div className="info-box mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <code className="chip">{`{nama_romaji}`}</code>
              <code className="chip">{`{posisi}`}</code>
              <code className="chip">{`{tanggal_lahir}`}</code>
            </div>
            <p className="text-xs text-google-gray-600">
              Satu sel boleh memuat teks tetap bersama placeholder, misalnya{' '}
              <code className="font-mono text-[11px] font-medium text-[#174ea6]">年{'{tahun_lahir}'} 月{'{bulan_lahir}'} 日{'{tgl_lahir}'}</code>.
            </p>
          </div>
        </section>

        <section className="card p-6" aria-labelledby="t-ph">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="t-ph" className="text-base font-semibold text-google-gray-900">Placeholder terdeteksi</h2>
              <p className="mt-1 text-sm text-google-gray-600">Daftar variabel yang dibaca sistem dari berkas template.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge bg-google-blue-surface text-google-blue-hover">{count} Variabel</span>
              <button type="button" className="btn-secondary btn-sm" onClick={autoDetect} disabled={upload.isPending}>
                <Icon name="bolt" className="h-4 w-4" />
                Auto-detect
              </button>
            </div>
          </div>

          {upload.isPending && !shown ? (
            <Skeleton lines={5} />
          ) : shown ? (
            <PlaceholderList placeholders={shown} />
          ) : (
            <EmptyState title="Belum ada template" hint="Unggah template atau pilih dari daftar “Template saya”." icon="upload" />
          )}

          {state.template && (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => getApi().downloadSampleData(state.template?.id ?? '').catch((e: Error) => toast.push(e.message, 'error'))}
              >
                <Icon name="download" className="h-4 w-4" />
                Unduh CSV contoh data
              </button>
              <span className="text-xs text-google-gray-500">Gunakan CSV contoh untuk mengisi data peserta pada langkah berikutnya.</span>
            </div>
          )}
        </section>
      </div>

      {/* ================= Kolom kanan ================= */}
      <aside className="space-y-4 lg:sticky lg:top-24">
        <section className="card p-5" aria-labelledby="t-mine">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 id="t-mine" className="text-base font-semibold text-google-gray-900">Template saya</h2>
            <button
              type="button"
              className="btn-icon"
              onClick={() => void list.refetch()}
              aria-label="Muat ulang daftar template"
              title="Muat ulang"
            >
              <Icon name="refresh" className={`h-4 w-4 ${list.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative mb-4">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-google-gray-500" />
            <input
              type="search"
              className="search-field"
              placeholder="Cari template di Google Drive"
              aria-label="Cari template di Google Drive"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {list.isLoading ? (
            <Skeleton lines={3} />
          ) : list.isError ? (
            <ErrorState message="Daftar template gagal dimuat dari Google Drive." onRetry={() => void list.refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={query ? 'Tidak ada template yang cocok' : 'Belum ada template tersimpan'}
              hint={query ? 'Coba kata kunci lain.' : 'Unggah template untuk menyimpannya di Drive.'}
              icon="drive"
            />
          ) : (
            <ul className="space-y-2">
              {filtered.map((t) => (
                <li key={t.id} className="rounded-inner border border-slate-200 bg-white p-3 transition-colors hover:border-google-blue-border hover:bg-google-gray-50">
                  {editing?.id === t.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editing.name.trim()) rename.mutate({ id: t.id, name: editing.name.trim() });
                      }}
                    >
                      <label className="sr-only" htmlFor={`rn-${t.id}`}>Nama template</label>
                      <input
                        id={`rn-${t.id}`}
                        className="input py-1.5"
                        value={editing.name}
                        onChange={(e) => setEditing({ id: t.id, name: e.target.value })}
                      />
                      <button type="submit" className="btn-primary btn-sm">Simpan</button>
                      <button type="button" className="btn-neutral btn-sm" onClick={() => setEditing(null)}>Batal</button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-google-gray-900">{t.name}</p>
                          <p className="text-xs text-google-gray-500">{t.placeholders.length} placeholder</p>
                        </div>
                        {state.template?.id === t.id && (
                          <span className="badge shrink-0 bg-google-blue-surface text-google-blue-hover">Dipakai</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setPreview(null);
                            dispatch({ type: 'SET_TEMPLATE', template: t });
                          }}
                        >
                          Pakai
                        </button>
                        <button
                          type="button"
                          className="btn-icon h-8 w-8"
                          onClick={() => setEditing({ id: t.id, name: t.name })}
                          aria-label={`Ganti nama ${t.name}`}
                          title="Ganti nama"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-icon h-8 w-8 text-google-red hover:bg-google-red-surface"
                          onClick={() => setToDelete(t)}
                          aria-label={`Hapus ${t.name}`}
                          title="Hapus"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5" aria-label="Status integrasi">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-google-gray-900">Status integrasi</p>
            {list.isError ? (
              <span className="badge bg-google-red-surface text-google-red">
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-google-red" />
                Workspace API Offline — ERR_NET_SYNC
              </span>
            ) : (
              <span className="badge bg-google-green-surface text-google-green-hover">
                <span className="h-2 w-2 rounded-full bg-google-green" />
                Workspace API Online
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-google-gray-500">
            Template disimpan di Google Drive dan dapat dipilih kembali pada sesi berikutnya.
          </p>
        </section>

        <a
          className="flex items-center justify-between gap-2 rounded-card border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-google-blue transition-colors hover:bg-google-gray-50"
          href={GUIDE_URL}
          target="_blank"
          rel="noreferrer"
        >
          Panduan penataan kolom template
          <Icon name="arrow-right" className="h-4 w-4" />
        </a>
      </aside>

      <ConfirmDialog open={!!toDelete} danger title="Hapus template?" confirmLabel="Hapus" onCancel={() => setToDelete(null)} onConfirm={() => toDelete && remove.mutate(toDelete.id)}>
        Template “{toDelete?.name}” akan dihapus permanen.
      </ConfirmDialog>
    </div>
  );
}
