export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run, initDb } from '@/lib/db';
import { generateFlashcards } from '@/lib/claude';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 });
  await initDb();
  const cards = await rows('SELECT * FROM flashcards WHERE module_id=$1 ORDER BY order_num', [moduleId]);
  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const body = await req.json() as { module_id: number };
  await initDb();

  const mod = await row('SELECT * FROM study_modules WHERE id=$1', [body.module_id]) as Record<string, string> | undefined;
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const existing = await row('SELECT id FROM flashcards WHERE module_id=$1', [body.module_id]);
  if (existing) {
    const cards = await rows('SELECT * FROM flashcards WHERE module_id=$1 ORDER BY order_num', [body.module_id]);
    return NextResponse.json(cards);
  }

  try {
    const chapters = await rows('SELECT content_markdown FROM textbook_chapters WHERE module_id=$1 ORDER BY order_num', [body.module_id]) as Array<{ content_markdown: string }>;
    const combinedContent = chapters.map(c => c.content_markdown).join('\n\n');

    const cards = await generateFlashcards(mod.title, combinedContent || mod.description);
    for (let i = 0; i < cards.length; i++) {
      await run(
        'INSERT INTO flashcards (module_id, front, back, order_num) VALUES ($1,$2,$3,$4)',
        [body.module_id, cards[i].front, cards[i].back, i + 1]
      );
    }

    const saved = await rows('SELECT * FROM flashcards WHERE module_id=$1 ORDER BY order_num', [body.module_id]);
    return NextResponse.json(saved);
  } catch (err) {
    console.error('Flashcard error:', err);
    return NextResponse.json({ error: 'Failed to generate flashcards' }, { status: 500 });
  }
}
