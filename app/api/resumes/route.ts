import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const id = request.nextUrl.searchParams.get('id');

  // Single resume by ID
  if (id) {
    const row = db.prepare(
      `SELECT r.*, jl.title as job_title, jl.company, jl.location, jl.source_site
       FROM resumes r JOIN job_listings jl ON r.job_listing_id = jl.id
       WHERE r.id = ? AND r.user_id = ?`
    ).get(Number(id), userId) as Record<string, unknown> | undefined;
    if (!row) return NextResponse.json(null);
    return NextResponse.json({ ...row, content: JSON.parse(row.content_json as string) });
  }

  // All resumes for this user, newest first
  const rows = db.prepare(
    `SELECT r.id, r.job_listing_id, r.created_at,
            jl.title as job_title, jl.company, jl.location, jl.source_site
     FROM resumes r JOIN job_listings jl ON r.job_listing_id = jl.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`
  ).all(userId);
  return NextResponse.json(rows);
}
