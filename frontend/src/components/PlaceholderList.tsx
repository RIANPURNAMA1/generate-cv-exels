import { groupPlaceholders } from '../lib/placeholders';
import type { DetectedPlaceholder } from '../types';
import { Icon } from './Icon';
import { EmptyState } from './Skeleton';

const TITLES = { biasa: 'Biasa', foto: 'Foto', berulang: 'Berulang', dropdown: 'Dropdown' } as const;
const ICONS = { biasa: 'list', foto: 'table', berulang: 'list', dropdown: 'chevron-down' } as const;

export function PlaceholderList({ placeholders }: { placeholders: DetectedPlaceholder[] }) {
  if (placeholders.length === 0) return <EmptyState title="Tidak ada placeholder terdeteksi" hint="Pastikan sel template berisi teks seperti {nama_romaji}." icon="search" />;
  const groups = groupPlaceholders(placeholders);
  return (
    <div className="space-y-5">
      {(Object.keys(TITLES) as Array<keyof typeof TITLES>).map((k) =>
        groups[k].length === 0 ? null : (
          <section key={k} aria-labelledby={`ph-${k}`}>
            <h3 id={`ph-${k}`} className="mb-2 flex items-center gap-2 text-sm font-semibold text-google-gray-900">
              <Icon name={ICONS[k]} className="h-4 w-4 text-google-gray-500" />
              {TITLES[k]}
              <span className="badge bg-google-gray-100 text-google-gray-600">{groups[k].length}</span>
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {groups[k].map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-2 rounded-inner border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-google-blue-border hover:bg-google-gray-50">
                  <code className="font-mono text-xs font-medium text-[#174ea6]">{`{${p.name}}`}</code>
                  <span className="flex items-center gap-1.5 text-xs text-google-gray-500">
                    {p.cells.slice(0, 2).join(', ')}
                    {p.cells.length > 2 ? ` +${p.cells.length - 2}` : ''}
                    {!p.known && <span className="badge bg-google-yellow-surface text-google-yellow-hover">tidak baku</span>}
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
