import { z } from 'zod';
import { parseDate, normalizePhone } from './formatter';

const optionalNumber = (label: string) =>
  z.string().refine((v) => v.trim() === '' || /^\s*[\d.,]+\s*(cm|kg|mm)?\s*$/i.test(v), `${label} harus berupa angka.`);

/** Skema form peserta (nilai berupa string; baris dinamis memakai kunci grup_N_field). */
export const participantSchema = z
  .object({
    nama_romaji: z.string().trim().min(2, 'Nama (romaji) wajib diisi.'),
    tanggal_lahir: z.string().refine((v) => v.trim() === '' || parseDate(v) !== null, 'Tanggal lahir tidak dikenali. Gunakan YYYY-MM-DD, DD/MM/YYYY, atau 20 April 1993.'),
    no_hp: z.string().refine((v) => v.trim() === '' || normalizePhone(v).value !== null, 'No. HP tidak valid.'),
    kontak_darurat_telp: z.string().refine((v) => v.trim() === '' || normalizePhone(v).value !== null, 'Telp. kontak darurat tidak valid.'),
    tinggi: optionalNumber('Tinggi'),
    berat: optionalNumber('Berat'),
    ukuran_sepatu: optionalNumber('Ukuran sepatu'),
    lingkar_pinggang: optionalNumber('Lingkar pinggang'),
  })
  .passthrough();

export type FieldErrors = Record<string, string>;

export function validateParticipantForm(data: Record<string, string>): FieldErrors {
  const res = participantSchema.safeParse({
    nama_romaji: '', tanggal_lahir: '', no_hp: '', kontak_darurat_telp: '', tinggi: '', berat: '', ukuran_sepatu: '', lingkar_pinggang: '',
    ...data,
  });
  if (res.success) return {};
  const errors: FieldErrors = {};
  for (const issue of res.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
