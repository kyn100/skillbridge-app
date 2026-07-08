import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rows, row, run, initDb } from '@/lib/db';
import { generateStudyPlan, generateTextbookChapters, generateFlashcards, generateMindmap, generateCaseStudies } from '@/lib/claude';

async function warmUpModule(moduleId: number, title: string, skillCategory: string, description: string) {
  await initDb();

  // Skip if textbook already exists (idempotent)
  const existing = await row('SELECT id FROM textbook_chapters WHERE module_id=$1', [moduleId]);
  if (existing) return;

  // Phase 1: textbook + mindmap + case studies in parallel
  const [chapters, mindmapData, caseData] = await Promise.all([
    generateTextbookChapters(title, skillCategory, description),
    generateMindmap(title, skillCategory, description),
    generateCaseStudies(title, skillCategory, description),
  ]);

  // Save textbook chapters
  for (const ch of chapters) {
    await run(
      'INSERT INTO textbook_chapters (module_id, title, content_markdown, order_num) VALUES ($1,$2,$3,$4)',
      [moduleId, ch.title, ch.content_markdown, ch.order_num]
    );
  }
  await run("UPDATE study_modules SET status='in_progress' WHERE id=$1 AND status='available'", [moduleId]);

  // Save mindmap
  const existingMindmap = await row('SELECT id FROM mindmaps WHERE module_id=$1', [moduleId]);
  if (!existingMindmap) {
    await run('INSERT INTO mindmaps (module_id, data_json) VALUES ($1,$2)', [moduleId, JSON.stringify(mindmapData)]);
  }

  // Save case studies
  const existingCase = await row('SELECT id FROM case_studies WHERE module_id=$1', [moduleId]);
  if (!existingCase) {
    for (let i = 0; i < caseData.length; i++) {
      const c = caseData[i];
      await run(
        'INSERT INTO case_studies (module_id, title, industry, story, analysis, key_learnings_json, order_num) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [moduleId, c.title, c.industry, c.story, c.analysis, JSON.stringify(c.key_learnings), i + 1]
      );
    }
  }

  // Phase 2: flashcards (needs chapter content)
  const existingFlashcard = await row('SELECT id FROM flashcards WHERE module_id=$1', [moduleId]);
  if (!existingFlashcard) {
    const combinedContent = chapters.map(c => c.content_markdown).join('\n\n');
    const cards = await generateFlashcards(title, combinedContent);
    for (let i = 0; i < cards.length; i++) {
      await run(
        'INSERT INTO flashcards (module_id, front, back, order_num) VALUES ($1,$2,$3,$4)',
        [moduleId, cards[i].front, cards[i].back, i + 1]
      );
    }
  }
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const resumeId = searchParams.get('resumeId');
  await initDb();

  if (!resumeId) return NextResponse.json({ error: 'resumeId required' }, { status: 400 });

  const plan = await row(
    'SELECT * FROM study_plans WHERE resume_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1',
    [resumeId, userId]
  ) as Record<string, unknown> | undefined;
  if (!plan) return NextResponse.json(null);

  const modules = await rows('SELECT * FROM study_modules WHERE plan_id=$1 ORDER BY order_num', [(plan as { id: number }).id]);
  return NextResponse.json({ ...plan, skill_gaps: JSON.parse(plan.skill_gaps_json as string), modules });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { resume_id: number; job_listing_id: number };
  await initDb();

  const resume = await row('SELECT * FROM resumes WHERE id=$1 AND user_id=$2', [body.resume_id, userId]) as Record<string, unknown> | undefined;
  if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });

  const job = await row('SELECT * FROM job_listings WHERE id=$1', [body.job_listing_id]) as Record<string, string> | undefined;
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const profileRow = await row('SELECT * FROM user_profile WHERE user_id=$1 LIMIT 1', [userId]) as Record<string, string> | undefined;
  if (!profileRow) return NextResponse.json({ error: 'Profile not found' }, { status: 400 });

  const profileSkills = JSON.parse(profileRow.skills_json) as string[];
  const jobRequirements = [job.title, ...job.description_summary.split('. ')];

  try {
    const planData = await generateStudyPlan(profileSkills, jobRequirements, job.title);

    const { id: planId } = await run(`
      INSERT INTO study_plans (resume_id, job_listing_id, user_id, skill_gaps_json, overview, total_hours_estimate)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
    `, [body.resume_id, body.job_listing_id, userId,
      JSON.stringify(planData.skill_gaps), planData.overview, planData.total_hours_estimate]);

    for (let idx = 0; idx < planData.modules.length; idx++) {
      const mod = planData.modules[idx];
      await run(`
        INSERT INTO study_modules (plan_id, title, description, skill_category, order_num, estimated_hours, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [planId, mod.title, mod.description, mod.skill_category,
          mod.order_num, mod.estimated_hours, idx === 0 ? 'available' : 'locked']);
    }

    const modules = await rows('SELECT * FROM study_modules WHERE plan_id=$1 ORDER BY order_num', [planId]) as Array<{ id: number; title: string; skill_category: string; description: string }>;
    const plan = await row('SELECT * FROM study_plans WHERE id=$1', [planId]) as Record<string, unknown>;

    // Fire background warm-up for module 1 — runs after response is sent
    const m1 = modules[0];
    if (m1) {
      void warmUpModule(m1.id, m1.title, m1.skill_category, m1.description)
        .catch(err => console.error('Module 1 warm-up failed:', err));
    }

    return NextResponse.json({ ...plan, skill_gaps: JSON.parse(plan.skill_gaps_json as string), modules });
  } catch (err) {
    console.error('Study plan error:', err);
    return NextResponse.json({ error: 'Failed to generate study plan' }, { status: 500 });
  }
}
