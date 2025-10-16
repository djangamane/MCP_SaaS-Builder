import { getRedisClient } from '@/lib/redis/client';
import { OrchestrationJob } from '@/types';

const jobs = new Map<string, OrchestrationJob>();
let counter = 0;

const JOB_KEY_PREFIX = 'mcp:job:';
const JOB_INDEX_KEY = 'mcp:jobs:index';
const JOB_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function jobKey(id: string) {
  return `${JOB_KEY_PREFIX}${id}`;
}

async function persistJob(job: OrchestrationJob) {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(jobKey(job.id), JSON.stringify(job), { ex: JOB_TTL_SECONDS });
    await redis.sadd(JOB_INDEX_KEY, job.id);
  } else {
    jobs.set(job.id, job);
  }
}

async function loadJob(id: string): Promise<OrchestrationJob | undefined> {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get<string>(jobKey(id));
    if (!raw) {
      return undefined;
    }
    return JSON.parse(raw) as OrchestrationJob;
  }

  return jobs.get(id);
}

export async function createJob(description: string): Promise<OrchestrationJob> {
  const id = `job_${Date.now()}_${++counter}`;
  const timestamp = Date.now();
  const job: OrchestrationJob = {
    id,
    description,
    status: 'queued',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await persistJob(job);
  return job;
}

export async function getJob(id: string): Promise<OrchestrationJob | undefined> {
  return loadJob(id);
}

export async function listJobs(): Promise<OrchestrationJob[]> {
  const redis = getRedisClient();
  if (redis) {
    const ids = await redis.smembers<string[]>(JOB_INDEX_KEY);
    if (!ids || ids.length === 0) {
      return [];
    }

    const jobsFromRedis = await Promise.all(
      ids.map(async (id) => {
        const raw = await redis.get<string>(jobKey(id));
        return raw ? (JSON.parse(raw) as OrchestrationJob) : undefined;
      }),
    );

    return jobsFromRedis.filter((job): job is OrchestrationJob => Boolean(job));
  }

  return Array.from(jobs.values());
}

export async function updateJob(
  id: string,
  patch: Partial<Omit<OrchestrationJob, 'id' | 'createdAt'>>,
): Promise<OrchestrationJob | undefined> {
  const existing = await loadJob(id);
  if (!existing) {
    return undefined;
  }

  const updated: OrchestrationJob = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };

  await persistJob(updated);
  return updated;
}
