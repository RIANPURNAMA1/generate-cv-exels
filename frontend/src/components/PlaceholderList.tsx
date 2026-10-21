import { groupPlaceholders } from '../lib/placeholders';
import type { DetectedPlaceholder } from '../types';
import { EmptyState } from './Skeleton';

const TITLES = { biasa: 'Biasa', foto: 'Foto', berulang: 'Berulang', dropdown: 'Dropdown' } as const;

export function PlaceholderList({ placeholders }: { placeholders: DetectedPlaceholder[] }) {
  if (placeholders.length === 0) return <EmptyState title="Tidak ada placeholder terdeteksi" hint="Pastikan sel template berisi teks seperti {nama_romaji}." />;
  const groups = groupPlaceholders(placeholders);
  return (
    <div className="space-y-4">
      {(Object.keys(TITLES) as Array<keyof typeof TITLES>).map((k) =>
        groups[k].length === 0 ? null : (
          <section key={k} aria-labelledby={`ph-${k}`}>
            <h3 id={`ph-${k}`} className="mb-1 text-sm font-semibold text-navy">
              {TITLES[k]} <span className="font-normal text-slate-500">({groups[k].length})</span>
            </h3>
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {groups[k].map((p) => (
                <li key={p.name} className="flex items-start justify-between gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs">
                  <code className="font-semibold text-slate-800">{`{${p.name}}`}</code>
                  <span className="text-right text-slate-500">
                    {p.cells.slice(0, 2).join(', ')}{p.cells.length > 2 ? ` +${p.cells.length - 2}` : ''}
                    {!p.known && <span className="badge ml-1 bg-amber-100 text-amber-800">tidak baku</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
