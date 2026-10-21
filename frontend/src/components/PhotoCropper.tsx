import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

interface Props {
  initialUrl?: string | null;
  onChange: (blob: Blob | null) => void;
}

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Gambar tidak dapat dimuat.'));
    i.src = src;
  });
  const scale = Math.min(1, 800 / area.width, 1067 / area.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal memotong foto.'))), 'image/jpeg', 0.9));
}

/** Upload foto + crop rasio 3:4. Hasil berupa Blob JPEG. */
export function PhotoCropper({ initialUrl, onChange }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPreview(initialUrl ?? null), [initialUrl]);
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  const pick = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!['image/jpeg', 'image/png'].includes(f.type)) return setError('Foto harus JPG atau PNG.');
    if (f.size > 5 * 1024 * 1024) return setError('Foto maksimal 5 MB.');
    setSrc(URL.createObjectURL(f));
    setZoom(1);
  };

  const apply = async () => {
    if (!src || !area) return;
    try {
      const blob = await cropToBlob(src, area);
      setPreview(URL.createObjectURL(blob));
      onChange(blob);
      setSrc(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memotong foto.');
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="foto-input" className="label">Foto (rasio 3:4, JPG/PNG maks 5 MB)</label>
      {src ? (
        <div className="space-y-2">
          <div className="relative h-72 w-56 overflow-hidden rounded-md bg-slate-900">
            <Cropper image={src} crop={crop} zoom={zoom} aspect={3 / 4} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
          </div>
          <label className="block text-xs text-slate-600">
            Perbesar
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="ml-2 align-middle" />
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={apply}>Terapkan potongan</button>
            <button type="button" className="btn-secondary" onClick={() => setSrc(null)}>Batal</button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-3">
          {preview ? <img src={preview} alt="Pratinjau foto peserta" className="h-32 w-24 rounded-md border border-slate-200 object-cover" /> : <div className="flex h-32 w-24 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">Belum ada</div>}
          <div>
            <input id="foto-input" type="file" accept="image/jpeg,image/png" className="text-sm" onChange={(e) => pick(e.target.files?.[0])} />
            {preview && <button type="button" className="mt-1 block text-xs text-red-700 underline" onClick={() => { setPreview(null); onChange(null); }}>Hapus foto</button>}
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
