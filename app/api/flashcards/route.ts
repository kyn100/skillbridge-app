import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateFlashcards } from '@/lib/claude';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 });
  const db = getDb();
  const cards = db.prepare('SELECT * FROM flashcards WHERE module_id=? ORDER BY order_num').all(moduleId);
  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const body = await req.json() as { module_id: number };
  const db = getDb();

  const mod = db.prepare('SELECT * FROM study_modules WHERE id=?').get(body.module_id) as Record<string, string> | undefined;
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const existing = db.prepare('SELECT id FROM flashcards WHERE module_id=?').get(body.module_id);
  if (existing) {
    const cards = db.prepare('SELECT * FROM flashcards WHERE module_id=? ORDER BY order_num').all(body.module_id);
    return NextResponse.json(cards);
  }

  try {
    const chapters = db.prepare('SELECT content_markdown FROM textbook_chapters WHERE module_id=? ORDER BY order_num').all(body.module_id) as Array<{ content_markdown: string }>;
    const combinedContent = chapters.map(c => c.content_markdown).join('\n\n');

    const cards = await generateFlashcards(mod.title, combinedContent || mod.description);
    const insert = db.prepare('INSERT INTO flashcards (module_id, front, back, order_num) VALUES (?, ?, ?, ?)');
    const insertAll = db.transaction(() => {
      cards.forEach((card, i) => insert.run(body.module_id, card.front, card.back, i + 1));
    });
    insertAll();

    const saved = db.prepare('SELECT * FROM flashcards WHERE module_id=? ORDER BY order_num').all(body.module_id);
    return NextResponse.json(saved);
  } catch (err) {
    console.error('Flashcard error:', err);
    return NextResponse.json({ error: 'Failed to generate flashcards' }, { status: 500 });
  }
}
