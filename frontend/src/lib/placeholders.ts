import * as XLSX from 'xlsx';
import type { DetectedPlaceholder } from '../types';
import { kindOf } from './catalog';

export const PLACEHOLDER_RE = /\{([a-z0-9_]+)\}/g;

/** Teks sel (SheetJS menyatukan semua run rich text pada properti .w/.v). */
function cellText(c: XLSX.CellObject | undefined): string | null {
  if (!c) return null;
  if (typeof c.v === 'string') return c.v;
  if (typeof c.w === 'string') return c.w;
  return null;
}

/** Deteksi cepat untuk preview. Backend tetap sumber kebenaran (dropdown dibaca di sana). */
export function parsePlaceholders(wb: XLSX.WorkBook): DetectedPlaceholder[] {
  const found = new Map<string, DetectedPlaceholder>();
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const merges = ws['!merges'] ?? [];
    for (const addr of Object.keys(ws)) {
      if (addr.startsWith('!')) continue;
      const text = cellText(ws[addr]);
      if (!text) continue;
      const names = new Set<string>();
      for (const m of text.matchAll(PLACEHOLDER_RE)) names.add(m[1] ?? '');
      names.delete('');
      if (names.size === 0) continue;
      const { r, c } = XLSX.utils.decode_cell(addr);
      const merge = merges.find((mg) => mg.s.r === r && mg.s.c === c);
      const where = merge ? `${addr} (${XLSX.utils.encode_range(merge)})` : addr;
      names.forEach((name) => {
        const cur = found.get(name) ?? { name, type: name === 'foto' ? 'photo' : 'text', cells: [], sheet: sheetName, options: null, known: true };
        cur.cells.push(where);
        found.set(name, cur);
      });
    }
  }
  return Array.from(found.values());
}

export async function readFileBuffer(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => (fr.result instanceof ArrayBuffer ? resolve(fr.result) : reject(new Error('Berkas tidak dapat dibaca.')));
    fr.onerror = () => reject(new Error('Berkas tidak dapat dibaca.'));
    fr.readAsArrayBuffer(file);
  });
}

export async function parseTemplateFile(file: Blob): Promise<DetectedPlaceholder[]> {
  const buf = await readFileBuffer(file);
  const wb = XLSX.read(buf, { type: 'array', cellFormula: false, cellHTML: false });
  return parsePlaceholders(wb);
}

export function groupPlaceholders(list: DetectedPlaceholder[]): Record<'biasa' | 'foto' | 'berulang' | 'dropdown', DetectedPlaceholder[]> {
  const out: Record<'biasa' | 'foto' | 'berulang' | 'dropdown', DetectedPlaceholder[]> = { biasa: [], foto: [], berulang: [], dropdown: [] };
  for (const p of list) out[kindOf(p)].push(p);
  return out;
}
