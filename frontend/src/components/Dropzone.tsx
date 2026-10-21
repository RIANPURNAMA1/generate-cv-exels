import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';

interface Props {
  accept: string; // contoh ".xlsx"
  label: string;
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
  onFile: (file: File) => void;
}

export function Dropzone({ accept, label, hint, disabled, busy, onFile }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (f: File | undefined) => f && onFile(f);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) pick(e.dataTransfer.files[0]);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-describedby={`${id}-hint`}
      onKeyDown={onKey}
      onClick={() => !disabled && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors ${over ? 'border-navy bg-navy-50' : 'border-slate-300 hover:border-navy'} ${disabled ? 'opacity-50' : ''}`}
    >
      <span className="text-sm font-medium text-navy">{busy ? 'Memproses…' : label}</span>
      <span id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint ?? `Seret berkas ke sini atau tekan Enter untuk memilih (${accept})`}</span>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
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
