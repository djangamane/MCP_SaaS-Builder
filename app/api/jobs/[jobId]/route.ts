import { NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';
import { getJobSnapshot } from '@/lib/orchestrator';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: { jobId: string } },
) {
  const { jobId } = context.params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: `Job ${jobId} not found.` }, { status: 404 });
  }

  const snapshot = getJobSnapshot(jobId);
  return NextResponse.json({
    job,
    ...snapshot,
  });
}
