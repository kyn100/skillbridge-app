import { NextResponse } from 'next/server';
import { rows, row, run, initDb } from '@/lib/db';
import { generateCaseStudies } from '@/lib/claude';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 });
  await initDb();
  const cases = await rows('SELECT * FROM case_studies WHERE module_id=$1 ORDER BY order_num', [moduleId]) as Array<Record<string, unknown>>;
  return NextResponse.json(cases.map(c => ({ ...c, key_learnings: JSON.parse(c.key_learnings_json as string) })));
}

export async function POST(req: Request) {
  const body = await req.json() as { module_id: number };
  await initDb();

  const mod = await row('SELECT * FROM study_modules WHERE id=$1', [body.module_id]) as Record<string, string> | undefined;
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const existing = await row('SELECT id FROM case_studies WHERE module_id=$1', [body.module_id]);
  if (existing) {
    const cases = await rows('SELECT * FROM case_studies WHERE module_id=$1 ORDER BY order_num', [body.module_id]) as Array<Record<string, unknown>>;
    return NextResponse.json(cases.map(c => ({ ...c, key_learnings: JSON.parse(c.key_learnings_json as string) })));
  }

  try {
    const cases = await generateCaseStudies(mod.title, mod.skill_category, mod.description);
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      await run(
        'INSERT INTO case_studies (module_id, title, industry, story, analysis, key_learnings_json, order_num) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [body.module_id, c.title, c.industry, c.story, c.analysis, JSON.stringify(c.key_learnings), i + 1]
      );
    }

    const saved = await rows('SELECT * FROM case_studies WHERE module_id=$1 ORDER BY order_num', [body.module_id]) as Array<Record<string, unknown>>;
    return NextResponse.json(saved.map(c => ({ ...c, key_learnings: JSON.parse(c.key_learnings_json as string) })));
  } catch (err) {
    console.error('Case study error:', err);
    return NextResponse.json({ error: 'Failed to generate case studies' }, { status: 500 });
  }
}
