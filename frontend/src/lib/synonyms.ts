import { dropdownBase } from './formatter';

const tidak = ['tidak', 'no', 'nggak', 'ngga', 'gak', 'tdk', 'tidak ada', 'tidak punya', 'nihil', '-', '0', 'belum'];
const ya = ['ya', 'yes', 'ada', 'punya', 'iya', 'y'];

/** Cermin ringkas config/cv_synonyms.php (backend tetap sumber kebenaran). */
export const SYNONYMS: Record<string, Record<string, string[]>> = {
  jenis_kelamin: { 'laki-laki': ['laki', 'laki laki', 'pria', 'cowok', 'male', 'l', 'm'], perempuan: ['wanita', 'cewek', 'female', 'p', 'f'] },
  status_nikah: { 'belum menikah': ['belum kawin', 'lajang', 'single', 'bujang', 'belum nikah'], menikah: ['kawin', 'sudah menikah', 'married', 'sudah nikah'] },
  agama: { islam: ['muslim'], kristen: ['protestan'], katolik: ['katholik'], hindu: [], buddha: ['budha'], konghucu: ['khonghucu'] },
  pernah_ke_jepang: { 'belum pernah': tidak, pernah: ['sudah pernah', 'ya', 'ada'] },
  paspor: { 'belum punya': [...tidak, 'belum ada'], 'sudah punya': ['punya', 'ada', 'ya', 'sudah ada', 'sudah'] },
  tangan_dominan: { kanan: ['right', 'tangan kanan'], kiri: ['left', 'tangan kiri'] },
  riwayat_penyakit: { 'tidak ada': tidak, ada: ya },
  merokok: { tidak: tidak, ya: [...ya, 'merokok', 'perokok'] },
  alkohol: { tidak: tidak, ya: [...ya, 'minum'] },
  jlpt_ada: { ada: ya, 'tidak ada': tidak },
  keluarga_hubungan: {
    ayah: ['bapak', 'papa', 'bapa', 'father'], ibu: ['mama', 'mamah', 'emak', 'mother'],
    kakak: ['kk', 'abang', 'mbak', 'mas', 'kakak laki-laki', 'kakak perempuan'], adik: ['adik laki-laki', 'adik perempuan'],
    suami: ['husband'], istri: ['isteri', 'wife'], anak: ['child', 'son', 'daughter'],
  },
};

/** Pilihan cadangan bila template tidak membawa daftar dropdown (hanya untuk form manual). */
export const FALLBACK_OPTIONS: Record<string, string[]> = {
  jenis_kelamin: ['Laki-laki（男）', 'Perempuan（女）'],
  status_nikah: ['Belum Menikah（未婚）', 'Menikah（既婚）'],
  agama: ['Islam（イスラム教）', 'Kristen（キリスト教）', 'Katolik（カトリック）', 'Hindu（ヒンドゥー教）', 'Buddha（仏教）', 'Konghucu（儒教）'],
  pernah_ke_jepang: ['Belum pernah（無）', 'Pernah（有）'],
  paspor: ['Belum punya（無）', 'Sudah punya（有）'],
  tangan_dominan: ['Kanan（右）', 'Kiri（左）'],
  riwayat_penyakit: ['Tidak ada（無）', 'Ada（有）'],
  merokok: ['Tidak（無）', 'Ya（有）'],
  alkohol: ['Tidak（無）', 'Ya（有）'],
  jlpt_ada: ['Ada（有）', 'Tidak ada（無）'],
  keluarga_hubungan: ['Ayah（父）', 'Ibu（母）', 'Kakak（兄・姉）', 'Adik（弟・妹）', 'Suami（夫）', 'Istri（妻）', 'Anak（子）'],
};

export function fieldKey(placeholder: string): string {
  return placeholder.replace(/_\d+_/, '_');
}

function norm(s: string): string {
  return dropdownBase(s);
}

export interface MatchResult {
  value: string | null;
  suggestion: string | null;
}

export function matchDropdown(placeholder: string, input: string, options: string[]): MatchResult {
  const raw = input.trim();
  if (!raw || options.length === 0) return { value: null, suggestion: null };
  if (options.includes(raw)) return { value: raw, suggestion: null };
  const table = SYNONYMS[fieldKey(placeholder)] ?? {};
  const n = norm(raw);
  for (const opt of options) {
    const base = dropdownBase(opt);
    if (n === base) return { value: opt, suggestion: null };
    if ((table[base] ?? []).some((syn) => norm(syn) === n)) return { value: opt, suggestion: null };
  }
  let best: string | null = null;
  let bestScore = 0;
  for (const opt of options) {
    const sc = similarity(n, dropdownBase(opt));
    if (sc > bestScore) {
      bestScore = sc;
      best = opt;
    }
  }
  return { value: null, suggestion: bestScore >= 0.5 ? best : null };
}

/** Rasio kemiripan sederhana (Dice coefficient atas bigram). */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let inter = 0;
  ga.forEach((c, g) => {
    inter += Math.min(c, gb.get(g) ?? 0);
  });
  return (2 * inter) / (Math.max(a.length - 1, 0) + Math.max(b.length - 1, 0) || 1);
}
