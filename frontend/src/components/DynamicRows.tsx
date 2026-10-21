import { useState } from 'react';
import type { GroupDef } from '../lib/catalog';
import type { FieldErrors } from '../lib/schemas';

interface Props {
  group: GroupDef;
  values: Record<string, string>;
  errors: FieldErrors;
  optionsFor: (field: string) => string[] | null;
  onPatch: (patch: Record<string, string>) => void;
}

function initialCount(group: GroupDef, values: Record<string, string>): number {
  let n = 1;
  for (let i = 1; i <= group.max; i++) {
    if (group.sub.some((s) => (values[`${group.id}_${i}_${s.key}`] ?? '').trim() !== '')) n = i;
  }
  return n;
}

/** Baris dinamis untuk pendidikan (maks 4), kerja (maks 4), keluarga (maks 5). */
export function DynamicRows({ group, values, errors, optionsFor, onPatch }: Props) {
  const [count, setCount] = useState(() => initialCount(group, values));

  const name = (i: number, key: string) => `${group.id}_${i}_${key}`;

  const removeRow = (idx: number) => {
    const patch: Record<string, string> = {};
    for (let i = idx; i <= count; i++) {
      for (const s of group.sub) patch[name(i, s.key)] = i < count ? values[name(i + 1, s.key)] ?? '' : '';
    }
    onPatch(patch);
    setCount((c) => Math.max(1, c - 1));
  };

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold text-navy">{group.title}</legend>
      {Array.from({ length: count }, (_, k) => k + 1).map((i) => (
        <div key={i} className="rounded-md border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{group.title} {i}</span>
            {count > 1 && (
              <button type="button" className="text-xs text-red-700 underline" onClick={() => removeRow(i)} aria-label={`Hapus baris ${group.title} ${i}`}>
                Hapus baris
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.sub.map((s) => {
              const n = name(i, s.key);
              const opts = s.type === 'dropdown' ? optionsFor(n) : null;
              const err = errors[n];
              return (
                <div key={n}>
                  <label htmlFor={n} className="label">{s.label}</label>
                  {opts ? (
                    <select id={n} className="input" value={values[n] ?? ''} onChange={(e) => onPatch({ [n]: e.target.value })}>
                      <option value="">— pilih —</option>
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input id={n} className="input" value={values[n] ?? ''} placeholder={s.hint} onChange={(e) => onPatch({ [n]: e.target.value })} aria-invalid={!!err} />
                  )}
                  {err && <p className="mt-0.5 text-xs text-red-700">{err}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {count < group.max && (
        <button type="button" className="btn-secondary" onClick={() => setCount((c) => c + 1)}>
          + Tambah baris {group.title.toLowerCase()}
        </button>
      )}
    </fieldset>
  );
}
