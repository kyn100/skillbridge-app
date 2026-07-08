import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { row, run, initDb } from '@/lib/db';
import { generateResume } from '@/lib/claude';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json(null);

  await initDb();
  const jobId = request.nextUrl.searchParams.get('jobId');

  // With jobId: return the most recent resume for that job
  if (jobId) {
    const resumeData = await row<{
      id: number; job_listing_id: number; profile_id: number;
      content_json: string; created_at: string;
    }>(
      `SELECT id, job_listing_id, profile_id, content_json, created_at
       FROM resumes WHERE job_listing_id=$1 AND user_id=$2
       ORDER BY created_at DESC LIMIT 1`,
      [Number(jobId), userId]
    );
    if (!resumeData) return NextResponse.json(null);
    return NextResponse.json({
      id: resumeData.id,
      job_listing_id: resumeData.job_listing_id,
      profile_id: resumeData.profile_id,
      content: JSON.parse(resumeData.content_json),
      created_at: resumeData.created_at,
    });
  }

  // Without jobId: return "continue learning" data for the home page banner
  const activeModule = await row<Record<string, unknown>>(`
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
    WHERE sp.user_id = $1
      AND sm.status IN ('in_progress', 'available')
    ORDER BY
      CASE sm.status WHEN 'in_progress' THEN 0 WHEN 'available' THEN 1 END,
      sp.created_at DESC,
      sm.order_num ASC
    LIMIT 1
  `, [userId]);

  if (!activeModule) return NextResponse.json(null);

  const progressData = await row<{ total: string; completed: string }>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed
    FROM study_modules WHERE plan_id=$1
  `, [activeModule.plan_id as number]);

  let chapter_idx = 0;
  const bm = await row<{ value: string }>('SELECT value FROM settings WHERE key=$1', [`bookmark_${userId}`]);
  if (bm) {
    try {
      const parsed = JSON.parse(bm.value) as { module_id: number; chapter_idx: number };
      if (parsed.module_id === activeModule.module_id) chapter_idx = parsed.chapter_idx;
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    module: {
      id: activeModule.module_id,
      title: activeModule.module_title,
      skill_category: activeModule.skill_category,
      status: activeModule.module_status,
    },
    chapter_idx,
    job: { title: activeModule.job_title, company: activeModule.company },
    plan: {
      id: activeModule.plan_id,
      resume_id: activeModule.resume_id,
      total: Number(progressData?.total ?? 0),
      completed: Number(progressData?.completed ?? 0),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await initDb();
  const { job_id } = await request.json() as { job_id: number };

  const job = await row<{
    id: number; title: string; company: string; description_raw: string;
  }>('SELECT * FROM job_listings WHERE id=$1', [job_id]);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const profileRow = await row<{
    id: number; name: string; email: string; phone: string; summary: string;
    education_json: string; experience_json: string; skills_json: string;
  }>('SELECT * FROM user_profile WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]);
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

  const { id: resumeId } = await run(
    'INSERT INTO resumes (job_listing_id, profile_id, content_json, user_id) VALUES ($1,$2,$3,$4) RETURNING id',
    [job_id, profileRow.id, JSON.stringify(content), userId]
  );

  return NextResponse.json({
    id: resumeId,
    job_listing_id: job_id,
    profile_id: profileRow.id,
    content,
    created_at: new Date().toISOString(),
  });
}
