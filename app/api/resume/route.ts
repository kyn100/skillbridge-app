import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json(null);

  const db = getDb();

  // Most active module: prefer in_progress over available, most recent plan first
  const row = db.prepare(`
    SELECT
      sm.id            AS module_id,
      sm.title         AS module_title,
      sm.skill_category,
      sm.status        AS module_status,
      sm.order_num,
      sp.id            AS plan_id,
      sp.resume_id,
      sp.job_listing_id,
      sp.created_at    AS plan_created_at,
      jl.title         AS job_title,
      jl.company
    FROM study_modules sm
    JOIN study_plans   sp ON sm.plan_id = sp.id
    JOIN job_listings  jl ON sp.job_listing_id = jl.id
    WHERE sp.user_id = ?
      AND sm.status IN ('in_progress', 'available')
    ORDER BY
      CASE sm.status WHEN 'in_progress' THEN 0 WHEN 'available' THEN 1 END,
      sp.created_at DESC,
      sm.order_num ASC
    LIMIT 1
  `).get(userId) as Record<string, unknown> | undefined;

  if (!row) return NextResponse.json(null);

  const progress = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed
    FROM study_modules WHERE plan_id = ?
  `).get(row.plan_id as number) as { total: number; completed: number };

  let chapter_idx = 0;
  const bm = db.prepare('SELECT value FROM settings WHERE key=?')
    .get(`bookmark_${userId}`) as { value: string } | undefined;
  if (bm) {
    try {
      const parsed = JSON.parse(bm.value) as { module_id: number; chapter_idx: number };
      if (parsed.module_id === row.module_id) chapter_idx = parsed.chapter_idx;
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    module: {
      id: row.module_id,
      title: row.module_title,
      skill_category: row.skill_category,
      status: row.module_status,
    },
    chapter_idx,
    job: { title: row.job_title, company: row.company },
    plan: {
      id: row.plan_id,
      resume_id: row.resume_id,
      total: progress.total,
      completed: Number(progress.completed ?? 0),
    },
  });
}
