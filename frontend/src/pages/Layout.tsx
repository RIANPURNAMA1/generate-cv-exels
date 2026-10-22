import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FooterBarProvider } from '../components/FooterBar';
import { Icon } from '../components/Icon';
import { STEPS, Stepper } from '../components/Stepper';
import { useToast } from '../components/Toast';
import { useAiSettings, shortLabel } from '../components/AiSettingsDialog';
import { getApi } from '../services/api';
import { useWizard } from '../state/wizard';
import type { AiStatus } from '../types';

/** Layout utama: app bar, stepper, area konten, dan baris status bawah. */
export function Layout() {
  const { dispatch } = useWizard();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [confirm, setConfirm] = useState(false);
  const aiDialog = useAiSettings();
  const ai = useQuery<AiStatus>({ queryKey: ['ai-status'], queryFn: () => getApi().aiStatus() });

  const purge = useMutation({
    mutationFn: () => getApi().purgeSession(),
    onSuccess: () => {
      dispatch({ type: 'RESET_SESSION' });
      toast.push('Data sesi dihapus.', 'success');
      nav('/data');
    },
    onError: (e: Error) => toast.push(e.message, 'error'),
  });

  const current = Math.max(0, STEPS.findIndex((s) => loc.pathname.startsWith(s.path)));

  return (
    <div className="flex min-h-screen flex-col bg-google-gray-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-google-blue text-white shadow-pill">
              <Icon name="file" className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-google-gray-900">Pengisi Template CV</span>
              <span className="block text-xs text-google-gray-500">実習生経歴書 · Google Workspace</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-google-gray-50 px-3 py-1.5 text-xs font-medium text-google-gray-600 sm:inline-flex">
              <Icon name="drive" className="h-4 w-4 text-google-blue" />
              Drive tersinkron
            </span>
            <button
              type="button"
              className="btn-neutral btn-sm gap-1.5"
              onClick={() => aiDialog.setOpen(true)}
              aria-label="Pengaturan AI"
              title="Pengaturan AI"
            >
              <Icon name="sparkles" className="h-4 w-4" />
              <span className="hidden md:inline">AI</span>
              {ai.data && (
                <span className={`badge ${ai.data.enabled ? 'bg-google-green-surface text-google-green-hover' : 'bg-google-yellow-surface text-google-yellow-hover'}`}>
                  {ai.data.enabled ? shortLabel(ai.data.providerLabel) : 'Nonaktif'}
                </span>
              )}
            </button>
            <button type="button" className="btn-neutral btn-sm" onClick={() => setConfirm(true)}>
              Hapus data sesi
            </button>
          </div>
        </div>
      </header>

      <FooterBarProvider>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Stepper current={current} />
          <Outlet />
        </main>
      </FooterBarProvider>

      <ConfirmDialog open={confirm} danger title="Hapus data sesi sekarang?" confirmLabel="Hapus" onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); purge.mutate(); }}>
        Semua data peserta, foto, dan hasil CV dihapus dari server dan dari tab ini. Template tidak ikut dihapus.
      </ConfirmDialog>
    </div>
  );
}
