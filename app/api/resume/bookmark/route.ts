import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { module_id, chapter_idx } = await req.json() as { module_id: number; chapter_idx: number };
  const db = getDb();

  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(`bookmark_${userId}`, JSON.stringify({ module_id, chapter_idx }));

  // Mark module in_progress when user actively reads it
  db.prepare(`UPDATE study_modules SET status='in_progress' WHERE id=? AND status='available'`)
    .run(module_id);

  return NextResponse.json({ ok: true });
}
