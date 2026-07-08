import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateInterviewQuestions } from '@/lib/claude';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (jobId) {
    const interviews = db.prepare(
      `SELECT i.*, j.title as job_title, j.company
       FROM interviews i JOIN job_listings j ON i.job_listing_id = j.id
       WHERE i.job_listing_id = ? AND i.user_id = ?
       ORDER BY i.created_at DESC`
    ).all(Number(jobId), userId);
    return NextResponse.json(interviews);
  }

  const interviews = db.prepare(
    `SELECT i.*, j.title as job_title, j.company
     FROM interviews i JOIN job_listings j ON i.job_listing_id = j.id
     WHERE i.user_id = ? ORDER BY i.created_at DESC LIMIT 20`
  ).all(userId);
  return NextResponse.json(interviews);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const { job_id, interview_type } = await request.json() as {
    job_id: number;
    interview_type: 'behavioral' | 'technical' | 'mixed';
  };

  const job = db.prepare('SELECT * FROM job_listings WHERE id = ?').get(job_id) as {
    id: number; title: string; company: string; description_raw: string; description_summary: string;
  } | undefined;
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const resumeRow = db.prepare(
    'SELECT content_json FROM resumes WHERE job_listing_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(job_id, userId) as { content_json: string } | undefined;

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

    const interviewResult = db.prepare(
      'INSERT INTO interviews (job_listing_id, user_id, interview_type) VALUES (?, ?, ?)'
    ).run(job_id, userId, interview_type);
    const interviewId = interviewResult.lastInsertRowid as number;

    const insertQ = db.prepare(
      'INSERT INTO interview_questions (interview_id, question, question_type, order_num) VALUES (?, ?, ?, ?)'
    );
    db.transaction(() => {
      questions.forEach((q, i) => insertQ.run(interviewId, q.question, q.question_type, i + 1));
    })();

    const savedQuestions = db.prepare(
      'SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY order_num'
    ).all(interviewId);

    return NextResponse.json({ id: interviewId, questions: savedQuestions });
  } catch (err) {
    console.error('Interview generation error:', err);
    return NextResponse.json({ error: 'Failed to generate interview questions' }, { status: 500 });
  }
}
