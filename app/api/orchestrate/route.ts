import { NextResponse } from 'next/server';
import { createJob, listJobs, updateJob } from '@/lib/jobs';
import { broadcast } from '@/lib/realtime';
import { runOrchestration } from '@/lib/orchestrator';
import { logOrchestration } from '@/lib/logging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON body provided for orchestration request.' },
      { status: 400 },
    );
  }

  const description =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>).description
      : undefined;

  if (typeof description !== 'string' || description.trim().length === 0) {
    return NextResponse.json(
      { error: 'A non-empty "description" field is required.' },
      { status: 400 },
    );
  }

  const job = createJob(description.trim());
  logOrchestration('info', 'Job queued', job.id, { description: job.description });
  broadcast({ type: 'job:queued', jobId: job.id, description: job.description });

  runOrchestration(job.id).catch((error) => {
    updateJob(job.id, { status: 'failed' });
    logOrchestration('error', 'Job execution failed', job.id, {
      error: error instanceof Error ? error.message : String(error),
    });
    broadcast({ type: 'job:failed', jobId: job.id, error: String(error) });
  });

  return NextResponse.json(
    { jobId: job.id, status: job.status, message: 'Orchestration request accepted.' },
    { status: 202 },
  );
}

export async function GET() {
  return NextResponse.json({ jobs: listJobs() });
}
