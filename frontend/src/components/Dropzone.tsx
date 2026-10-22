import { useId, useRef, useState, type DragEvent } from 'react';
import { Icon } from './Icon';

interface Props {
  accept: string; // contoh ".xlsx"
  label: string;
  hint?: string;
  notes?: string[]; // badge format berkas
  cta?: string;
  disabled?: boolean;
  busy?: boolean;
  onFile: (file: File) => void;
}

/** Area unggah gaya Material: ikon, tombol primer pill, dan badge format berkas. */
export function Dropzone({ accept, label, hint, notes, cta = 'Pilih file dari komputer', disabled, busy, onFile }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (f: File | undefined) => f && onFile(f);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) pick(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-8 text-center transition-colors duration-200 ${
        over ? 'border-google-blue bg-google-blue-surface' : 'border-google-gray-300 bg-google-gray-50 hover:border-google-blue hover:bg-google-blue-surface/40'
      } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-google-blue shadow-card">
        <Icon name="upload" className="h-6 w-6" />
      </span>

      <div>
        <p className="text-base font-semibold text-google-gray-900">{busy ? 'Memproses berkas…' : label}</p>
        {hint && <p id={`${id}-hint`} className="mt-1 max-w-md text-sm text-google-gray-600">{hint}</p>}
      </div>

      <button type="button" className="btn-primary" disabled={disabled || busy} onClick={() => input.current?.click()}>
        <Icon name="upload" className="h-4 w-4" />
        {busy ? 'Memproses…' : cta}
      </button>

      {notes && notes.length > 0 && (
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {notes.map((n) => (
            <li key={n} className="pill bg-white text-google-gray-600">{n}</li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
        aria-describedby={`${id}-hint`}
        data-testid={`dropzone-${accept.replace(/[^a-z]/g, '')}`}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
