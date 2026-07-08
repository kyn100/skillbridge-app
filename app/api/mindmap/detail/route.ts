export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { row, initDb } from '@/lib/db';
import { generateConceptDetail } from '@/lib/claude';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { concept, module_id, branch_label } = await req.json() as {
    concept: string;
    module_id: number;
    branch_label: string;
  };

  await initDb();
  const mod = await row('SELECT title FROM study_modules WHERE id=$1', [module_id]) as
    { title: string } | undefined;

  try {
    const detail = await generateConceptDetail(concept, mod?.title ?? '', branch_label);
    return NextResponse.json(detail);
  } catch (err) {
    console.error('Concept detail error:', err);
    return NextResponse.json({ error: 'Failed to generate detail' }, { status: 500 });
  }
}
