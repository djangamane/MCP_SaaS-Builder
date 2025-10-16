import { getJob } from '@/lib/jobs';
import { logOrchestration } from '@/lib/logging';
import { getJobSteps } from '@/lib/stepStore';
import { OrchestrationStrategy } from './strategy';
import { simulatedStrategy } from './strategies/simulated';
import { geminiStrategy } from './strategies/gemini';

const registeredStrategies: Record<string, OrchestrationStrategy> = {
  simulated: simulatedStrategy,
  gemini: geminiStrategy,
};

function resolveStrategy(jobId: string): OrchestrationStrategy {
  const key = (process.env.ORCHESTRATION_STRATEGY ?? 'simulated').toLowerCase();
  const selected = registeredStrategies[key];

  if (!selected) {
    logOrchestration('warn', 'Unknown orchestration strategy requested, falling back', jobId, {
      requested: key,
    });
    return simulatedStrategy;
  }

  if (
    selected.name === geminiStrategy.name &&
    (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0)
  ) {
    logOrchestration(
      'warn',
      'Gemini strategy selected but GEMINI_API_KEY is missing. Falling back to simulated strategy.',
      jobId,
    );
    return simulatedStrategy;
  }

  return selected;
}

export async function runOrchestration(jobId: string) {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Cannot start orchestration. Job ${jobId} not found.`);
  }

  const strategy = resolveStrategy(job.id);
  logOrchestration('info', 'Selected orchestration strategy', jobId, {
    strategy: strategy.name,
  });

  await strategy.run({
    jobId: job.id,
    description: job.description,
  });
}

export async function getJobSnapshot(jobId: string) {
  const steps = await getJobSteps(jobId);
  return {
    steps,
  };
}
