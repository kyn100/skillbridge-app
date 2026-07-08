export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run, initDb } from '@/lib/db';
import { generateVideoRecommendations } from '@/lib/claude';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');
  if (!moduleId) return NextResponse.json({ error: 'moduleId required' }, { status: 400 });
  await initDb();
  const videos = await rows('SELECT * FROM module_videos WHERE module_id=$1 ORDER BY order_num', [moduleId]);
  return NextResponse.json(videos);
}

export async function POST(req: Request) {
  const body = await req.json() as { module_id: number };
  await initDb();

  const mod = await row('SELECT * FROM study_modules WHERE id=$1', [body.module_id]) as Record<string, string> | undefined;
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const existing = await rows('SELECT * FROM module_videos WHERE module_id=$1 ORDER BY order_num', [body.module_id]);
  if (existing.length > 0) return NextResponse.json(existing);

  try {
    const videos = await generateVideoRecommendations(mod.title, mod.skill_category);
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      await run(
        'INSERT INTO module_videos (module_id, title, channel, url, duration, description, order_num) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [body.module_id, v.title, v.channel, v.url, v.duration, v.description, i + 1]
      );
    }
    const saved = await rows('SELECT * FROM module_videos WHERE module_id=$1 ORDER BY order_num', [body.module_id]);
    return NextResponse.json(saved);
  } catch (err) {
    console.error('Video generation error:', err);
    return NextResponse.json({ error: 'Failed to generate videos' }, { status: 500 });
  }
}
