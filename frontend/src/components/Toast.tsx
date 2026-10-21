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
    info: 'border-slate-300 bg-white text-slate-800',
    success: 'border-green-300 bg-green-50 text-green-900',
    error: 'border-red-300 bg-red-50 text-red-900',
  };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto rounded-md border px-3 py-2 text-sm ${color[t.kind]}`}>{t.text}</div>
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
