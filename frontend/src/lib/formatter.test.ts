import { describe, expect, it } from 'vitest';
import { calcAge, jpDate, normalizePhone, parseDate, period, slug } from './formatter';

describe('formatter', () => {
  it('parseDate menerima beberapa format dan menolak tanggal mustahil', () => {
    expect(parseDate('20 April 1993')).toEqual({ y: 1993, m: 4, d: 20 });
    expect(parseDate('20 Oktober 1999')).toEqual({ y: 1999, m: 10, d: 20 });
    expect(parseDate('20/04/1993')).toEqual({ y: 1993, m: 4, d: 20 });
    expect(parseDate('1993-04-20')).toEqual({ y: 1993, m: 4, d: 20 });
    expect(parseDate('31/02/1990')).toBeNull();
    expect(parseDate('bukan tanggal')).toBeNull();
  });
  it('jpDate', () => {
    expect(jpDate({ y: 1993, m: 4, d: 20 })).toBe('年1993 月04 日20');
  });
  it('calcAge terhadap tanggal tertentu', () => {
    const b = { y: 1993, m: 4, d: 20 };
    expect(calcAge(b, { y: 2026, m: 4, d: 19 })).toBe(32);
    expect(calcAge(b, { y: 2026, m: 4, d: 20 })).toBe(33);
  });
  it('normalizePhone', () => {
    expect(normalizePhone('+62 812-3456-7890').value).toBe('(+62)81234567890');
    expect(normalizePhone('081234567890').value).toBe('(+62)81234567890');
    expect(normalizePhone('6262 81234567890').value).toBe('(+62)81234567890');
    expect(normalizePhone('abc123').value).toBeNull();
    expect(normalizePhone('12').warning).not.toBeNull();
  });
  it('period dan slug', () => {
    expect(period('2000-07').text).toBe('2000年07月');
    expect(period('Juli 2000').text).toBe('2000年07月');
    expect(period('07/2000').text).toBe('2000年07月');
    expect(slug('Retno Wulandari')).toBe('Retno_Wulandari');
    expect(slug('../../')).toBe('peserta');
  });
});
