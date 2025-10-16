import { NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';
import { getJobSnapshot } from '@/lib/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: { jobId: string } },
) {
  const { jobId } = context.params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: `Job ${jobId} not found.` }, { status: 404 });
  }

  const snapshot = await getJobSnapshot(jobId);
  return NextResponse.json({
    job,
    ...snapshot,
  });
}
