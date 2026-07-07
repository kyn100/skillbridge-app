import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateRoadmap } from '@/lib/claude';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get('fieldId');
  if (!fieldId) return NextResponse.json({ error: 'fieldId required' }, { status: 400 });
  const db = getDb();
  const row = db.prepare('SELECT * FROM field_roadmaps WHERE field_id=?').get(fieldId) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json(null);
  return NextResponse.json(JSON.parse(row.content_json as string));
}

export async function POST(req: Request) {
  const body = await req.json() as { field_id: number };
  const db = getDb();

  const field = db.prepare('SELECT * FROM job_fields WHERE id=?').get(body.field_id) as Record<string, string> | undefined;
  if (!field) return NextResponse.json({ error: 'Field not found' }, { status: 404 });

  const existing = db.prepare('SELECT content_json FROM field_roadmaps WHERE field_id=?').get(body.field_id) as { content_json: string } | undefined;
  if (existing) return NextResponse.json(JSON.parse(existing.content_json));

  try {
    const roadmap = await generateRoadmap(field.name, field.description);
    db.prepare('INSERT INTO field_roadmaps (field_id, content_json) VALUES (?, ?)').run(body.field_id, JSON.stringify(roadmap));
    return NextResponse.json(roadmap);
  } catch (err) {
    console.error('Roadmap error:', err);
    return NextResponse.json({ error: 'Failed to generate roadmap' }, { status: 500 });
  }
}
