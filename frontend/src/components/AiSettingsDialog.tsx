import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AiProviderId, AiStatus } from '../types';
import { getApi } from '../services/api';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';
import { useToast } from './Toast';

const AI_STATUS_KEY = 'ai-status';

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const AiSettingsCtx = createContext<Ctx>({ open: false, setOpen: () => {} });

/** Buka dialog pengaturan AI dari mana saja (app bar, panel AI, tab PDF). */
export function useAiSettings(): Ctx {
  return useContext(AiSettingsCtx);
}

/** Nama ringkas penyedia: "Claude (Anthropic)" → "Claude". */
export function shortLabel(label: string): string {
  return label.split(' (')[0] ?? label;
}

/** Segmented control: satu baris pilihan penyedia. */
function ProviderSegment({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-inner border px-3 py-2.5 transition-colors ${
        selected
          ? 'border-google-blue bg-google-blue text-white shadow-pill'
          : 'border-slate-200 bg-white text-google-gray-700 hover:border-google-gray-300 hover:bg-google-gray-50'
      }`}
    >
      <span className="text-sm font-semibold leading-tight">{shortLabel(label)}</span>
      <span className={`text-[11px] leading-tight ${selected ? 'text-white/80' : 'text-google-gray-500'}`}>
        {label.includes('(') ? label.slice(label.indexOf('(') + 1, label.lastIndexOf(')')) : ''}
      </span>
    </button>
  );
}

/** Sakelar Material untuk mengaktifkan/mematikan langkah AI. */
function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-google-blue peer-checked:after:translate-x-4 peer-focus-visible:ring-4 peer-focus-visible:ring-google-blue/20" />
      <span className="leading-tight">
        <span className="block text-sm font-medium text-google-gray-900">{label}</span>
        <span className="block text-xs text-google-gray-500">{hint}</span>
      </span>
    </label>
  );
}

function AiSettingsForm({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const status = useQuery<AiStatus>({ queryKey: [AI_STATUS_KEY], queryFn: () => getApi().aiStatus() });
  const [provider, setProvider] = useState<AiProviderId>('claude');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status.data && !loaded) {
      setProvider(status.data.provider);
      setModel(status.data.model);
      setEnabled(status.data.enabled);
      setLoaded(true);
    }
  }, [status.data, loaded]);

  const save = useMutation({
    mutationFn: () => getApi().updateAiSettings({ provider, model, enabled, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: [AI_STATUS_KEY] });
      toast.push(`Pengaturan AI disimpan · ${data.providerLabel}`, 'success');
      setApiKey('');
      onClose();
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const active = useMemo(() => status.data?.providers.find((p) => p.id === provider) ?? null, [status.data, provider]);
  const modelList = active?.models ?? [];
  const envName = provider === 'claude' ? 'ANTHROPIC_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';

  if (status.isLoading) return <Skeleton lines={5} />;
  if (status.isError) {
    return (
      <div className="space-y-3 py-2">
        <p role="alert" className="text-sm text-google-red">Pengaturan AI tidak dapat dimuat dari server.</p>
        <button type="button" className="btn-secondary" onClick={() => void status.refetch()}>Coba lagi</button>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-google-gray-500">Penyedia AI</legend>
        <div role="radiogroup" aria-label="Penyedia AI" className="flex gap-2">
          {(status.data?.providers ?? []).map((p) => (
            <ProviderSegment key={p.id} label={p.label} selected={p.id === provider} onSelect={() => { setProvider(p.id); setModel(''); }} />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-inner bg-google-gray-50 px-3 py-2 text-xs">
        <span className="font-medium text-google-gray-700">{active?.label ?? ''}</span>
        <span className={`badge ${active?.hasKey ? 'bg-google-green-surface text-google-green-hover' : 'bg-google-yellow-surface text-google-yellow-hover'}`}>
          {active?.hasKey ? 'Kunci tersimpan' : 'Belum ada kunci'}
        </span>
        {active?.nativePdf && <span className="text-google-gray-500">menerima PDF langsung</span>}
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="ai-model">Model</label>
        <input
          id="ai-model"
          className="input"
          list="ai-model-list"
          value={model}
          placeholder={active?.model ?? 'model bawaan penyedia'}
          onChange={(e) => setModel(e.target.value)}
        />
        <datalist id="ai-model-list">
          {modelList.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <p className="text-xs text-google-gray-500">
          Kosongkan untuk memakai model bawaan penyedia. Nama tampilan otomatis diubah menjadi id model yang benar.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="label" htmlFor="ai-key">Kunci API</label>
        <div className="flex gap-2">
          <input
            id="ai-key"
            type={showKey ? 'text' : 'password'}
            className="input font-mono text-xs"
            value={apiKey}
            autoComplete="off"
            placeholder={active?.hasKey ? '••••••••  (terisi — biarkan kosong bila tidak diganti)' : 'Tempel kunci API penyedia'}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button type="button" className="btn-neutral shrink-0" aria-label={showKey ? 'Sembunyikan kunci' : 'Tampilkan kunci'} onClick={() => setShowKey((v) => !v)}>
            <Icon name="eye" className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-google-gray-500">
          Disimpan terenkripsi di server, tidak pernah dikirim ke browser. Bisa juga diisi lewat environment (<code className="font-mono">{envName}</code>).
        </p>
      </div>

      <div className="rounded-inner border border-slate-200 p-3">
        <Switch
          checked={enabled}
          onChange={setEnabled}
          label="Aktifkan langkah AI"
          hint="Saran katakana, terjemahan Jepang, dan impor PDF."
        />
      </div>

      {status.data?.reason && (
        <p className="flex items-start gap-2 text-xs text-google-yellow-hover">
          <Icon name="alert" className="h-4 w-4 shrink-0" />
          {status.data.reason}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary" disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : 'Simpan pengaturan'}
        </button>
      </div>
    </form>
  );
}

export function AiSettingsDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" className="my-auto w-full max-w-xl rounded-card bg-white p-6 shadow-card-hover">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="ai-settings-title" className="flex items-center gap-2 text-lg font-semibold text-google-gray-900">
              <Icon name="sparkles" className="h-5 w-5 text-google-blue" />
              Pengaturan AI
            </h2>
            <p className="mt-1 text-sm text-google-gray-600">Pilih penyedia dan model yang dipakai untuk seluruh langkah AI.</p>
          </div>
          <button type="button" className="btn-icon" aria-label="Tutup pengaturan AI" onClick={onClose} ref={ref}>
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <AiSettingsForm onClose={onClose} />
      </div>
    </div>
  );
}

/** Panel cepat: ganti penyedia AI aktif seketika, atau buka pengaturan lengkap. */
export function AiProviderSwitch() {
  const qc = useQueryClient();
  const toast = useToast();
  const dialog = useAiSettings();
  const status = useQuery<AiStatus>({ queryKey: [AI_STATUS_KEY], queryFn: () => getApi().aiStatus() });
  const switchTo = useMutation({
    mutationFn: (p: AiProviderId) => getApi().updateAiSettings({ provider: p }),
    onSuccess: (d) => {
      void qc.invalidateQueries({ queryKey: [AI_STATUS_KEY] });
      toast.push(`AI memakai ${d.providerLabel} · ${d.model}`, 'success');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  if (status.isLoading) return <Skeleton lines={2} />;
  if (status.isError) return null;
  const data = status.data;
  if (!data) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-inner border border-slate-200 bg-google-gray-50 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-google-gray-500">Penyedia AI</span>
      <div role="radiogroup" aria-label="Penyedia AI aktif" className="flex flex-wrap gap-1.5">
        {data.providers.map((p) => {
          const active = p.id === data.provider;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={switchTo.isPending}
              onClick={() => !active && switchTo.mutate(p.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                active
                  ? 'border-google-blue bg-google-blue text-white'
                  : 'border-slate-200 bg-white text-google-gray-700 hover:bg-white hover:shadow-card'
              }`}
            >
              {shortLabel(p.label)}
              <span className={`h-1.5 w-1.5 rounded-full ${p.hasKey ? 'bg-google-green' : 'bg-google-yellow'}`} title={p.hasKey ? 'Kunci tersimpan' : 'Belum ada kunci'} />
            </button>
          );
        })}
      </div>
      <span className={`badge ${data.enabled ? 'bg-google-green-surface text-google-green-hover' : 'bg-google-yellow-surface text-google-yellow-hover'}`}>
        {data.enabled ? `Aktif · ${data.model}` : 'Belum aktif'}
      </span>
      <button type="button" className="btn-secondary btn-sm ml-auto gap-1.5" onClick={() => dialog.setOpen(true)}>
        <Icon name="key" className="h-4 w-4" />
        Kunci & model
      </button>
    </div>
  );
}

/** Pembungkus: menyediakan fungsi buka/tutup + merender dialog. */
export function AiSettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return (
    <AiSettingsCtx.Provider value={value}>
      {children}
      {open && <AiSettingsDialog onClose={() => setOpen(false)} />}
    </AiSettingsCtx.Provider>
  );
}
