import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { row, run, initDb } from '@/lib/db';
import type { UserProfile } from '@/lib/types';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id ?? null;
}

function parseProfile(profileRow: Record<string, unknown>) {
  return {
    ...profileRow,
    education: JSON.parse(profileRow.education_json as string),
    experience: JSON.parse(profileRow.experience_json as string),
    skills: JSON.parse(profileRow.skills_json as string),
  };
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await initDb();
  const profileRow = await row('SELECT * FROM user_profile WHERE user_id=$1 ORDER BY id LIMIT 1', [userId]) as Record<string, unknown> | undefined;
  if (!profileRow) return NextResponse.json(null);
  return NextResponse.json(parseProfile(profileRow));
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await initDb();
  const body = await req.json() as Partial<UserProfile>;

  const existing = await row<{ id: number }>('SELECT id FROM user_profile WHERE user_id=$1', [userId]);
  if (existing) {
    await run(`
      UPDATE user_profile SET
        name=$1, email=$2, phone=$3, summary=$4,
        education_json=$5, experience_json=$6, skills_json=$7,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=$8
    `, [
      body.name ?? '', body.email ?? '', body.phone ?? '', body.summary ?? '',
      JSON.stringify(body.education ?? []),
      JSON.stringify(body.experience ?? []),
      JSON.stringify(body.skills ?? []),
      existing.id,
    ]);
    const updated = await row('SELECT * FROM user_profile WHERE id=$1', [existing.id]) as Record<string, unknown>;
    return NextResponse.json(parseProfile(updated));
  }

  const { id: newId } = await run(`
    INSERT INTO user_profile (user_id, name, email, phone, summary, education_json, experience_json, skills_json)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
  `, [
    userId, body.name ?? '', body.email ?? '', body.phone ?? '', body.summary ?? '',
    JSON.stringify(body.education ?? []),
    JSON.stringify(body.experience ?? []),
    JSON.stringify(body.skills ?? []),
  ]);
  const created = await row('SELECT * FROM user_profile WHERE id=$1', [newId]) as Record<string, unknown>;
  return NextResponse.json(parseProfile(created));
}
