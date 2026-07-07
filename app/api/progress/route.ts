import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();

  const plans = db.prepare('SELECT * FROM study_plans WHERE user_id=? ORDER BY created_at DESC').all(userId) as Array<Record<string, unknown>>;

  const plansWithModules = plans.map(plan => {
    const modules = db.prepare('SELECT * FROM study_modules WHERE plan_id=? ORDER BY order_num').all(plan.id as number) as Array<Record<string, unknown>>;
    return {
      ...plan,
      skill_gaps: JSON.parse(plan.skill_gaps_json as string),
      modules: modules.map(m => ({
        id: m.id, title: m.title, status: m.status,
        estimated_hours: m.estimated_hours, order_num: m.order_num,
      })),
    };
  });

  const allModuleIds = plansWithModules.flatMap(p => p.modules.map(m => (m as { id: number }).id));

  const allModules = allModuleIds.length
    ? db.prepare(`SELECT status FROM study_modules WHERE id IN (${allModuleIds.map(() => '?').join(',')})`).all(...allModuleIds) as Array<{ status: string }>
    : [];

  const testIds = allModuleIds.length
    ? (db.prepare(`SELECT id FROM tests WHERE module_id IN (${allModuleIds.map(() => '?').join(',')})`).all(...allModuleIds) as Array<{ id: number }>).map(t => t.id)
    : [];

  const allAttempts = testIds.length
    ? db.prepare(`SELECT score, passed FROM test_attempts WHERE test_id IN (${testIds.map(() => '?').join(',')})`).all(...testIds) as Array<{ score: number; passed: number }>
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
