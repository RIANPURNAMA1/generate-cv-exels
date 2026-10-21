export type FieldType = 'text' | 'number' | 'date' | 'dropdown' | 'textarea';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  hint?: string;
}

export interface Section {
  id: string;
  title: string;
  fields: FieldDef[];
}

export interface GroupDef {
  id: 'pendidikan' | 'kerja' | 'keluarga';
  title: string;
  max: number;
  sub: Array<{ key: string; label: string; type: FieldType; hint?: string }>;
}

/** Placeholder yang dihitung otomatis (tidak perlu ada di data). */
export const COMPUTED = new Set(['usia', 'tanggal_lahir_jp']);

export const SECTIONS: Section[] = [
  {
    id: 'diri', title: 'Data diri',
    fields: [
      { name: 'nama_romaji', label: 'Nama (romaji) / 氏名', type: 'text' },
      { name: 'nama_katakana', label: 'Nama (katakana) / 氏名カナ', type: 'text' },
      { name: 'tanggal_lahir', label: 'Tanggal lahir / 生年月日', type: 'date', hint: 'YYYY-MM-DD, DD/MM/YYYY, atau 20 April 1993' },
      { name: 'tempat_lahir', label: 'Tempat lahir / 出生地', type: 'text' },
      { name: 'jenis_kelamin', label: 'Jenis kelamin / 性別', type: 'dropdown' },
      { name: 'no_hp', label: 'No. HP / 電話番号', type: 'text' },
      { name: 'alamat', label: 'Alamat / 住所', type: 'textarea' },
      { name: 'kontak_darurat_telp', label: 'Telp. kontak darurat', type: 'text' },
      { name: 'kontak_darurat_hubungan', label: 'Hubungan kontak darurat', type: 'dropdown' },
    ],
  },
  {
    id: 'fisik', title: 'Fisik',
    fields: [
      { name: 'tinggi', label: 'Tinggi (cm)', type: 'number' },
      { name: 'berat', label: 'Berat (kg)', type: 'number' },
      { name: 'ukuran_sepatu', label: 'Ukuran sepatu', type: 'number' },
      { name: 'lingkar_pinggang', label: 'Lingkar pinggang', type: 'number' },
      { name: 'golongan_darah', label: 'Golongan darah', type: 'text' },
      { name: 'penglihatan_kanan', label: 'Penglihatan kanan', type: 'text' },
      { name: 'penglihatan_kiri', label: 'Penglihatan kiri', type: 'text' },
    ],
  },
  {
    id: 'status', title: 'Status',
    fields: [
      { name: 'status_nikah', label: 'Status nikah', type: 'dropdown' },
      { name: 'agama', label: 'Agama', type: 'dropdown' },
      { name: 'pernah_ke_jepang', label: 'Pernah ke Jepang', type: 'dropdown' },
      { name: 'paspor', label: 'Paspor', type: 'dropdown' },
      { name: 'tangan_dominan', label: 'Tangan dominan', type: 'dropdown' },
      { name: 'riwayat_penyakit', label: 'Riwayat penyakit', type: 'dropdown' },
      { name: 'merokok', label: 'Merokok', type: 'dropdown' },
      { name: 'alkohol', label: 'Alkohol', type: 'dropdown' },
    ],
  },
  {
    id: 'personal', title: 'Informasi personal',
    fields: [
      { name: 'promosi_diri', label: 'Promosi diri', type: 'textarea' },
      { name: 'tujuan_ke_jepang', label: 'Tujuan ke Jepang', type: 'textarea' },
      { name: 'tujuan_setelah_pulang', label: 'Tujuan setelah pulang', type: 'textarea' },
      { name: 'kelebihan', label: 'Kelebihan', type: 'textarea' },
      { name: 'kekurangan', label: 'Kekurangan', type: 'textarea' },
      { name: 'keahlian', label: 'Keahlian', type: 'textarea' },
      { name: 'hobi', label: 'Hobi', type: 'textarea' },
    ],
  },
  {
    id: 'sertifikat', title: 'Sertifikat',
    fields: [
      { name: 'jlpt_ada', label: 'Punya JLPT', type: 'dropdown' },
      { name: 'jlpt_level', label: 'Level JLPT', type: 'text' },
      { name: 'sim_status', label: 'SIM (status + jenis)', type: 'text', hint: 'Contoh: A, C （有）' },
      { name: 'ssw_bidang', label: 'Bidang SSW', type: 'dropdown' },
    ],
  },
  {
    id: 'kerabat', title: 'Kerabat di Jepang',
    fields: [
      { name: 'kerabat_nama', label: 'Nama', type: 'text' },
      { name: 'kerabat_hubungan', label: 'Hubungan', type: 'dropdown' },
      { name: 'kerabat_pekerjaan', label: 'Pekerjaan', type: 'text' },
      { name: 'kerabat_usia', label: 'Usia', type: 'text' },
      { name: 'kerabat_alamat', label: 'Alamat', type: 'textarea' },
      { name: 'catatan_tambahan', label: 'Catatan tambahan', type: 'textarea' },
    ],
  },
];

export const GROUPS: GroupDef[] = [
  {
    id: 'pendidikan', title: 'Pendidikan', max: 4,
    sub: [
      { key: 'mulai', label: 'Mulai', type: 'text', hint: '2005-07' },
      { key: 'selesai', label: 'Selesai', type: 'text', hint: '2011-06' },
      { key: 'sekolah', label: 'Sekolah', type: 'text' },
      { key: 'jurusan', label: 'Jurusan', type: 'text' },
    ],
  },
  {
    id: 'kerja', title: 'Pekerjaan', max: 4,
    sub: [
      { key: 'mulai', label: 'Mulai', type: 'text', hint: '2015-07' },
      { key: 'selesai', label: 'Selesai', type: 'text', hint: '2019-08' },
      { key: 'perusahaan', label: 'Perusahaan', type: 'text' },
      { key: 'jenis', label: 'Jenis pekerjaan', type: 'text' },
      { key: 'gaji', label: 'Gaji', type: 'text' },
    ],
  },
  {
    id: 'keluarga', title: 'Keluarga', max: 5,
    sub: [
      { key: 'hubungan', label: 'Hubungan', type: 'dropdown' },
      { key: 'nama', label: 'Nama', type: 'text' },
      { key: 'usia', label: 'Usia', type: 'text' },
      { key: 'pekerjaan', label: 'Pekerjaan', type: 'text' },
      { key: 'gaji', label: 'Gaji', type: 'text' },
    ],
  },
];

export const GROUP_RE = /^(pendidikan|kerja|keluarga)_(\d+)_([a-z0-9]+)$/;

export function isRepeating(name: string): boolean {
  return GROUP_RE.test(name);
}

export function kindOf(p: { name: string; type: string; options: string[] | null }): 'biasa' | 'foto' | 'berulang' | 'dropdown' {
  if (p.name === 'foto' || p.type === 'photo') return 'foto';
  if (isRepeating(p.name)) return 'berulang';
  if (p.type === 'dropdown' || (p.options && p.options.length > 0)) return 'dropdown';
  return 'biasa';
}
