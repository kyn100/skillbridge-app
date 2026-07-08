export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, initDb } from '@/lib/db';
import { summarizeJob } from '@/lib/claude';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const searchId = searchParams.get('searchId');
  await initDb();

  if (id) {
    const job = await row('SELECT * FROM job_listings WHERE id=$1', [id]);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(job);
  }

  if (searchId) {
    const jobs = await rows('SELECT * FROM job_listings WHERE search_id=$1 ORDER BY match_score DESC', [searchId]);
    return NextResponse.json(jobs);
  }

  const jobs = await rows('SELECT * FROM job_listings ORDER BY created_at DESC LIMIT 50');
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const body = await req.json() as { job_id: number; keywords: string[] };
  await initDb();
  const job = await row('SELECT * FROM job_listings WHERE id=$1', [body.job_id]) as Record<string, string> | undefined;
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  try {
    const summary = await summarizeJob(job.description_raw, body.keywords ?? []);
    return NextResponse.json(summary);
  } catch (err) {
    console.error('Summary error:', err);
    return NextResponse.json({ error: 'Failed to summarize job' }, { status: 500 });
  }
}
