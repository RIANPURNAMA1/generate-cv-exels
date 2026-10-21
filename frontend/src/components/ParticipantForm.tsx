import { useState, type FormEvent } from 'react';
import { GROUPS, SECTIONS, type FieldDef } from '../lib/catalog';
import { validateParticipantForm, type FieldErrors } from '../lib/schemas';
import type { DataRow } from '../types';
import { DynamicRows } from './DynamicRows';
import { PhotoCropper } from './PhotoCropper';

interface Props {
  initial?: DataRow;
  initialPhotoUrl?: string | null;
  optionsFor: (field: string) => string[] | null;
  submitLabel?: string;
  onSubmit: (data: DataRow, photo: Blob | null) => Promise<void> | void;
}

function Field({ def, value, error, options, onChange }: { def: FieldDef; value: string; error?: string; options: string[] | null; onChange: (v: string) => void }) {
  const id = def.name;
  const common = { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : undefined } as const;
  return (
    <div className={def.type === 'textarea' ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="label">{def.label}</label>
      {def.type === 'dropdown' && options ? (
        <select {...common} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— pilih —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : def.type === 'textarea' ? (
        <textarea {...common} className="input min-h-[4.5rem]" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} className="input" value={value} placeholder={def.hint} inputMode={def.type === 'number' ? 'decimal' : undefined} onChange={(e) => onChange(e.target.value)} />
      )}
      {error && <p id={`${id}-err`} className="mt-0.5 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function ParticipantForm({ initial, initialPhotoUrl, optionsFor, submitLabel = 'Simpan peserta', onSubmit }: Props) {
  const [values, setValues] = useState<DataRow>(initial ?? {});
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const patch = (p: Record<string, string>) => setValues((v) => ({ ...v, ...p }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateParticipantForm(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBusy(true);
    try {
      const clean: DataRow = {};
      for (const [k, v] of Object.entries(values)) if (v.trim() !== '') clean[k] = v.trim();
      await onSubmit(clean, photo);
      setValues(initial ?? {});
      setPhoto(null);
    } finally {
      setBusy(false);
    }
  };

  const errList = Object.values(errors);
  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div aria-live="assertive" role="alert" className={errList.length ? 'rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800' : 'sr-only'}>
        {errList.length > 0 && <><strong>Periksa isian berikut:</strong><ul className="list-disc pl-5">{errList.map((m) => <li key={m}>{m}</li>)}</ul></>}
      </div>

      <PhotoCropper initialUrl={initialPhotoUrl ?? null} onChange={setPhoto} />

      {SECTIONS.map((sec) => (
        <fieldset key={sec.id} className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-navy">{sec.title}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {sec.fields.map((f) => (
              <Field key={f.name} def={f} value={values[f.name] ?? ''} error={errors[f.name]} options={f.type === 'dropdown' ? optionsFor(f.name) : null} onChange={(v) => patch({ [f.name]: v })} />
            ))}
          </div>
        </fieldset>
      ))}

      {GROUPS.map((g) => (
        <DynamicRows key={g.id} group={g} values={values} errors={errors} optionsFor={optionsFor} onPatch={patch} />
      ))}

      <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : submitLabel}</button>
    </form>
  );
}
