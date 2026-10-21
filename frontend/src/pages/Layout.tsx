import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { STEPS, Stepper } from '../components/Stepper';
import { useToast } from '../components/Toast';
import { getApi } from '../services/api';
import { useWizard } from '../state/wizard';

/** Layout utama: header, tombol hapus data sesi, dan stepper. */
export function Layout() {
  const { dispatch } = useWizard();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [confirm, setConfirm] = useState(false);

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
    <div className="min-h-screen">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h1 className="text-base font-semibold">Pengisi Template CV <span className="text-gold">·</span> <span className="font-normal text-slate-300">実習生経歴書</span></h1>
          <div className="flex items-center gap-2 text-sm">
            <button type="button" className="rounded-md border border-slate-500 px-3 py-1 hover:bg-navy-700" onClick={() => setConfirm(true)}>Hapus data sesi</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Stepper current={current} />
        <Outlet />
      </main>
      <ConfirmDialog open={confirm} danger title="Hapus data sesi sekarang?" confirmLabel="Hapus" onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); purge.mutate(); }}>
        Semua data peserta, foto, dan hasil CV dihapus dari server dan dari tab ini. Template tidak ikut dihapus.
      </ConfirmDialog>
    </div>
  );
}
