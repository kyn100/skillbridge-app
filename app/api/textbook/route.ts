import { NextResponse } from 'next/server';
import { rows, row, run, initDb } from '@/lib/db';
import { generateTextbookChapters } from '@/lib/claude';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 });
  await initDb();
  const chapters = await rows('SELECT * FROM textbook_chapters WHERE module_id=$1 ORDER BY order_num', [moduleId]);
  return NextResponse.json(chapters);
}

export async function POST(req: Request) {
  const body = await req.json() as { module_id: number };
  await initDb();

  const mod = await row('SELECT * FROM study_modules WHERE id=$1', [body.module_id]) as Record<string, string> | undefined;
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const existing = await row('SELECT id FROM textbook_chapters WHERE module_id=$1', [body.module_id]);
  if (existing) {
    const chapters = await rows('SELECT * FROM textbook_chapters WHERE module_id=$1 ORDER BY order_num', [body.module_id]);
    return NextResponse.json(chapters);
  }

  try {
    const chapters = await generateTextbookChapters(mod.title, mod.skill_category, mod.description);
    for (const ch of chapters) {
      await run(
        'INSERT INTO textbook_chapters (module_id, title, content_markdown, order_num) VALUES ($1,$2,$3,$4)',
        [body.module_id, ch.title, ch.content_markdown, ch.order_num]
      );
    }
    await run("UPDATE study_modules SET status='in_progress' WHERE id=$1 AND status='available'", [body.module_id]);

    const saved = await rows('SELECT * FROM textbook_chapters WHERE module_id=$1 ORDER BY order_num', [body.module_id]);
    return NextResponse.json(saved);
  } catch (err) {
    console.error('Textbook error:', err);
    return NextResponse.json({ error: 'Failed to generate textbook' }, { status: 500 });
  }
}
