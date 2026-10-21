import { describe, expect, it } from 'vitest';
import { validateParticipantForm } from './schemas';

describe('validateParticipantForm', () => {
  it('nama wajib dan pesan berbahasa Indonesia', () => {
    expect(validateParticipantForm({}).nama_romaji).toBe('Nama (romaji) wajib diisi.');
  });
  it('menolak tanggal, HP, dan angka tidak valid', () => {
    const e = validateParticipantForm({ nama_romaji: 'Retno', tanggal_lahir: '31/02/1990', no_hp: 'abc', tinggi: '17x' });
    expect(e.tanggal_lahir).toContain('tidak dikenali');
    expect(e.no_hp).toBe('No. HP tidak valid.');
    expect(e.tinggi).toBe('Tinggi harus berupa angka.');
  });
  it('lolos untuk data valid', () => {
    expect(validateParticipantForm({ nama_romaji: 'Retno', tanggal_lahir: '20 April 1993', no_hp: '0812345678', tinggi: '158 cm' })).toEqual({});
  });
});
