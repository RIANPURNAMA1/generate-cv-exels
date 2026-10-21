import { useNavigate, Link } from 'react-router-dom';
import { JobProgress } from '../components/JobProgress';
import { EmptyState, ErrorState } from '../components/Skeleton';
import { useJob } from '../hooks/useJobPolling';
import { useWizard } from '../state/wizard';

export function ResultPage() {
  const { state, dispatch } = useWizard();
  const nav = useNavigate();
  const job = useJob(state.jobId);

  if (!state.jobId) return <EmptyState title="Belum ada proses pembuatan CV" hint="Mulai dari langkah pencocokan." />;

  return (
    <div className="space-y-6">
      <section className="card space-y-3" aria-labelledby="r-title">
        <h2 id="r-title" className="text-base font-semibold text-navy">Langkah 4 · Hasil</h2>
        {job.isError ? <ErrorState message="Status pembuatan CV gagal dimuat." onRetry={() => void job.refetch()} /> : <JobProgress job={job.data} />}
        {job.data?.status === 'failed' && <ErrorState message="Pembuatan CV gagal untuk semua peserta. Periksa peringatan lalu coba lagi." />}
        <p className="text-xs text-slate-500">Tautan unduhan berlaku 15 menit dan data dihapus otomatis setelah 24 jam. Muat ulang halaman ini untuk tautan baru.</p>
      </section>
      <div className="flex justify-between">
        <Link to="/matching" className="btn-secondary">← Kembali</Link>
        <button type="button" className="btn-primary" onClick={() => { dispatch({ type: 'RESET_SESSION' }); nav('/data'); }}>Buat lagi dengan template yang sama</button>
      </div>
    </div>
  );
}
