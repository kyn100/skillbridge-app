import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateMindmap } from '@/lib/claude';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 });

  const db = getDb();
  const row = db.prepare(
    'SELECT data_json FROM mindmaps WHERE module_id=? ORDER BY created_at DESC LIMIT 1'
  ).get(Number(moduleId)) as { data_json: string } | undefined;

  if (!row) return NextResponse.json(null);
  return NextResponse.json(JSON.parse(row.data_json));
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { module_id } = await req.json() as { module_id: number };
  const db = getDb();

  const mod = db.prepare('SELECT title, skill_category, description FROM study_modules WHERE id=?').get(module_id) as
    { title: string; skill_category: string; description: string } | undefined;
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  try {
    const data = await generateMindmap(mod.title, mod.skill_category, mod.description);
    db.prepare('INSERT INTO mindmaps (module_id, data_json) VALUES (?, ?)').run(module_id, JSON.stringify(data));
    return NextResponse.json(data);
  } catch (err) {
    console.error('Mindmap generation error:', err);
    return NextResponse.json({ error: 'Failed to generate mindmap' }, { status: 500 });
  }
}
