import { describe, expect, it } from 'vitest';
import type { DetectedPlaceholder } from '../types';
import { autoMatch, statusOf, unusedColumns } from './automatch';

const ph = (name: string): DetectedPlaceholder => ({ name, type: 'text', cells: ['A1'], sheet: 'CV', options: null, known: true });

describe('autoMatch', () => {
  const placeholders = [ph('nama_romaji'), ph('alamat'), ph('tinggi'), ph('foto'), ph('usia')];
  const columns = ['Nama Romaji', 'alamat', 'catatan', 'tanggal_lahir'];

  it('mencocokkan nama sama tanpa membedakan huruf besar/spasi', () => {
    expect(autoMatch(placeholders, columns)).toEqual({ nama_romaji: 'Nama Romaji', alamat: 'alamat' });
  });
  it('menentukan status per baris', () => {
    const m = autoMatch(placeholders, columns);
    expect(statusOf(ph('alamat'), m, columns, true)).toBe('cocok');
    expect(statusOf(ph('tinggi'), m, columns, true)).toBe('belum_ada_data');
    expect(statusOf(ph('foto'), m, columns, true)).toBe('foto');
    expect(statusOf(ph('usia'), m, columns, true)).toBe('terhitung');
    expect(statusOf(ph('usia'), m, ['alamat'], false)).toBe('belum_ada_data');
  });
  it('menandai kolom tidak terpakai', () => {
    const m = autoMatch(placeholders, columns);
    expect(unusedColumns(columns, m, placeholders)).toEqual(['catatan']);
  });
});
