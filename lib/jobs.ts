import { OrchestrationJob } from '@/types';

const jobs = new Map<string, OrchestrationJob>();
let counter = 0;

export function createJob(description: string): OrchestrationJob {
  const id = `job_${Date.now()}_${++counter}`;
  const timestamp = Date.now();
  const job: OrchestrationJob = {
    id,
    description,
    status: 'queued',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  jobs.set(id, job);
  return job;
}

export function getJob(id: string): OrchestrationJob | undefined {
  return jobs.get(id);
}

export function listJobs(): OrchestrationJob[] {
  return Array.from(jobs.values());
}

export function updateJob(
  id: string,
  patch: Partial<Omit<OrchestrationJob, 'id' | 'createdAt'>>,
) {
  const existing = jobs.get(id);
  if (!existing) {
    return;
  }

  const updated: OrchestrationJob = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };

  jobs.set(id, updated);
  return updated;
}
