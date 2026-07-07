import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import type { UserProfile } from '@/lib/types';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id ?? null;
}

function parseProfile(row: Record<string, unknown>) {
  return {
    ...row,
    education: JSON.parse(row.education_json as string),
    experience: JSON.parse(row.experience_json as string),
    skills: JSON.parse(row.skills_json as string),
  };
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const row = db.prepare('SELECT * FROM user_profile WHERE user_id=? ORDER BY id LIMIT 1').get(userId) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json(null);
  return NextResponse.json(parseProfile(row));
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const body = await req.json() as Partial<UserProfile>;

  const existing = db.prepare('SELECT id FROM user_profile WHERE user_id=?').get(userId) as { id: number } | undefined;
  if (existing) {
    db.prepare(`
      UPDATE user_profile SET
        name=?, email=?, phone=?, summary=?,
        education_json=?, experience_json=?, skills_json=?,
        updated_at=datetime('now')
      WHERE id=?
    `).run(
      body.name ?? '', body.email ?? '', body.phone ?? '', body.summary ?? '',
      JSON.stringify(body.education ?? []),
      JSON.stringify(body.experience ?? []),
      JSON.stringify(body.skills ?? []),
      existing.id,
    );
    const updated = db.prepare('SELECT * FROM user_profile WHERE id=?').get(existing.id) as Record<string, unknown>;
    return NextResponse.json(parseProfile(updated));
  }

  const result = db.prepare(`
    INSERT INTO user_profile (user_id, name, email, phone, summary, education_json, experience_json, skills_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, body.name ?? '', body.email ?? '', body.phone ?? '', body.summary ?? '',
    JSON.stringify(body.education ?? []),
    JSON.stringify(body.experience ?? []),
    JSON.stringify(body.skills ?? []),
  );
  const created = db.prepare('SELECT * FROM user_profile WHERE id=?').get(result.lastInsertRowid) as Record<string, unknown>;
  return NextResponse.json(parseProfile(created));
}
