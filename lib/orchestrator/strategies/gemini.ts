import { GoogleGenerativeAI } from '@google/generative-ai';
import { BASE_ORCHESTRATION_STEPS } from '@/data/orchestrationSteps';
import { executeMcpCommand } from '@/lib/mcp/client';
import { logOrchestration } from '@/lib/logging';
import { broadcast } from '@/lib/realtime';
import { updateJob } from '@/lib/jobs';
import { initializeJobSteps, upsertJobStep } from '@/lib/stepStore';
import { OrchestrationStep, Status } from '@/types';
import { OrchestrationContext, OrchestrationStrategy } from '../strategy';

type GeminiPlannedStep = {
  title: string;
  details: string;
  service: string;
};

const DEFAULT_PLAN: GeminiPlannedStep[] = BASE_ORCHESTRATION_STEPS.map((step) => ({
  title: step.title,
  details: step.details,
  service: step.service,
}));

const ALLOWED_SERVICES = Array.from(
  new Set(DEFAULT_PLAN.map((step) => step.service)),
).sort();

const DEFAULT_MODEL = process.env.GEMINI_MODEL_ID ?? 'models/gemini-1.5-flash-latest';
const COMMAND_MODE = process.env.MCP_EXECUTION_MODE === 'live' ? 'live' : 'dry-run';

let cachedModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

const systemPrompt = `You are an expert SaaS orchestration planner. You will receive a description of a SaaS product that we need to build.
You have access to the following MCP services: ${ALLOWED_SERVICES.join(', ')}.

Respond ONLY with valid JSON matching this schema:
{
  "steps": [
    {
      "title": "Short action title",
      "details": "1-2 sentences describing the work that will be executed",
      "service": "One of the allowed services listed above"
    }
  ]
}

Rules:
- Provide between 6 and 12 steps that cover planning, implementation, verification, and deployment.
- Choose a service that best fits each step (e.g., "Supabase" for database tasks, "Vercel" for deployment).
- If a step is general coordination, use service "Orchestrator".
- Do not include explanations outside of the JSON.`;

function getModel() {
  if (cachedModel) {
    return cachedModel;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Set this environment variable to enable the Gemini strategy.',
    );
  }

  const client = new GoogleGenerativeAI(apiKey);
  cachedModel = client.getGenerativeModel({
    model: DEFAULT_MODEL,
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  return cachedModel;
}

function parsePlanResponse(raw: string): GeminiPlannedStep[] {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.steps)) {
      throw new Error('Response missing "steps" array.');
    }

    const steps = parsed.steps
      .map((step: Record<string, unknown>) => ({
        title: typeof step.title === 'string' ? step.title : '',
        details: typeof step.details === 'string' ? step.details : '',
        service: typeof step.service === 'string' ? step.service : 'Orchestrator',
      }))
      .filter((step: GeminiPlannedStep) => step.title.trim().length > 0);

    if (steps.length === 0) {
      throw new Error('No valid steps returned from model.');
    }

    return steps.map((step) => ({
      ...step,
      service: ALLOWED_SERVICES.includes(step.service) ? step.service : 'Orchestrator',
    }));
  } catch (error) {
    throw new Error(
      `Unable to parse plan response: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function generatePlan(description: string): Promise<GeminiPlannedStep[]> {
  const model = getModel();
  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${systemPrompt}\n\nUser description:\n${description}`,
          },
        ],
      },
    ],
  });

  const raw = response.response?.text()?.trim();
  if (!raw) {
    throw new Error('Gemini returned an empty response.');
  }

  return parsePlanResponse(raw);
}

export const geminiStrategy: OrchestrationStrategy = {
  name: 'gemini',
  async run({ jobId, description }: OrchestrationContext) {
    logOrchestration('info', 'Starting orchestration job', jobId, { description });
    await updateJob(jobId, { status: 'running' });
    broadcast({ type: 'job:started', jobId });

    let plannedSteps: GeminiPlannedStep[];
    try {
      plannedSteps = await generatePlan(description);
      logOrchestration('info', 'Gemini generated orchestration plan', jobId, {
        stepCount: plannedSteps.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logOrchestration('warn', 'Falling back to default plan', jobId, { error: message });
      plannedSteps = DEFAULT_PLAN;
    }

    const steps: OrchestrationStep[] = plannedSteps.map((step, index) => ({
      id: index,
      title: step.title,
      details: step.details,
      service: step.service,
      status: Status.Pending,
    }));

    await initializeJobSteps(jobId, steps);
    steps.forEach((step) => {
      broadcast({
        type: 'step:update',
        jobId,
        step,
      });
    });

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      step.status = Status.InProgress;
      await upsertJobStep(jobId, step);
      logOrchestration('info', 'Step started', jobId, {
        stepId: step.id,
        title: step.title,
        service: step.service,
      });
      broadcast({
        type: 'step:update',
        jobId,
        step: { ...step },
      });

      const result = await executeMcpCommand(
        {
          server: step.service,
          action: step.title,
          args: {
            details: step.details,
            stepIndex: index,
            mode: COMMAND_MODE,
          },
        },
        {
          jobId,
          mode: COMMAND_MODE,
        },
      );

      if (!result.success) {
        step.status = Status.Failure;
        await upsertJobStep(jobId, step);
        logOrchestration('error', 'Step failed', jobId, {
          stepId: step.id,
          title: step.title,
          error: result.error,
        });
        broadcast({
          type: 'step:update',
          jobId,
          step: { ...step },
        });

        await updateJob(jobId, { status: 'failed' });
        broadcast({
          type: 'job:failed',
          jobId,
          error: result.error ?? 'MCP command failed',
        });
        return;
      }

      step.status = Status.Success;
      await upsertJobStep(jobId, step);
      logOrchestration('info', 'Step completed', jobId, {
        stepId: step.id,
        title: step.title,
        durationMs: result.durationMs,
      });
      broadcast({
        type: 'step:update',
        jobId,
        step: { ...step },
      });
    }

    await updateJob(jobId, { status: 'completed' });
    broadcast({ type: 'job:completed', jobId });
    logOrchestration('info', 'Orchestration job completed', jobId, {
      totalSteps: steps.length,
    });
  },
};
