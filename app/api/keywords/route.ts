import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateKeywords } from '@/lib/claude';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get('fieldId');
  if (!fieldId) return NextResponse.json({ error: 'fieldId required' }, { status: 400 });
  const db = getDb();
  const keywords = db.prepare('SELECT * FROM field_keywords WHERE field_id=? ORDER BY is_default DESC, created_at ASC').all(fieldId);
  return NextResponse.json(keywords);
}

export async function POST(req: Request) {
  const db = getDb();
  const body = await req.json() as { field_id?: number; keyword?: string; generate?: boolean; field_name?: string };

  if (body.generate && body.field_name && body.field_id) {
    const keywords = await generateKeywords(body.field_name);
    const insert = db.prepare('INSERT INTO field_keywords (field_id, keyword, is_default) VALUES (?, ?, 0)');
    const insertMany = db.transaction((kws: string[]) => {
      for (const kw of kws) {
        const exists = db.prepare('SELECT id FROM field_keywords WHERE field_id=? AND keyword=?').get(body.field_id, kw);
        if (!exists) insert.run(body.field_id!, kw);
      }
    });
    insertMany(keywords);
    const all = db.prepare('SELECT * FROM field_keywords WHERE field_id=? ORDER BY is_default DESC, created_at ASC').all(body.field_id);
    return NextResponse.json(all);
  }

  if (!body.field_id || !body.keyword) {
    return NextResponse.json({ error: 'field_id and keyword required' }, { status: 400 });
  }
  const result = db.prepare('INSERT INTO field_keywords (field_id, keyword, is_default) VALUES (?, ?, 0)').run(body.field_id, body.keyword.trim());
  const created = db.prepare('SELECT * FROM field_keywords WHERE id=?').get(result.lastInsertRowid);
  return NextResponse.json(created);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = getDb();
  db.prepare('DELETE FROM field_keywords WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
