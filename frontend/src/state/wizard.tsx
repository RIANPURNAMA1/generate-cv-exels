import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { AiSuggestion, DataRow, GenerateOptions, Participant, TemplateInfo } from '../types';

export interface WizardState {
  template: TemplateInfo | null;
  columns: string[];
  participants: Participant[];
  mapping: Record<string, string>;
  options: GenerateOptions;
  ai: AiSuggestion[];
  dirty: string[]; // id peserta yang datanya berubah dan perlu disinkronkan ke server
  jobId: string | null;
}

export const DEFAULT_OPTIONS: GenerateOptions = { pdf: false, normalizePhone: true, autoAge: true, jpDate: true };

export const initialState: WizardState = {
  template: null, columns: [], participants: [], mapping: {}, options: DEFAULT_OPTIONS, ai: [], dirty: [], jobId: null,
};

export type Action =
  | { type: 'SET_TEMPLATE'; template: TemplateInfo | null }
  | { type: 'SET_PARTICIPANTS'; participants: Participant[]; columns: string[] }
  | { type: 'ADD_PARTICIPANT'; participant: Participant }
  | { type: 'REMOVE_PARTICIPANT'; id: string }
  | { type: 'SET_HAS_PHOTO'; id: string; hasPhoto: boolean }
  | { type: 'UPDATE_FIELD'; id: string; field: string; value: string }
  | { type: 'SET_MAPPING'; mapping: Record<string, string> }
  | { type: 'SET_OPTION'; key: keyof GenerateOptions; value: boolean }
  | { type: 'SET_AI'; ai: AiSuggestion[] }
  | { type: 'DECIDE_AI'; pid: string; field: string; status: AiSuggestion['status']; finalValue?: string }
  | { type: 'CLEAN_DIRTY' }
  | { type: 'SET_JOB'; jobId: string | null }
  | { type: 'RESET_SESSION' }       // hapus data sesi, template dipertahankan
  | { type: 'RESET_ALL' };

function unionColumns(ps: Participant[], base: string[]): string[] {
  const set = new Set(base);
  for (const p of ps) for (const k of Object.keys(p.data)) set.add(k);
  return Array.from(set);
}

export function reducer(s: WizardState, a: Action): WizardState {
  switch (a.type) {
    case 'SET_TEMPLATE':
      return { ...s, template: a.template, mapping: {}, jobId: null };
    case 'SET_PARTICIPANTS':
      return { ...s, participants: a.participants, columns: a.columns, ai: [], dirty: [], jobId: null };
    case 'ADD_PARTICIPANT': {
      const participants = [...s.participants, a.participant];
      return { ...s, participants, columns: unionColumns(participants, s.columns) };
    }
    case 'REMOVE_PARTICIPANT':
      return { ...s, participants: s.participants.filter((p) => p.id !== a.id), ai: s.ai.filter((x) => x.pid !== a.id), dirty: s.dirty.filter((d) => d !== a.id) };
    case 'SET_HAS_PHOTO':
      return { ...s, participants: s.participants.map((p) => (p.id === a.id ? { ...p, hasPhoto: a.hasPhoto } : p)) };
    case 'UPDATE_FIELD': {
      const participants = s.participants.map((p) => (p.id === a.id ? { ...p, data: { ...p.data, [a.field]: a.value } as DataRow } : p));
      return { ...s, participants, columns: unionColumns(participants, s.columns), dirty: s.dirty.includes(a.id) ? s.dirty : [...s.dirty, a.id] };
    }
    case 'SET_MAPPING':
      return { ...s, mapping: a.mapping };
    case 'SET_OPTION':
      return { ...s, options: { ...s.options, [a.key]: a.value } };
    case 'SET_AI':
      return { ...s, ai: a.ai };
    case 'DECIDE_AI':
      return { ...s, ai: s.ai.map((x) => (x.pid === a.pid && x.field === a.field ? { ...x, status: a.status, ...(a.finalValue !== undefined ? { finalValue: a.finalValue } : {}) } : x)) };
    case 'CLEAN_DIRTY':
      return { ...s, dirty: [] };
    case 'SET_JOB':
      return { ...s, jobId: a.jobId };
    case 'RESET_SESSION':
      return { ...initialState, template: s.template, mapping: s.mapping, options: s.options };
    case 'RESET_ALL':
      return initialState;
  }
}

const KEY = 'cv_wizard';

function load(): WizardState {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...initialState, ...(JSON.parse(raw) as Partial<WizardState>) } : initialState;
  } catch {
    return initialState;
  }
}

const Ctx = createContext<{ state: WizardState; dispatch: Dispatch<Action> } | null>(null);

/** State wizard disimpan di sessionStorage (bukan localStorage): hilang saat tab ditutup. */
export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* penyimpanan penuh: abaikan */
    }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWizard() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWizard harus di dalam WizardProvider');
  return c;
}
