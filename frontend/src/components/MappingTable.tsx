import { statusOf, type MatchStatus } from '../lib/automatch';
import { kindOf } from '../lib/catalog';
import type { DetectedPlaceholder } from '../types';

const BADGE: Record<MatchStatus, { text: string; cls: string }> = {
  cocok: { text: 'Cocok', cls: 'bg-green-100 text-green-800' },
  belum_ada_data: { text: 'Belum ada data', cls: 'bg-amber-100 text-amber-800' },
  terhitung: { text: 'Terhitung otomatis', cls: 'bg-slate-100 text-slate-700' },
  foto: { text: 'Foto peserta', cls: 'bg-slate-100 text-slate-700' },
};

interface Props {
  placeholders: DetectedPlaceholder[];
  columns: string[];
  mapping: Record<string, string>;
  onChange: (placeholder: string, column: string) => void;
}

export function MappingTable({ placeholders, columns, mapping, onChange }: Props) {
  const hasBirth = columns.some((c) => c.toLowerCase() === 'tanggal_lahir' || c === mapping.tanggal_lahir);
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200" role="region" aria-label="Tabel pencocokan" tabIndex={0}>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-navy text-white">
          <tr>
            <th className="px-3 py-2 font-medium">Placeholder</th>
            <th className="px-3 py-2 font-medium">Jenis</th>
            <th className="px-3 py-2 font-medium">Kolom data</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {placeholders.map((p) => {
            const st = statusOf(p, mapping, columns, hasBirth);
            const fixed = st === 'foto' || st === 'terhitung';
            const selectId = `map-${p.name}`;
            return (
              <tr key={p.name} className="border-t border-slate-100">
                <td className="px-3 py-1.5"><code className="text-xs">{`{${p.name}}`}</code></td>
                <td className="px-3 py-1.5 text-xs text-slate-500">{kindOf(p)}</td>
                <td className="px-3 py-1.5">
                  <label htmlFor={selectId} className="sr-only">Kolom untuk {p.name}</label>
                  <select
                    id={selectId}
                    className="input py-1"
                    disabled={fixed}
                    value={mapping[p.name] ?? ''}
                    onChange={(e) => onChange(p.name, e.target.value)}
                  >
                    <option value="">{fixed ? '(otomatis)' : '— pilih kolom —'}</option>
                    {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5"><span className={`badge ${BADGE[st].cls}`}>{BADGE[st].text}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
