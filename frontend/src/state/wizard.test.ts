import { describe, expect, it } from 'vitest';
import { initialState, reducer } from './wizard';

describe('wizard reducer', () => {
  it('menandai peserta kotor saat field diubah dan membersihkannya', () => {
    let s = reducer(initialState, { type: 'ADD_PARTICIPANT', participant: { id: 'p1', data: { nama_romaji: 'A' }, hasPhoto: false } });
    s = reducer(s, { type: 'UPDATE_FIELD', id: 'p1', field: 'alamat', value: 'X' });
    expect(s.dirty).toEqual(['p1']);
    expect(s.columns).toContain('alamat');
    expect(reducer(s, { type: 'CLEAN_DIRTY' }).dirty).toEqual([]);
  });
  it('RESET_SESSION menghapus peserta tetapi mempertahankan template', () => {
    let s = reducer(initialState, { type: 'SET_TEMPLATE', template: { id: 't', name: 'T', placeholders: [] } });
    s = reducer(s, { type: 'ADD_PARTICIPANT', participant: { id: 'p1', data: {}, hasPhoto: false } });
    s = reducer(s, { type: 'RESET_SESSION' });
    expect(s.participants).toEqual([]);
    expect(s.template?.id).toBe('t');
  });
  it('keputusan AI hanya mengubah saran yang dituju', () => {
    let s = reducer(initialState, { type: 'SET_AI', ai: [
      { pid: 'p1', field: 'nama_katakana', original: '', suggested: 'レトノ', status: 'suggested' },
      { pid: 'p1', field: 'hobi', original: 'x', suggested: '趣味', status: 'suggested' },
    ] });
    s = reducer(s, { type: 'DECIDE_AI', pid: 'p1', field: 'hobi', status: 'rejected' });
    expect(s.ai.map((x) => x.status)).toEqual(['suggested', 'rejected']);
  });
});
