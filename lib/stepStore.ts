import { OrchestrationStep } from '@/types';

const jobSteps = new Map<string, OrchestrationStep[]>();

export function initializeJobSteps(jobId: string, steps: OrchestrationStep[]) {
  jobSteps.set(jobId, steps.map((step) => ({ ...step })));
}

export function upsertJobStep(jobId: string, step: OrchestrationStep) {
  const existing = jobSteps.get(jobId) ?? [];
  const index = existing.findIndex((item) => item.id === step.id);
  if (index === -1) {
    jobSteps.set(jobId, [...existing, { ...step }].sort((a, b) => a.id - b.id));
  } else {
    const copy = [...existing];
    copy[index] = { ...copy[index], ...step };
    jobSteps.set(jobId, copy);
  }
}

export function appendJobSteps(jobId: string, steps: OrchestrationStep[]) {
  const existing = jobSteps.get(jobId) ?? [];
  const additions = steps.filter(
    (step) => !existing.some((existingStep) => existingStep.id === step.id),
  );
  if (additions.length === 0) {
    return;
  }
  jobSteps.set(jobId, [...existing, ...additions.map((step) => ({ ...step }))].sort((a, b) => a.id - b.id));
}

export function getJobSteps(jobId: string) {
  return (jobSteps.get(jobId) ?? []).map((step) => ({ ...step }));
}
