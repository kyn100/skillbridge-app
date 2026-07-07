import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateCaseStudies } from '@/lib/claude';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 });
  const db = getDb();
  const cases = db.prepare('SELECT * FROM case_studies WHERE module_id=? ORDER BY order_num').all(moduleId) as Array<Record<string, unknown>>;
  return NextResponse.json(cases.map(c => ({ ...c, key_learnings: JSON.parse(c.key_learnings_json as string) })));
}

export async function POST(req: Request) {
  const body = await req.json() as { module_id: number };
  const db = getDb();

  const mod = db.prepare('SELECT * FROM study_modules WHERE id=?').get(body.module_id) as Record<string, string> | undefined;
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const existing = db.prepare('SELECT id FROM case_studies WHERE module_id=?').get(body.module_id);
  if (existing) {
    const cases = db.prepare('SELECT * FROM case_studies WHERE module_id=? ORDER BY order_num').all(body.module_id) as Array<Record<string, unknown>>;
    return NextResponse.json(cases.map(c => ({ ...c, key_learnings: JSON.parse(c.key_learnings_json as string) })));
  }

  try {
    const cases = await generateCaseStudies(mod.title, mod.skill_category, mod.description);
    const insert = db.prepare(
      'INSERT INTO case_studies (module_id, title, industry, story, analysis, key_learnings_json, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertAll = db.transaction(() => {
      cases.forEach((c, i) => insert.run(body.module_id, c.title, c.industry, c.story, c.analysis, JSON.stringify(c.key_learnings), i + 1));
    });
    insertAll();

    const saved = db.prepare('SELECT * FROM case_studies WHERE module_id=? ORDER BY order_num').all(body.module_id) as Array<Record<string, unknown>>;
    return NextResponse.json(saved.map(c => ({ ...c, key_learnings: JSON.parse(c.key_learnings_json as string) })));
  } catch (err) {
    console.error('Case study error:', err);
    return NextResponse.json({ error: 'Failed to generate case studies' }, { status: 500 });
  }
}
