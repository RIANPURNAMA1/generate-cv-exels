import type { JobStatus } from '../types';
import { Skeleton } from './Skeleton';

const LABEL = { queued: 'Antre', processing: 'Diproses', done: 'Selesai', failed: 'Gagal' } as const;

export function JobProgress({ job }: { job: JobStatus | undefined }) {
  if (!job) return <Skeleton lines={4} />;
  const total = job.items.length || 1;
  const finished = job.items.filter((i) => i.status === 'done' || i.status === 'failed').length;
  const pct = Math.round((finished / total) * 100);
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span aria-live="polite">{job.status === 'done' ? 'Selesai' : job.status === 'failed' ? 'Gagal' : 'Sedang membuat CV…'}</span>
          <span>{finished}/{job.items.length}</span>
        </div>
        <div className="h-2 rounded-full bg-google-gray-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progres pembuatan CV">
          <div className="h-2 rounded-full bg-google-blue transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {job.items.map((it, i) => (
          <li key={i} className="card text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{it.participantName}</span>
              <span className={`badge ${it.status === 'done' ? 'bg-google-green-surface text-google-green-hover' : it.status === 'failed' ? 'bg-google-red-surface text-google-red' : 'bg-google-gray-100 text-google-gray-700'}`}>{LABEL[it.status]}</span>
            </div>
            {it.error && <p role="alert" className="mt-1 text-xs text-google-red">{it.error}</p>}
            {it.warnings.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs font-medium text-google-yellow-hover">{it.warnings.length} peringatan</summary>
                <ul className="mt-1 list-disc pl-5 text-xs text-google-gray-600">{it.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </details>
            )}
            {it.status === 'done' && (
              <div className="mt-2 flex gap-3 text-sm">
                {it.xlsxUrl && <a className="font-medium text-google-blue hover:underline" href={it.xlsxUrl} download>Unduh .xlsx</a>}
                {it.pdfUrl && <a className="font-medium text-google-blue hover:underline" href={it.pdfUrl} download>Unduh .pdf</a>}
              </div>
            )}
          </li>
        ))}
      </ul>

      {job.zipUrl && <a className="btn-primary" href={job.zipUrl} download>Unduh semua (ZIP)</a>}
    </div>
  );
}
