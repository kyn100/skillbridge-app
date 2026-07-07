import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateDailyRoutine } from '@/lib/claude';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { project_name, project_description, technologies, job_title } =
    await req.json() as {
      project_name: string;
      project_description: string;
      technologies: string[];
      job_title: string;
    };

  try {
    const routine = await generateDailyRoutine(
      project_name,
      project_description,
      technologies,
      job_title ?? 'Software Engineer',
    );
    return NextResponse.json(routine);
  } catch (err) {
    console.error('Daily routine error:', err);
    return NextResponse.json({ error: 'Failed to generate routine' }, { status: 500 });
  }
}
