import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateTest } from '@/lib/claude';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  const testId = searchParams.get('testId');
  const db = getDb();

  if (testId) {
    const test = db.prepare('SELECT * FROM tests WHERE id=?').get(testId) as Record<string, unknown> | undefined;
    if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const attempts = db.prepare('SELECT * FROM test_attempts WHERE test_id=? ORDER BY created_at DESC').all(testId);
    return NextResponse.json({ ...test, questions: JSON.parse(test.questions_json as string), attempts });
  }

  if (moduleId) {
    const tests = db.prepare('SELECT * FROM tests WHERE module_id=? ORDER BY level').all(moduleId) as Array<Record<string, unknown>>;
    const attemptsMap: Record<number, unknown[]> = {};
    for (const t of tests) {
      attemptsMap[t.id as number] = db.prepare('SELECT * FROM test_attempts WHERE test_id=? ORDER BY created_at DESC').all(t.id as number);
    }
    return NextResponse.json(tests.map(t => ({ ...t, questions: JSON.parse(t.questions_json as string), attempts: attemptsMap[t.id as number] ?? [] })));
  }

  return NextResponse.json({ error: 'moduleId or testId required' }, { status: 400 });
}

export async function POST(req: Request) {
  const body = await req.json() as { action: string; module_id?: number; level?: 1 | 2 | 3; test_id?: number; answers?: number[] };
  const db = getDb();

  if (body.action === 'generate') {
    const mod = db.prepare('SELECT * FROM study_modules WHERE id=?').get(body.module_id) as Record<string, string> | undefined;
    if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    const existing = db.prepare('SELECT * FROM tests WHERE module_id=? AND level=?').get(body.module_id, body.level);
    if (existing) {
      const t = existing as Record<string, unknown>;
      return NextResponse.json({ ...t, questions: JSON.parse(t.questions_json as string) });
    }

    const chapters = db.prepare('SELECT content_markdown FROM textbook_chapters WHERE module_id=? ORDER BY order_num').all(body.module_id) as Array<{ content_markdown: string }>;
    const combinedContent = chapters.map(c => c.content_markdown).join('\n\n');

    try {
      const testData = await generateTest(mod.title, body.level!, combinedContent);
      const result = db.prepare(
        'INSERT INTO tests (module_id, level, title, questions_json) VALUES (?, ?, ?, ?)'
      ).run(body.module_id, body.level, testData.title, JSON.stringify(testData.questions));
      const created = db.prepare('SELECT * FROM tests WHERE id=?').get(result.lastInsertRowid) as Record<string, unknown>;
      return NextResponse.json({ ...created, questions: JSON.parse(created.questions_json as string) });
    } catch (err) {
      console.error('Test generation error:', err);
      return NextResponse.json({ error: 'Failed to generate test' }, { status: 500 });
    }
  }

  if (body.action === 'submit') {
    const test = db.prepare('SELECT * FROM tests WHERE id=?').get(body.test_id) as Record<string, unknown> | undefined;
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    const questions = JSON.parse(test.questions_json as string) as Array<{ correct_index: number }>;
    const answers = body.answers ?? [];
    const correct = answers.filter((a, i) => a === questions[i]?.correct_index).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (test.passing_score as number);

    db.prepare('INSERT INTO test_attempts (test_id, score, answers_json, passed) VALUES (?, ?, ?, ?)').run(
      body.test_id, score, JSON.stringify(answers), passed ? 1 : 0,
    );

    if (passed) {
      const level = test.level as number;
      const moduleId = test.module_id as number;
      if (level === 3) {
        db.prepare("UPDATE study_modules SET status='completed' WHERE id=?").run(moduleId);
        const nextModule = db.prepare(`
          SELECT sm.* FROM study_modules sm
          JOIN study_plans sp ON sm.plan_id = sp.id
          WHERE sm.plan_id = (SELECT plan_id FROM study_modules WHERE id=?)
          AND sm.order_num > (SELECT order_num FROM study_modules WHERE id=?)
          ORDER BY sm.order_num LIMIT 1
        `).get(moduleId, moduleId) as Record<string, unknown> | undefined;
        if (nextModule) {
          db.prepare("UPDATE study_modules SET status='available' WHERE id=?").run(nextModule.id);
        }
      }
    }

    return NextResponse.json({ score, passed, correct, total: questions.length });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
