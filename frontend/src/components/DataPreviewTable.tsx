import type { DataRow } from '../types';
import { EmptyState } from './Skeleton';

export function DataPreviewTable({ columns, rows, limit = 20 }: { columns: string[]; rows: DataRow[]; limit?: number }) {
  if (rows.length === 0) return <EmptyState title="Belum ada data" />;
  const shown = rows.slice(0, limit);
  return (
    <div>
      <div className="overflow-x-auto rounded-inner border border-slate-200" tabIndex={0} role="region" aria-label="Pratinjau data peserta">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-google-gray-100 text-google-gray-900">
            <tr>
              <th className="px-2 py-1.5">#</th>
              {columns.map((c) => <th key={c} className="whitespace-nowrap px-2 py-1.5 font-medium">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-1 text-google-gray-400">{i + 1}</td>
                {columns.map((c) => <td key={c} className="max-w-[16rem] truncate px-2 py-1" title={r[c] ?? ''}>{r[c] ?? ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-google-gray-500">Menampilkan {shown.length} dari {rows.length} baris.</p>
    </div>
  );
}
