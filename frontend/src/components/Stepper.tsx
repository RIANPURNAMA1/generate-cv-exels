import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export const STEPS = [
  { path: '/template', label: 'Template', hint: 'Unggah & deteksi placeholder' },
  { path: '/data', label: 'Data peserta', hint: 'Excel, manual, atau PDF' },
  { path: '/matching', label: 'Pencocokan', hint: 'Petakan kolom & validasi' },
  { path: '/result', label: 'Hasil', hint: 'Unduh CV peserta' },
] as const;

/** Stepper horizontal ala Google Workflow: lingkaran status + garis penghubung 1px. */
export function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Tahapan" className="mb-6 rounded-card border border-slate-200 bg-white px-4 py-4 shadow-card sm:px-6">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
        {STEPS.map((s, i) => {
          const active = i === current;
          const done = i < current;
          const circle = active
            ? 'bg-google-blue text-white ring-4 ring-google-blue-surface'
            : done
              ? 'border border-google-green-border bg-google-green-surface text-google-green'
              : 'border border-google-gray-200 bg-google-gray-100 text-google-gray-500';
          const label = active ? 'text-google-gray-900' : done ? 'text-google-gray-700' : 'text-google-gray-500';
          const inner = (
            <span className="flex items-center gap-3">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${circle}`}
                aria-hidden="true"
              >
                {done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-sm font-semibold ${label}`}>
                  {s.label}
                  {active && <span className="sr-only"> (langkah saat ini)</span>}
                </span>
                <span className="hidden truncate text-xs text-google-gray-500 sm:block">{s.hint}</span>
              </span>
            </span>
          );
          return (
            <li key={s.path} className="flex items-center sm:flex-1">
              <span className={i <= current ? 'rounded-full transition-colors hover:bg-google-gray-50' : undefined}>
                {i <= current ? (
                  <Link to={s.path} aria-current={active ? 'step' : undefined} className="block px-1 py-1">
                    {inner}
                  </Link>
                ) : (
                  <span className="block px-1 py-1">{inner}</span>
                )}
              </span>
              {i < STEPS.length - 1 && <span className="mx-3 hidden h-px flex-1 bg-google-gray-200 sm:block" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
