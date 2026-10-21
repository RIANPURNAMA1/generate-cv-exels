import { Link } from 'react-router-dom';

export const STEPS = [
  { path: '/template', label: 'Template' },
  { path: '/data', label: 'Data peserta' },
  { path: '/matching', label: 'Pencocokan' },
  { path: '/result', label: 'Hasil' },
] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Langkah" className="mb-6">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => {
          const active = i === current;
          const done = i < current;
          const cls = active ? 'bg-navy text-white' : done ? 'border border-navy text-navy' : 'border border-slate-300 text-slate-500';
          const inner = (
            <span className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${cls}`} aria-current={active ? 'step' : undefined}>
              <span className="font-semibold">{i + 1}</span>
              <span>{s.label}</span>
              {done && <span className="text-gold" aria-hidden="true">✓</span>}
            </span>
          );
          return <li key={s.path}>{i <= current ? <Link to={s.path}>{inner}</Link> : inner}</li>;
        })}
      </ol>
    </nav>
  );
}
