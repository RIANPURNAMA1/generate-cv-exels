import { mockApi } from './mockApi';
import { realApi } from './realApi';
import type { Api } from './types';

export { ApiError, POLL_MS } from './types';
export type { Api } from './types';

/** Mode dipilih saat pemanggilan agar bisa diganti di tes (VITE_USE_MOCK=true → mock). */
export function getApi(): Api {
  return import.meta.env.VITE_USE_MOCK === 'true' ? mockApi : realApi;
}
