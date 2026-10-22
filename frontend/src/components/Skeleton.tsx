import { Icon, type IconName } from './Icon';

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true" aria-label="Memuat">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 rounded-md bg-google-gray-200" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, icon = 'file' }: { title: string; hint?: string; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-google-gray-300 bg-google-gray-50 px-6 py-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-google-gray-400 shadow-card">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-google-gray-700">{title}</p>
      {hint && <p className="max-w-sm text-xs text-google-gray-500">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="banner-error flex flex-wrap items-center gap-3">
      <Icon name="alert" className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <button type="button" className="btn-sm rounded-full border border-google-red-border bg-white px-3 py-1.5 text-xs font-medium text-google-red transition-colors hover:bg-white/70" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}
