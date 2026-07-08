import { NextResponse } from 'next/server';
import { rows, row, run, initDb } from '@/lib/db';
import { generateKeywords } from '@/lib/claude';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get('fieldId');
  if (!fieldId) return NextResponse.json({ error: 'fieldId required' }, { status: 400 });
  await initDb();
  const keywords = await rows('SELECT * FROM field_keywords WHERE field_id=$1 ORDER BY is_default DESC, created_at ASC', [fieldId]);
  return NextResponse.json(keywords);
}

export async function POST(req: Request) {
  await initDb();
  const body = await req.json() as { field_id?: number; keyword?: string; generate?: boolean; field_name?: string };

  if (body.generate && body.field_name && body.field_id) {
    const keywords = await generateKeywords(body.field_name);
    for (const kw of keywords) {
      const exists = await row('SELECT id FROM field_keywords WHERE field_id=$1 AND keyword=$2', [body.field_id, kw]);
      if (!exists) await run('INSERT INTO field_keywords (field_id, keyword, is_default) VALUES ($1,$2,0)', [body.field_id, kw]);
    }
    const all = await rows('SELECT * FROM field_keywords WHERE field_id=$1 ORDER BY is_default DESC, created_at ASC', [body.field_id]);
    return NextResponse.json(all);
  }

  if (!body.field_id || !body.keyword) {
    return NextResponse.json({ error: 'field_id and keyword required' }, { status: 400 });
  }
  const { id } = await run(
    'INSERT INTO field_keywords (field_id, keyword, is_default) VALUES ($1,$2,0) RETURNING id',
    [body.field_id, body.keyword.trim()]
  );
  const created = await row('SELECT * FROM field_keywords WHERE id=$1', [id]);
  return NextResponse.json(created);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await initDb();
  await run('DELETE FROM field_keywords WHERE id=$1', [id]);
  return NextResponse.json({ ok: true });
}
