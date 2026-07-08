import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rows, initDb } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await initDb();

  const plans = await rows('SELECT * FROM study_plans WHERE user_id=$1 ORDER BY created_at DESC', [userId]) as Array<Record<string, unknown>>;

  const plansWithModules = await Promise.all(plans.map(async plan => {
    const modules = await rows('SELECT * FROM study_modules WHERE plan_id=$1 ORDER BY order_num', [plan.id as number]) as Array<Record<string, unknown>>;
    return {
      ...plan,
      skill_gaps: JSON.parse(plan.skill_gaps_json as string),
      modules: modules.map(m => ({
        id: m.id, title: m.title, status: m.status,
        estimated_hours: m.estimated_hours, order_num: m.order_num,
      })),
    };
  }));

  const allModuleIds = plansWithModules.flatMap(p => p.modules.map(m => (m as { id: number }).id));

  const allModules = allModuleIds.length
    ? await rows<{ status: string }>(`SELECT status FROM study_modules WHERE id = ANY($1::int[])`, [allModuleIds])
    : [];

  const testIdRows = allModuleIds.length
    ? await rows<{ id: number }>(`SELECT id FROM tests WHERE module_id = ANY($1::int[])`, [allModuleIds])
    : [];
  const testIds = testIdRows.map(t => t.id);

  const allAttempts = testIds.length
    ? await rows<{ score: number; passed: number }>(`SELECT score, passed FROM test_attempts WHERE test_id = ANY($1::int[])`, [testIds])
    : [];

  const completedModules = allModules.filter(m => m.status === 'completed').length;
  const inProgressModules = allModules.filter(m => m.status === 'in_progress').length;
  const passedTests = allAttempts.filter(a => a.passed).length;
  const averageScore = allAttempts.length
    ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length)
    : 0;

  return NextResponse.json({
    totalModules: allModules.length,
    completedModules,
    inProgressModules,
    totalTestAttempts: allAttempts.length,
    passedTests,
    averageScore,
    studyPlans: plansWithModules,
  });
}
