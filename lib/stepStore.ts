import { getRedisClient } from '@/lib/redis/client';
import { OrchestrationStep } from '@/types';

const jobSteps = new Map<string, OrchestrationStep[]>();
const STEPS_KEY_PREFIX = 'mcp:jobSteps:';
const STEPS_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function stepsKey(jobId: string) {
  return `${STEPS_KEY_PREFIX}${jobId}`;
}

async function saveSteps(jobId: string, steps: OrchestrationStep[]) {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(stepsKey(jobId), JSON.stringify(steps), { ex: STEPS_TTL_SECONDS });
  } else {
    jobSteps.set(jobId, steps);
  }
}

async function loadSteps(jobId: string): Promise<OrchestrationStep[]> {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get<string>(stepsKey(jobId));
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as OrchestrationStep[];
  }

  return jobSteps.get(jobId) ?? [];
}

export async function initializeJobSteps(jobId: string, steps: OrchestrationStep[]) {
  const copy = steps.map((step) => ({ ...step }));
  await saveSteps(jobId, copy);
}

export async function upsertJobStep(jobId: string, step: OrchestrationStep) {
  const current = await loadSteps(jobId);
  const index = current.findIndex((item) => item.id === step.id);
  if (index === -1) {
    current.push({ ...step });
  } else {
    current[index] = { ...current[index], ...step };
  }

  current.sort((a, b) => a.id - b.id);
  await saveSteps(jobId, current);
}

export async function appendJobSteps(jobId: string, steps: OrchestrationStep[]) {
  if (steps.length === 0) {
    return;
  }

  const current = await loadSteps(jobId);
  const additions = steps.filter(
    (step) => !current.some((existingStep) => existingStep.id === step.id),
  );
  if (additions.length === 0) {
    return;
  }

  const merged = [...current, ...additions.map((step) => ({ ...step }))].sort(
    (a, b) => a.id - b.id,
  );
  await saveSteps(jobId, merged);
}

export async function getJobSteps(jobId: string) {
  const steps = await loadSteps(jobId);
  return steps.map((step) => ({ ...step }));
}
