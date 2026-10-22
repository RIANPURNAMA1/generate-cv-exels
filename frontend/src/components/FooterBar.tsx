import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { STEPS } from './Stepper';

interface FooterValue {
  setAction: (node: ReactNode) => void;
}

const Ctx = createContext<FooterValue | null>(null);

/** Barisstatus bawah: sinkronisasi otomatis (kiri) + aksi utama halaman (kanan). */
export function FooterBarProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<ReactNode>(null);
  const value = useMemo(() => ({ setAction }), []);
  const loc = useLocation();
  const step = Math.max(0, STEPS.findIndex((s) => loc.pathname.startsWith(s.path)));

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 shadow-bar backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-sm text-google-gray-600">
            <span className="flex items-center gap-2">
              <Icon name="cloud-check" className="h-5 w-5 text-google-green" />
              <span className="hidden sm:inline">Tersimpan otomatis di Google Drive</span>
              <span className="sm:hidden">Tersimpan di Drive</span>
            </span>
            <span className="pill">
              <span className="font-semibold text-google-gray-900">Tahap {step + 1}</span>
              <span className="text-google-gray-400">dari {STEPS.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">{action}</div>
        </div>
      </div>
    </Ctx.Provider>
  );
}

/** Daftarkan aksi utama halaman ke barisstatus bawah. */
export function useFooterAction(node: ReactNode, deps: unknown[] = []) {
  const ctx = useContext(Ctx);
  useEffect(() => {
    ctx?.setAction(node);
    return () => ctx?.setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
