import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateTextbookChapters } from '@/lib/claude';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 });
  const db = getDb();
  const chapters = db.prepare('SELECT * FROM textbook_chapters WHERE module_id=? ORDER BY order_num').all(moduleId);
  return NextResponse.json(chapters);
}

export async function POST(req: Request) {
  const body = await req.json() as { module_id: number };
  const db = getDb();

  const mod = db.prepare('SELECT * FROM study_modules WHERE id=?').get(body.module_id) as Record<string, string> | undefined;
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const existing = db.prepare('SELECT id FROM textbook_chapters WHERE module_id=?').get(body.module_id);
  if (existing) {
    const chapters = db.prepare('SELECT * FROM textbook_chapters WHERE module_id=? ORDER BY order_num').all(body.module_id);
    return NextResponse.json(chapters);
  }

  try {
    const chapters = await generateTextbookChapters(mod.title, mod.skill_category, mod.description);
    const insert = db.prepare('INSERT INTO textbook_chapters (module_id, title, content_markdown, order_num) VALUES (?, ?, ?, ?)');
    const insertAll = db.transaction(() => {
      for (const ch of chapters) {
        insert.run(body.module_id, ch.title, ch.content_markdown, ch.order_num);
      }
    });
    insertAll();

    db.prepare("UPDATE study_modules SET status='in_progress' WHERE id=? AND status='available'").run(body.module_id);

    const saved = db.prepare('SELECT * FROM textbook_chapters WHERE module_id=? ORDER BY order_num').all(body.module_id);
    return NextResponse.json(saved);
  } catch (err) {
    console.error('Textbook error:', err);
    return NextResponse.json({ error: 'Failed to generate textbook' }, { status: 500 });
  }
}
