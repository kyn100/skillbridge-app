export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { run, initDb } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { module_id, chapter_idx } = await req.json() as { module_id: number; chapter_idx: number };
  await initDb();

  await run(`
    INSERT INTO settings (key, value) VALUES ($1,$2)
    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value
  `, [`bookmark_${userId}`, JSON.stringify({ module_id, chapter_idx })]);

  // Mark module in_progress when user actively reads it
  await run(`UPDATE study_modules SET status='in_progress' WHERE id=$1 AND status='available'`, [module_id]);

  return NextResponse.json({ ok: true });
}
