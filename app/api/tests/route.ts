import { NextResponse } from 'next/server';
import { rows, row, run, initDb } from '@/lib/db';
import { generateTest } from '@/lib/claude';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  const testId = searchParams.get('testId');
  await initDb();

  if (testId) {
    const test = await row('SELECT * FROM tests WHERE id=$1', [testId]) as Record<string, unknown> | undefined;
    if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const attempts = await rows('SELECT * FROM test_attempts WHERE test_id=$1 ORDER BY created_at DESC', [testId]);
    return NextResponse.json({ ...test, questions: JSON.parse(test.questions_json as string), attempts });
  }

  if (moduleId) {
    const tests = await rows('SELECT * FROM tests WHERE module_id=$1 ORDER BY level', [moduleId]) as Array<Record<string, unknown>>;
    const attemptsMap: Record<number, unknown[]> = {};
    for (const t of tests) {
      attemptsMap[t.id as number] = await rows('SELECT * FROM test_attempts WHERE test_id=$1 ORDER BY created_at DESC', [t.id]);
    }
    return NextResponse.json(tests.map(t => ({ ...t, questions: JSON.parse(t.questions_json as string), attempts: attemptsMap[t.id as number] ?? [] })));
  }

  return NextResponse.json({ error: 'moduleId or testId required' }, { status: 400 });
}

export async function POST(req: Request) {
  const body = await req.json() as { action: string; module_id?: number; level?: 1 | 2 | 3; test_id?: number; answers?: number[] };
  await initDb();

  if (body.action === 'generate') {
    const mod = await row('SELECT * FROM study_modules WHERE id=$1', [body.module_id]) as Record<string, string> | undefined;
    if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    const existing = await row('SELECT * FROM tests WHERE module_id=$1 AND level=$2', [body.module_id, body.level]);
    if (existing) {
      const t = existing as Record<string, unknown>;
      return NextResponse.json({ ...t, questions: JSON.parse(t.questions_json as string) });
    }

    const chapters = await rows('SELECT content_markdown FROM textbook_chapters WHERE module_id=$1 ORDER BY order_num', [body.module_id]) as Array<{ content_markdown: string }>;
    const combinedContent = chapters.map(c => c.content_markdown).join('\n\n');

    try {
      const testData = await generateTest(mod.title, body.level!, combinedContent);
      const { id: testId } = await run(
        'INSERT INTO tests (module_id, level, title, questions_json) VALUES ($1,$2,$3,$4) RETURNING id',
        [body.module_id, body.level, testData.title, JSON.stringify(testData.questions)]
      );
      const created = await row('SELECT * FROM tests WHERE id=$1', [testId]) as Record<string, unknown>;
      return NextResponse.json({ ...created, questions: JSON.parse(created.questions_json as string) });
    } catch (err) {
      console.error('Test generation error:', err);
      return NextResponse.json({ error: 'Failed to generate test' }, { status: 500 });
    }
  }

  if (body.action === 'submit') {
    const test = await row('SELECT * FROM tests WHERE id=$1', [body.test_id]) as Record<string, unknown> | undefined;
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    const questions = JSON.parse(test.questions_json as string) as Array<{ correct_index: number }>;
    const answers = body.answers ?? [];
    const correct = answers.filter((a, i) => a === questions[i]?.correct_index).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (test.passing_score as number);

    await run(
      'INSERT INTO test_attempts (test_id, score, answers_json, passed) VALUES ($1,$2,$3,$4)',
      [body.test_id, score, JSON.stringify(answers), passed ? 1 : 0]
    );

    if (passed) {
      const level = test.level as number;
      const moduleId = test.module_id as number;
      if (level === 3) {
        await run("UPDATE study_modules SET status='completed' WHERE id=$1", [moduleId]);
        const nextModule = await row(`
          SELECT sm.* FROM study_modules sm
          JOIN study_plans sp ON sm.plan_id = sp.id
          WHERE sm.plan_id = (SELECT plan_id FROM study_modules WHERE id=$1)
          AND sm.order_num > (SELECT order_num FROM study_modules WHERE id=$2)
          ORDER BY sm.order_num LIMIT 1
        `, [moduleId, moduleId]) as Record<string, unknown> | undefined;
        if (nextModule) {
          await run("UPDATE study_modules SET status='available' WHERE id=$1", [nextModule.id]);
        }
      }
    }

    return NextResponse.json({ score, passed, correct, total: questions.length });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
