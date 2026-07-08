import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rows, row, initDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await initDb();
  const id = request.nextUrl.searchParams.get('id');

  // Single resume by ID
  if (id) {
    const resumeRow = await row(
      `SELECT r.*, jl.title as job_title, jl.company, jl.location, jl.source_site
       FROM resumes r JOIN job_listings jl ON r.job_listing_id = jl.id
       WHERE r.id=$1 AND r.user_id=$2`,
      [Number(id), userId]
    ) as Record<string, unknown> | undefined;
    if (!resumeRow) return NextResponse.json(null);
    return NextResponse.json({ ...resumeRow, content: JSON.parse(resumeRow.content_json as string) });
  }

  // All resumes for this user, newest first
  const resumeRows = await rows(
    `SELECT r.id, r.job_listing_id, r.created_at,
            jl.title as job_title, jl.company, jl.location, jl.source_site
     FROM resumes r JOIN job_listings jl ON r.job_listing_id = jl.id
     WHERE r.user_id=$1
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return NextResponse.json(resumeRows);
}
