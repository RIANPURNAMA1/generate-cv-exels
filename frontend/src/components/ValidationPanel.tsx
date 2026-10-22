import { useState } from 'react';
import type { Issue } from '../types';

function IssueRow({ issue, onFix }: { issue: Issue; onFix: (participantId: string, field: string, value: string) => void }) {
  const [val, setVal] = useState(issue.suggestion ?? issue.current ?? '');
  const id = `fix-${issue.participantId}-${issue.field}`;
  return (
    <li className="rounded-md border border-slate-200 p-2 text-sm">
      <p className={issue.severity === 'error' ? 'text-google-red' : 'text-google-yellow-hover'}>
        <span className={`badge mr-2 ${issue.severity === 'error' ? 'bg-google-red-surface text-google-red' : 'bg-google-yellow-surface text-google-yellow-hover'}`}>{issue.severity === 'error' ? 'Galat' : 'Peringatan'}</span>
        {issue.message}
      </p>
      {issue.field && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <label htmlFor={id} className="label text-xs">Perbaiki nilai {issue.field}</label>
            {issue.choices ? (
              <select id={id} className="input py-1" value={val} onChange={(e) => setVal(e.target.value)}>
                <option value="">— pilih —</option>
                {issue.choices.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input id={id} className="input py-1" value={val} onChange={(e) => setVal(e.target.value)} />
            )}
          </div>
          <button type="button" className="btn-secondary py-1" onClick={() => issue.field && onFix(issue.participantId, issue.field, val)}>Terapkan</button>
        </div>
      )}
    </li>
  );
}

export function ValidationPanel({ issues, onFix }: { issues: Issue[]; onFix: (participantId: string, field: string, value: string) => void }) {
  if (issues.length === 0) {
    return <p role="status" className="rounded-inner border border-google-green-border bg-google-green-surface p-3 text-sm text-google-green-hover">Tidak ada masalah validasi. ✓</p>;
  }
  const byPerson = new Map<string, Issue[]>();
  for (const i of issues) byPerson.set(i.participantId, [...(byPerson.get(i.participantId) ?? []), i]);
  return (
    <div className="space-y-3" aria-live="polite">
      <p className="text-sm text-google-gray-600">{issues.length} catatan pada {byPerson.size} peserta. Peringatan tidak menghentikan pembuatan CV.</p>
      {Array.from(byPerson.entries()).map(([pid, list]) => (
        <details key={pid} className="rounded-md border border-slate-200 p-3" open={byPerson.size <= 3}>
          <summary className="cursor-pointer text-sm font-semibold text-google-gray-900">{list[0]?.participantLabel} <span className="font-normal text-google-gray-500">({list.length})</span></summary>
          <ul className="mt-2 space-y-2">
            {list.map((i, k) => <IssueRow key={`${i.field}-${k}-${i.message}`} issue={i} onFix={onFix} />)}
          </ul>
        </details>
      ))}
    </div>
  );
}
