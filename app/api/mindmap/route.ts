import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { row, run, initDb } from '@/lib/db';
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

  await initDb();
  const mindmapRow = await row(
    'SELECT data_json FROM mindmaps WHERE module_id=$1 ORDER BY created_at DESC LIMIT 1',
    [Number(moduleId)]
  ) as { data_json: string } | undefined;

  if (!mindmapRow) return NextResponse.json(null);
  return NextResponse.json(JSON.parse(mindmapRow.data_json));
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { module_id } = await req.json() as { module_id: number };
  await initDb();

  const mod = await row('SELECT title, skill_category, description FROM study_modules WHERE id=$1', [module_id]) as
    { title: string; skill_category: string; description: string } | undefined;
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  try {
    const data = await generateMindmap(mod.title, mod.skill_category, mod.description);
    await run('INSERT INTO mindmaps (module_id, data_json) VALUES ($1,$2)', [module_id, JSON.stringify(data)]);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Mindmap generation error:', err);
    return NextResponse.json({ error: 'Failed to generate mindmap' }, { status: 500 });
  }
}
