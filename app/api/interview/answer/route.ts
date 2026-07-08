export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rows, row, run, initDb } from '@/lib/db';
import { evaluateAnswer } from '@/lib/claude';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await initDb();
  const { interview_id, question_id, answer_text } = await request.json() as {
    interview_id: number;
    question_id: number;
    answer_text: string;
  };

  const interview = await row<{
    id: number; job_title: string; description_raw: string; description_summary: string;
  }>(
    'SELECT i.*, j.title as job_title, j.description_raw, j.description_summary FROM interviews i JOIN job_listings j ON i.job_listing_id = j.id WHERE i.id=$1 AND i.user_id=$2',
    [interview_id, userId]
  );
  if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 });

  const question = await row<{
    id: number; question: string; question_type: string;
  }>(
    'SELECT * FROM interview_questions WHERE id=$1 AND interview_id=$2',
    [question_id, interview_id]
  );
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  try {
    const jobDescription = interview.description_raw || interview.description_summary;
    const feedback = await evaluateAnswer(
      question.question, question.question_type, answer_text,
      interview.job_title, jobDescription,
    );

    await run(
      `INSERT INTO interview_answers (question_id, answer_text, score, strengths_json, improvements_json, sample_answer)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        question_id, answer_text, feedback.score,
        JSON.stringify(feedback.strengths),
        JSON.stringify(feedback.improvements),
        feedback.sample_answer,
      ]
    );

    // Check if all questions answered — if so, compute overall score
    const countRow = await row<{ n: string }>('SELECT COUNT(*) as n FROM interview_questions WHERE interview_id=$1', [interview_id]);
    const totalQ = Number(countRow?.n ?? 0);
    const answers = await rows<{ score: number }>(
      `SELECT ia.score FROM interview_answers ia
       JOIN interview_questions iq ON ia.question_id = iq.id
       WHERE iq.interview_id=$1`,
      [interview_id]
    );

    if (answers.length >= totalQ) {
      const avg = answers.reduce((s, a) => s + a.score, 0) / answers.length;
      const overallFeedback = avg >= 8 ? 'Excellent performance — you\'re well-prepared for this role.'
        : avg >= 6 ? 'Good performance with some areas to strengthen before the real interview.'
        : avg >= 4 ? 'Fair performance — focus on the improvement areas before applying.'
        : 'Needs more preparation — review the sample answers and practise again.';
      await run(
        'UPDATE interviews SET status=$1, overall_score=$2, overall_feedback=$3 WHERE id=$4',
        ['completed', Math.round(avg * 10) / 10, overallFeedback, interview_id]
      );
    }

    return NextResponse.json(feedback);
  } catch (err) {
    console.error('Answer evaluation error:', err);
    return NextResponse.json({ error: 'Failed to evaluate answer' }, { status: 500 });
  }
}
