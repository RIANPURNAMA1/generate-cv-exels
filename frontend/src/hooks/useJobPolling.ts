import { useQuery } from '@tanstack/react-query';
import { getApi, POLL_MS } from '../services/api';
import type { AiJob, JobStatus } from '../types';

/** Polling job pembuatan CV tiap 1,5 detik; berhenti saat selesai/gagal. */
export function useJob(jobId: string | null) {
  return useQuery<JobStatus>({
    queryKey: ['job', jobId],
    queryFn: () => getApi().getJob(jobId as string),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const st = q.state.data?.status;
      return st === 'done' || st === 'failed' || st === 'expired' ? false : POLL_MS;
    },
    gcTime: 0,
  });
}

export function useAiJob(jobId: string | null) {
  return useQuery<AiJob>({
    queryKey: ['aijob', jobId],
    queryFn: () => getApi().getAiJob(jobId as string),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const st = q.state.data?.status;
      return st === 'done' || st === 'failed' ? false : POLL_MS;
    },
    gcTime: 0,
  });
}
