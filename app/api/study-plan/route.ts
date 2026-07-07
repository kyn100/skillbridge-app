import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateStudyPlan } from '@/lib/claude';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const resumeId = searchParams.get('resumeId');
  const db = getDb();

  if (!resumeId) return NextResponse.json({ error: 'resumeId required' }, { status: 400 });

  const plan = db.prepare(
    'SELECT * FROM study_plans WHERE resume_id=? AND user_id=? ORDER BY created_at DESC LIMIT 1'
  ).get(resumeId, userId) as Record<string, unknown> | undefined;
  if (!plan) return NextResponse.json(null);

  const modules = db.prepare('SELECT * FROM study_modules WHERE plan_id=? ORDER BY order_num').all((plan as { id: number }).id);
  return NextResponse.json({ ...plan, skill_gaps: JSON.parse(plan.skill_gaps_json as string), modules });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { resume_id: number; job_listing_id: number };
  const db = getDb();

  const resume = db.prepare('SELECT * FROM resumes WHERE id=? AND user_id=?').get(body.resume_id, userId) as Record<string, unknown> | undefined;
  if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });

  const job = db.prepare('SELECT * FROM job_listings WHERE id=?').get(body.job_listing_id) as Record<string, string> | undefined;
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const profileRow = db.prepare('SELECT * FROM user_profile WHERE user_id=? LIMIT 1').get(userId) as Record<string, string> | undefined;
  if (!profileRow) return NextResponse.json({ error: 'Profile not found' }, { status: 400 });

  const profileSkills = JSON.parse(profileRow.skills_json) as string[];
  const jobRequirements = [job.title, ...job.description_summary.split('. ')];

  try {
    const planData = await generateStudyPlan(profileSkills, jobRequirements, job.title);

    const planResult = db.prepare(`
      INSERT INTO study_plans (resume_id, job_listing_id, user_id, skill_gaps_json, overview, total_hours_estimate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(body.resume_id, body.job_listing_id, userId,
      JSON.stringify(planData.skill_gaps), planData.overview, planData.total_hours_estimate);
    const planId = planResult.lastInsertRowid as number;

    const insertModule = db.prepare(`
      INSERT INTO study_modules (plan_id, title, description, skill_category, order_num, estimated_hours, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    db.transaction(() => {
      planData.modules.forEach((mod, idx) => {
        insertModule.run(planId, mod.title, mod.description, mod.skill_category,
          mod.order_num, mod.estimated_hours, idx === 0 ? 'available' : 'locked');
      });
    })();

    const modules = db.prepare('SELECT * FROM study_modules WHERE plan_id=? ORDER BY order_num').all(planId);
    const plan = db.prepare('SELECT * FROM study_plans WHERE id=?').get(planId) as Record<string, unknown>;
    return NextResponse.json({ ...plan, skill_gaps: JSON.parse(plan.skill_gaps_json as string), modules });
  } catch (err) {
    console.error('Study plan error:', err);
    return NextResponse.json({ error: 'Failed to generate study plan' }, { status: 500 });
  }
}
