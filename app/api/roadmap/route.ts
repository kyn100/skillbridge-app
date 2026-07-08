export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { row, run, initDb } from '@/lib/db';
import { generateRoadmap } from '@/lib/claude';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get('fieldId');
  if (!fieldId) return NextResponse.json({ error: 'fieldId required' }, { status: 400 });
  await initDb();
  const roadmapRow = await row('SELECT * FROM field_roadmaps WHERE field_id=$1', [fieldId]) as Record<string, unknown> | undefined;
  if (!roadmapRow) return NextResponse.json(null);
  return NextResponse.json(JSON.parse(roadmapRow.content_json as string));
}

export async function POST(req: Request) {
  const body = await req.json() as { field_id: number };
  await initDb();

  const field = await row('SELECT * FROM job_fields WHERE id=$1', [body.field_id]) as Record<string, string> | undefined;
  if (!field) return NextResponse.json({ error: 'Field not found' }, { status: 404 });

  const existing = await row('SELECT content_json FROM field_roadmaps WHERE field_id=$1', [body.field_id]) as { content_json: string } | undefined;
  if (existing) return NextResponse.json(JSON.parse(existing.content_json));

  try {
    const roadmap = await generateRoadmap(field.name, field.description);
    await run('INSERT INTO field_roadmaps (field_id, content_json) VALUES ($1,$2)', [body.field_id, JSON.stringify(roadmap)]);
    return NextResponse.json(roadmap);
  } catch (err) {
    console.error('Roadmap error:', err);
    return NextResponse.json({ error: 'Failed to generate roadmap' }, { status: 500 });
  }
}
