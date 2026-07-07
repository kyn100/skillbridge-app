import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { summarizeJob } from '@/lib/claude';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const searchId = searchParams.get('searchId');
  const db = getDb();

  if (id) {
    const job = db.prepare('SELECT * FROM job_listings WHERE id=?').get(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(job);
  }

  if (searchId) {
    const jobs = db.prepare('SELECT * FROM job_listings WHERE search_id=? ORDER BY match_score DESC').all(searchId);
    return NextResponse.json(jobs);
  }

  const jobs = db.prepare('SELECT * FROM job_listings ORDER BY created_at DESC LIMIT 50').all();
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const body = await req.json() as { job_id: number; keywords: string[] };
  const db = getDb();
  const job = db.prepare('SELECT * FROM job_listings WHERE id=?').get(body.job_id) as Record<string, string> | undefined;
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  try {
    const summary = await summarizeJob(job.description_raw, body.keywords ?? []);
    return NextResponse.json(summary);
  } catch (err) {
    console.error('Summary error:', err);
    return NextResponse.json({ error: 'Failed to summarize job' }, { status: 500 });
  }
}
