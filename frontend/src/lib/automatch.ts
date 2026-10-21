import type { DetectedPlaceholder } from '../types';
import { COMPUTED } from './catalog';

export type MatchStatus = 'cocok' | 'belum_ada_data' | 'terhitung' | 'foto';

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Cocokkan placeholder dengan kolom yang namanya sama (tanpa membedakan huruf besar/kecil dan spasi/underscore). */
export function autoMatch(placeholders: DetectedPlaceholder[], columns: string[]): Record<string, string> {
  const byNorm = new Map<string, string>();
  for (const c of columns) if (!byNorm.has(norm(c))) byNorm.set(norm(c), c);
  const mapping: Record<string, string> = {};
  for (const p of placeholders) {
    if (p.name === 'foto' || COMPUTED.has(p.name)) continue;
    const col = byNorm.get(norm(p.name));
    if (col) mapping[p.name] = col;
  }
  return mapping;
}

export function statusOf(
  p: DetectedPlaceholder,
  mapping: Record<string, string>,
  columns: string[],
  hasBirthColumn: boolean,
): MatchStatus {
  if (p.name === 'foto') return 'foto';
  if (COMPUTED.has(p.name)) return hasBirthColumn ? 'terhitung' : 'belum_ada_data';
  const col = mapping[p.name];
  return col && columns.includes(col) ? 'cocok' : 'belum_ada_data';
}

export function unusedColumns(columns: string[], mapping: Record<string, string>, placeholders: DetectedPlaceholder[]): string[] {
  const used = new Set(Object.values(mapping));
  if (placeholders.some((p) => COMPUTED.has(p.name))) used.add(columns.find((c) => norm(c) === 'tanggal_lahir') ?? '');
  return columns.filter((c) => !used.has(c) && norm(c) !== 'participantid');
}
