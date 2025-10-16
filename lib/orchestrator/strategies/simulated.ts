import { BASE_ORCHESTRATION_STEPS } from '@/data/orchestrationSteps';
import { executeMcpCommand } from '@/lib/mcp/client';
import { logOrchestration } from '@/lib/logging';
import { broadcast } from '@/lib/realtime';
import { updateJob } from '@/lib/jobs';
import { appendJobSteps, initializeJobSteps, upsertJobStep } from '@/lib/stepStore';
import { OrchestrationStep, Status } from '@/types';
import { OrchestrationContext, OrchestrationStrategy } from '../strategy';

export const simulatedStrategy: OrchestrationStrategy = {
  name: 'simulated',
  async run({ jobId, description }: OrchestrationContext) {
    logOrchestration('info', 'Starting orchestration job', jobId, { description });

    updateJob(jobId, { status: 'running' });
    broadcast({ type: 'job:started', jobId });

    const steps: OrchestrationStep[] = BASE_ORCHESTRATION_STEPS.map((step, index) => ({
      ...step,
      id: index,
      status: Status.Pending,
    }));
    initializeJobSteps(jobId, steps);

    let nextStepId = steps.length;
    let hasInjectedRemediation = false;
    let remediationTargetId: number | null = null;

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];

      step.status = Status.InProgress;
      logOrchestration('info', 'Step started', jobId, {
        stepId: step.id,
        title: step.title,
        service: step.service,
      });
      upsertJobStep(jobId, step);
      broadcast({
        type: 'step:update',
        jobId,
        step: { ...step },
      });

      const shouldFail = step.title === 'Verify Runtime Performance' && !hasInjectedRemediation;
      const commandResult = await executeMcpCommand(
        {
          server: step.service,
          action: step.title,
          args: { details: step.details },
        },
        {
          jobId,
          simulateFailure: shouldFail,
        },
      );

      if (!commandResult.success) {
        step.status = Status.Failure;
        logOrchestration(shouldFail ? 'warn' : 'error', 'Step failed', jobId, {
          stepId: step.id,
          title: step.title,
          error: commandResult.error,
        });
        upsertJobStep(jobId, step);

        broadcast({
          type: 'step:update',
          jobId,
          step: { ...step },
        });
      }

      if (!commandResult.success && shouldFail) {
        hasInjectedRemediation = true;
        remediationTargetId = step.id;

        const diagnosisStep: OrchestrationStep = {
          id: nextStepId,
          title: 'Diagnose Performance Issue',
          details: 'Using Chrome DevTools to analyze LCP issues.',
          service: 'Chrome DevTools',
          status: Status.Pending,
        };
        nextStepId += 1;

        const fixStep: OrchestrationStep = {
          id: nextStepId,
          title: 'Apply Performance Fix',
          details: 'Refactoring component to optimize image loading.',
          service: 'GitHub',
          status: Status.Pending,
        };
        nextStepId += 1;

        steps.push(diagnosisStep, fixStep);
        appendJobSteps(jobId, [diagnosisStep, fixStep]);
        logOrchestration('info', 'Appended remediation steps', jobId, {
          appendedStepIds: [diagnosisStep.id, fixStep.id],
        });

        broadcast({
          type: 'steps:append',
          jobId,
          steps: [diagnosisStep, fixStep],
        });

        continue;
      }

      if (!commandResult.success) {
        updateJob(jobId, { status: 'failed' });
        broadcast({ type: 'job:failed', jobId, error: commandResult.error });
        logOrchestration('error', 'Critical step failure', jobId, {
          stepId: step.id,
          title: step.title,
          error: commandResult.error,
        });
        return;
      }

      step.status = Status.Success;
      logOrchestration('info', 'Step completed', jobId, {
        stepId: step.id,
        title: step.title,
      });
      upsertJobStep(jobId, step);
      broadcast({
        type: 'step:update',
        jobId,
        step: { ...step },
      });

      if (remediationTargetId !== null && step.title === 'Apply Performance Fix') {
        const remediationIndex = steps.findIndex((item) => item.id === remediationTargetId);
        if (remediationIndex !== -1) {
          steps[remediationIndex].status = Status.Success;
          upsertJobStep(jobId, steps[remediationIndex]);
          logOrchestration('info', 'Remediation step completed', jobId, {
            stepId: steps[remediationIndex].id,
            title: steps[remediationIndex].title,
          });
          broadcast({
            type: 'step:update',
            jobId,
            step: { ...steps[remediationIndex] },
          });
        }
        remediationTargetId = null;
      }
    }

    updateJob(jobId, { status: 'completed' });
    broadcast({ type: 'job:completed', jobId });
    logOrchestration('info', 'Orchestration job completed', jobId, {
      totalSteps: steps.length,
    });
  },
};
