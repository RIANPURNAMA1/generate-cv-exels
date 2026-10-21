const MONTHS: Record<string, number> = {
  januari: 1, jan: 1, februari: 2, feb: 2, pebruari: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5,
  juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, november: 11, nov: 11, nopember: 11, desember: 12, des: 12,
};

export interface YMD {
  y: number;
  m: number;
  d: number;
}

function valid(y: number, m: number, d: number): YMD | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? { y, m, d } : null;
}

/** Terima YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, "20 April 1993". */
export function parseDate(value: string): YMD | null {
  const s = value.trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);
  if (m) return valid(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/.exec(s);
  if (m) {
    const mon = MONTHS[(m[2] ?? '').toLowerCase()];
    return mon ? valid(Number(m[3]), mon, Number(m[1])) : null;
  }
  return null;
}

export function jpDate(d: YMD): string {
  return `年${d.y} 月${String(d.m).padStart(2, '0')} 日${String(d.d).padStart(2, '0')}`;
}

/** Tanggal hari ini di zona Asia/Jakarta. */
export function todayJakarta(now: Date = new Date()): YMD {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [y, m, d] = parts.split('-').map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

export function calcAge(birth: YMD, today: YMD = todayJakarta()): number {
  let age = today.y - birth.y;
  if (today.m < birth.m || (today.m === birth.m && today.d < birth.d)) age -= 1;
  return age;
}

/** "(+62)8xxxxxxxxxx" atau null dengan alasan. */
export function normalizePhone(value: string): { value: string | null; warning: string | null } {
  const raw = value.trim();
  if (!raw) return { value: null, warning: null };
  if (/[A-Za-z]/.test(raw)) return { value: null, warning: 'No. HP mengandung huruf.' };
  let digits = raw.replace(/\D+/g, '');
  while (digits.startsWith('62') && digits.length > 11) digits = digits.slice(2);
  if (digits.startsWith('62')) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');
  if (digits.length < 8 || digits.length > 13) return { value: null, warning: 'Panjang No. HP tidak wajar.' };
  return { value: `(+62)${digits}`, warning: null };
}

/** "2000年07月" dari 2000-07, 07/2000, "Juli 2000", Y-m-d, d/m/Y. */
export function period(value: string): { text: string | null; y: number | null; m: number | null } {
  const s = value.trim();
  if (!s) return { text: null, y: null, m: null };
  const fmt = (y: number, m: number) => ({ text: `${y}年${String(m).padStart(2, '0')}月`, y, m });
  let r = /^(\d{4})年\s*(\d{1,2})月$/.exec(s);
  if (r) return fmt(Number(r[1]), Number(r[2]));
  r = /^(\d{4})[/\-.](\d{1,2})$/.exec(s);
  if (r && Number(r[2]) >= 1 && Number(r[2]) <= 12) return fmt(Number(r[1]), Number(r[2]));
  r = /^(\d{1,2})[/\-.](\d{4})$/.exec(s);
  if (r && Number(r[1]) >= 1 && Number(r[1]) <= 12) return fmt(Number(r[2]), Number(r[1]));
  r = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(s);
  if (r) {
    const mon = MONTHS[(r[1] ?? '').toLowerCase()];
    if (mon) return fmt(Number(r[2]), mon);
  }
  r = /^(\d{4})$/.exec(s);
  if (r) return { text: `${r[1]}年`, y: Number(r[1]), m: null };
  const d = parseDate(s);
  return d ? fmt(d.y, d.m) : { text: null, y: null, m: null };
}

export function dropdownBase(option: string): string {
  return option.replace(/[（(].*?[）)]/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function slug(name: string): string {
  const s = name.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s || 'peserta';
}
