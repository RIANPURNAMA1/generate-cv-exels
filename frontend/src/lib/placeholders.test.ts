import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { groupPlaceholders, parsePlaceholders } from './placeholders';

function wb(cells: Record<string, string>, merges: string[] = []): XLSX.WorkBook {
  const ws: XLSX.WorkSheet = {};
  for (const [a, v] of Object.entries(cells)) ws[a] = { t: 's', v };
  ws['!ref'] = 'A1:Z60';
  if (merges.length) ws['!merges'] = merges.map((m) => XLSX.utils.decode_range(m));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, ws, 'CV');
  return book;
}

describe('parsePlaceholders', () => {
  it('mendeteksi placeholder biasa, campuran teks, merge, dan grup', () => {
    const found = parsePlaceholders(wb(
      { E9: '{nama_romaji}', E11: '年{tahun_lahir} 月{bulan_lahir} 日{tgl_lahir}', A5: '{foto}', A25: '{pendidikan_1_mulai}', L11: '{status_nikah}', B1: 'teks biasa', C1: '{Huruf_Besar}' },
      ['A5:D18'],
    ));
    const names = found.map((p) => p.name).sort();
    expect(names).toEqual(['bulan_lahir', 'foto', 'nama_romaji', 'pendidikan_1_mulai', 'status_nikah', 'tahun_lahir', 'tgl_lahir']);
    expect(found.find((p) => p.name === 'foto')?.cells[0]).toBe('A5 (A5:D18)');
  });
  it('mengelompokkan: biasa, foto, berulang, dropdown', () => {
    const list = parsePlaceholders(wb({ A1: '{alamat}', A2: '{foto}', A3: '{kerja_2_gaji}' }));
    list.push({ name: 'agama', type: 'dropdown', cells: ['L12'], sheet: 'CV', options: ['Islam（イスラム教）'], known: true });
    const g = groupPlaceholders(list);
    expect(g.biasa.map((p) => p.name)).toEqual(['alamat']);
    expect(g.foto.map((p) => p.name)).toEqual(['foto']);
    expect(g.berulang.map((p) => p.name)).toEqual(['kerja_2_gaji']);
    expect(g.dropdown.map((p) => p.name)).toEqual(['agama']);
  });
});
