import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rows, row, run, initDb } from '@/lib/db';
import { generateInterviewQuestions } from '@/lib/claude';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await initDb();
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (jobId) {
    const interviews = await rows(
      `SELECT i.*, j.title as job_title, j.company
       FROM interviews i JOIN job_listings j ON i.job_listing_id = j.id
       WHERE i.job_listing_id=$1 AND i.user_id=$2
       ORDER BY i.created_at DESC`,
      [Number(jobId), userId]
    );
    return NextResponse.json(interviews);
  }

  const interviews = await rows(
    `SELECT i.*, j.title as job_title, j.company
     FROM interviews i JOIN job_listings j ON i.job_listing_id = j.id
     WHERE i.user_id=$1 ORDER BY i.created_at DESC LIMIT 20`,
    [userId]
  );
  return NextResponse.json(interviews);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await initDb();
  const { job_id, interview_type } = await request.json() as {
    job_id: number;
    interview_type: 'behavioral' | 'technical' | 'mixed';
  };

  const job = await row<{
    id: number; title: string; company: string; description_raw: string; description_summary: string;
  }>('SELECT * FROM job_listings WHERE id=$1', [job_id]);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const resumeRow = await row<{ content_json: string }>(
    'SELECT content_json FROM resumes WHERE job_listing_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1',
    [job_id, userId]
  );

  const resumeSummary = resumeRow
    ? (() => {
        const c = JSON.parse(resumeRow.content_json);
        return `${c.summary ?? ''} Skills: ${(c.skills ?? []).flatMap((s: { items: string[] }) => s.items).join(', ')}`;
      })()
    : 'No resume on file.';

  const jobDescription = job.description_raw || job.description_summary;

  try {
    const questions = await generateInterviewQuestions(
      job.title, job.company, jobDescription, resumeSummary, interview_type
    );

    const { id: interviewId } = await run(
      'INSERT INTO interviews (job_listing_id, user_id, interview_type) VALUES ($1,$2,$3) RETURNING id',
      [job_id, userId, interview_type]
    );

    for (let i = 0; i < questions.length; i++) {
      await run(
        'INSERT INTO interview_questions (interview_id, question, question_type, order_num) VALUES ($1,$2,$3,$4)',
        [interviewId, questions[i].question, questions[i].question_type, i + 1]
      );
    }

    const savedQuestions = await rows(
      'SELECT * FROM interview_questions WHERE interview_id=$1 ORDER BY order_num',
      [interviewId]
    );

    return NextResponse.json({ id: interviewId, questions: savedQuestions });
  } catch (err) {
    console.error('Interview generation error:', err);
    return NextResponse.json({ error: 'Failed to generate interview questions' }, { status: 500 });
  }
}
