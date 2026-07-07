import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateResume } from '@/lib/claude';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json(null);

  const db = getDb();
  const jobId = request.nextUrl.searchParams.get('jobId');

  // With jobId: return the most recent resume for that job
  if (jobId) {
    const row = db.prepare(
      `SELECT id, job_listing_id, profile_id, content_json, created_at
       FROM resumes WHERE job_listing_id = ? AND user_id = ?
       ORDER BY created_at DESC LIMIT 1`
    ).get(Number(jobId), userId) as {
      id: number; job_listing_id: number; profile_id: number;
      content_json: string; created_at: string;
    } | undefined;
    if (!row) return NextResponse.json(null);
    return NextResponse.json({
      id: row.id,
      job_listing_id: row.job_listing_id,
      profile_id: row.profile_id,
      content: JSON.parse(row.content_json),
      created_at: row.created_at,
    });
  }

  // Without jobId: return "continue learning" data for the home page banner
  const row = db.prepare(`
    SELECT
      sm.id            AS module_id,
      sm.title         AS module_title,
      sm.skill_category,
      sm.status        AS module_status,
      sm.order_num,
      sp.id            AS plan_id,
      sp.resume_id,
      sp.job_listing_id,
      sp.created_at    AS plan_created_at,
      jl.title         AS job_title,
      jl.company
    FROM study_modules sm
    JOIN study_plans   sp ON sm.plan_id = sp.id
    JOIN job_listings  jl ON sp.job_listing_id = jl.id
    WHERE sp.user_id = ?
      AND sm.status IN ('in_progress', 'available')
    ORDER BY
      CASE sm.status WHEN 'in_progress' THEN 0 WHEN 'available' THEN 1 END,
      sp.created_at DESC,
      sm.order_num ASC
    LIMIT 1
  `).get(userId) as Record<string, unknown> | undefined;

  if (!row) return NextResponse.json(null);

  const progress = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed
    FROM study_modules WHERE plan_id = ?
  `).get(row.plan_id as number) as { total: number; completed: number };

  let chapter_idx = 0;
  const bm = db.prepare('SELECT value FROM settings WHERE key=?')
    .get(`bookmark_${userId}`) as { value: string } | undefined;
  if (bm) {
    try {
      const parsed = JSON.parse(bm.value) as { module_id: number; chapter_idx: number };
      if (parsed.module_id === row.module_id) chapter_idx = parsed.chapter_idx;
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    module: {
      id: row.module_id,
      title: row.module_title,
      skill_category: row.skill_category,
      status: row.module_status,
    },
    chapter_idx,
    job: { title: row.job_title, company: row.company },
    plan: {
      id: row.plan_id,
      resume_id: row.resume_id,
      total: progress.total,
      completed: Number(progress.completed ?? 0),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { job_id } = await request.json() as { job_id: number };

  const job = db.prepare('SELECT * FROM job_listings WHERE id = ?').get(job_id) as {
    id: number; title: string; company: string; description_raw: string;
  } | undefined;
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const profileRow = db.prepare(
    'SELECT * FROM user_profile WHERE user_id = ? ORDER BY id DESC LIMIT 1'
  ).get(userId) as {
    id: number; name: string; email: string; phone: string; summary: string;
    education_json: string; experience_json: string; skills_json: string;
  } | undefined;
  if (!profileRow) return NextResponse.json({ error: 'Profile not found. Please set up your profile first.' }, { status: 400 });

  const profile = {
    name: profileRow.name,
    email: profileRow.email,
    phone: profileRow.phone,
    summary: profileRow.summary,
    education: JSON.parse(profileRow.education_json ?? '[]'),
    experience: JSON.parse(profileRow.experience_json ?? '[]'),
    skills: JSON.parse(profileRow.skills_json ?? '[]'),
  };

  const content = await generateResume(profile, job.description_raw, job.title, job.company);

  const result = db.prepare(
    'INSERT INTO resumes (job_listing_id, profile_id, content_json, user_id) VALUES (?, ?, ?, ?)'
  ).run(job_id, profileRow.id, JSON.stringify(content), userId);

  return NextResponse.json({
    id: result.lastInsertRowid,
    job_listing_id: job_id,
    profile_id: profileRow.id,
    content,
    created_at: new Date().toISOString(),
  });
}
