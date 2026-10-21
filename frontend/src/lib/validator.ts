import type { DetectedPlaceholder, GenerateOptions, Issue, Participant } from '../types';
import { FALLBACK_OPTIONS, matchDropdown, fieldKey } from './synonyms';
import { calcAge, parseDate, normalizePhone, period, todayJakarta, type YMD } from './formatter';
import { COMPUTED } from './catalog';

export interface ValidationContext {
  placeholders: DetectedPlaceholder[];
  mapping: Record<string, string>;
  options: GenerateOptions;
  today?: YMD;
}

export function participantLabel(p: Participant, mapping: Record<string, string> = {}): string {
  return (p.data[mapping.nama_romaji ?? 'nama_romaji'] ?? '').trim() || `Peserta ${p.id.slice(0, 6)}`;
}

/** Pemeriksaan sisi klien (cermin ValueFormatter backend; backend tetap sumber kebenaran). */
export function validateParticipants(participants: Participant[], ctx: ValidationContext): Issue[] {
  const issues: Issue[] = [];
  const today = ctx.today ?? todayJakarta();
  const names = new Set(ctx.placeholders.map((p) => p.name));
  const col = (name: string) => ctx.mapping[name] ?? name;

  for (const p of participants) {
    const label = participantLabel(p, ctx.mapping);
    const get = (name: string) => (p.data[col(name)] ?? '').trim();
    const add = (i: Omit<Issue, 'participantId' | 'participantLabel'>) => issues.push({ participantId: p.id, participantLabel: label, ...i });

    if (!get('nama_romaji')) add({ field: 'nama_romaji', message: 'Nama (romaji) kosong.', severity: 'error', current: '' });

    // Tanggal lahir dan usia
    const birthRaw = get('tanggal_lahir');
    const birth = birthRaw ? parseDate(birthRaw) : null;
    if (birthRaw && !birth) add({ field: 'tanggal_lahir', message: 'Tanggal lahir tidak dikenali.', severity: 'warning', current: birthRaw });
    if (birth && ctx.options.autoAge && names.has('usia')) {
      const given = get('usia');
      const age = calcAge(birth, today);
      if (given && Number(given) !== age) add({ field: 'usia', message: `Usia di data (${given}) berbeda dari hasil hitung (${age}); memakai hasil hitung.`, severity: 'warning', current: given, suggestion: String(age) });
    }

    // HP
    for (const f of ['no_hp', 'kontak_darurat_telp']) {
      if (!names.has(f)) continue;
      const v = get(f);
      if (v && ctx.options.normalizePhone) {
        const r = normalizePhone(v);
        if (!r.value) add({ field: f, message: `${f}: ${r.warning ?? 'tidak valid'}`, severity: 'warning', current: v });
      }
    }

    // Dropdown
    for (const ph of ctx.placeholders) {
      if (COMPUTED.has(ph.name) || ph.name === 'foto') continue;
      const opts = ph.options && ph.options.length ? ph.options : null;
      if (!opts) continue;
      const v = get(ph.name);
      if (!v) continue;
      const r = matchDropdown(ph.name, v, opts);
      if (!r.value) {
        add({ field: ph.name, message: `${ph.name}: '${v}' tidak cocok dengan pilihan dropdown.`, severity: 'warning', current: v, choices: opts, ...(r.suggestion ? { suggestion: r.suggestion } : {}) });
      }
    }

    // Konsistensi
    for (const f of ['riwayat_penyakit', 'sim_status']) {
      const v = get(f);
      if (v && /(tidak|belum|nihil|none)/i.test(v) && v.includes('（有）')) {
        add({ field: f, message: `${f}: '${v}' bertentangan (（有） berarti ada).`, severity: 'warning', current: v });
      }
    }
    for (const f of ['merokok', 'alkohol']) {
      const v = get(f);
      if (['0', '1', '2'].includes(v)) add({ field: f, message: `${f}: nilai '${v}' ambigu; periksa kembali.`, severity: 'warning', current: v });
    }

    // Periode terbalik
    for (const [grp, max] of [['pendidikan', 4], ['kerja', 4]] as const) {
      for (let i = 1; i <= max; i++) {
        const a = period(get(`${grp}_${i}_mulai`));
        const b = period(get(`${grp}_${i}_selesai`));
        if (a.y && b.y && a.y * 100 + (a.m ?? 1) > b.y * 100 + (b.m ?? 12)) {
          add({ field: `${grp}_${i}_mulai`, message: `${grp} ${i}: periode mulai lebih akhir daripada selesai.`, severity: 'warning', current: get(`${grp}_${i}_mulai`) });
        }
      }
    }

    // Foto
    if (names.has('foto') && !p.hasPhoto) add({ field: null, message: 'Foto belum ada.', severity: 'warning' });
  }
  return issues;
}

export function dropdownChoicesFor(field: string, templateOptions: string[] | null): string[] | null {
  return templateOptions && templateOptions.length ? templateOptions : FALLBACK_OPTIONS[fieldKey(field)] ?? null;
}
