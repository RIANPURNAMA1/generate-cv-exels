import { describe, expect, it } from 'vitest';
import type { DetectedPlaceholder, Participant } from '../types';
import { validateParticipants } from './validator';

const ph = (name: string, options: string[] | null = null): DetectedPlaceholder => ({ name, type: options ? 'dropdown' : 'text', cells: ['A1'], sheet: 'CV', options, known: true });
const placeholders = [
  ph('nama_romaji'), ph('tanggal_lahir'), ph('usia'), ph('no_hp'), ph('foto'), ph('merokok', ['Tidak（無）', 'Ya（有）']),
  ph('riwayat_penyakit', ['Tidak ada（無）', 'Ada（有）']), ph('sim_status'), ph('pendidikan_1_mulai'), ph('pendidikan_1_selesai'),
];
const ctx = { placeholders, mapping: {}, options: { pdf: false, normalizePhone: true, autoAge: true, jpDate: true }, today: { y: 2026, m: 10, d: 20 } };
const P = (id: string, data: Record<string, string>, hasPhoto = false): Participant => ({ id, data, hasPhoto });

describe('validateParticipants', () => {
  it('tidak ada masalah untuk data bersih', () => {
    const issues = validateParticipants([P('a', { nama_romaji: 'RETNO', tanggal_lahir: '1993-04-20', usia: '33', no_hp: '081234567890', merokok: 'tidak' }, true)], ctx);
    expect(issues).toEqual([]);
  });
  it('mendeteksi data janggal', () => {
    const issues = validateParticipants([P('b', {
      nama_romaji: '', tanggal_lahir: '31/02/1990', no_hp: 'abc', riwayat_penyakit: 'Tidak ada（有）', sim_status: 'Tidak ada（有）',
      merokok: '1', pendidikan_1_mulai: '2012-01', pendidikan_1_selesai: '2008-01',
    })], ctx);
    const msgs = issues.map((i) => i.message).join('\n');
    expect(issues.some((i) => i.severity === 'error' && i.field === 'nama_romaji')).toBe(true);
    expect(msgs).toContain('Tanggal lahir tidak dikenali');
    expect(msgs).toContain('No. HP');
    expect(msgs).toContain('bertentangan');
    expect(msgs).toContain('ambigu');
    expect(msgs).toContain('periode mulai lebih akhir');
    expect(msgs).toContain('Foto belum ada');
  });
  it('usia tidak cocok memakai hasil hitung dan menawarkan nilai', () => {
    const [i] = validateParticipants([P('c', { nama_romaji: 'X', tanggal_lahir: '1993-04-20', usia: '25' }, true)], ctx);
    expect(i?.suggestion).toBe('33');
  });
  it('dropdown tidak cocok memberi pilihan dan usulan', () => {
    const issues = validateParticipants([P('d', { nama_romaji: 'X', merokok: 'Yaa' }, true)], ctx);
    const d = issues.find((i) => i.field === 'merokok');
    expect(d?.choices).toContain('Ya（有）');
    expect(d?.suggestion).toBe('Ya（有）');
  });
  it('sinonim dropdown dianggap cocok', () => {
    expect(validateParticipants([P('e', { nama_romaji: 'X', merokok: 'tidak' }, true)], ctx)).toEqual([]);
  });
});
