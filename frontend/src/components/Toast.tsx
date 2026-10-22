import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Kind = 'info' | 'success' | 'error';
interface ToastItem { id: number; kind: Kind; text: string }
const Ctx = createContext<{ push: (text: string, kind?: Kind) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, kind: Kind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, kind, text }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 5000);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  const color: Record<Kind, string> = {
    info: 'border-slate-200 bg-white text-google-gray-700',
    success: 'border-google-green-border bg-google-green-surface text-google-green-hover',
    error: 'border-google-red-border bg-google-red-surface text-google-red',
  };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto rounded-card border px-4 py-3 text-sm shadow-card-hover ${color[t.kind]}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast harus di dalam ToastProvider');
  return c;
}
