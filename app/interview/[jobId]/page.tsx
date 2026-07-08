'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Mic, ChevronRight, Loader2, CheckCircle2, XCircle,
  ArrowLeft, RotateCcw, Trophy, AlertTriangle, Lightbulb,
} from 'lucide-react';

type InterviewType = 'behavioral' | 'technical' | 'mixed';

interface Question {
  id: number;
  question: string;
  question_type: string;
  order_num: number;
}

interface Feedback {
  score: number;
  strengths: string[];
  improvements: string[];
  sample_answer: string;
}

const TYPE_BADGE: Record<string, string> = {
  behavioral: 'bg-violet-100 text-violet-700',
  technical: 'bg-blue-100 text-blue-700',
  situational: 'bg-amber-100 text-amber-700',
  hr: 'bg-green-100 text-green-700',
};

function ScoreRing({ score }: { score: number }) {
  const pct = score / 10;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const color = score >= 8 ? '#10B981' : score >= 6 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative inline-flex items-center justify-center w-16 h-16">
      <svg className="absolute inset-0 -rotate-90" width="64" height="64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <span className="relative text-lg font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function InterviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  const [stage, setStage] = useState<'setup' | 'loading' | 'question' | 'feedback' | 'done'>('setup');
  const [interviewType, setInterviewType] = useState<InterviewType>('mixed');
  const [interviewId, setInterviewId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedbacks, setFeedbacks] = useState<(Feedback | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (stage === 'question') {
      setAnswer('');
      setShowSample(false);
      textareaRef.current?.focus();
    }
  }, [stage, currentIdx]);

  async function startInterview() {
    setStage('loading');
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: Number(jobId), interview_type: interviewType }),
      });
      const data = await res.json() as { id: number; questions: Question[] };
      if (!res.ok) throw new Error();
      setInterviewId(data.id);
      setQuestions(data.questions);
      setFeedbacks(new Array(data.questions.length).fill(null));
      setCurrentIdx(0);
      setStage('question');
    } catch {
      setStage('setup');
      alert('Failed to generate questions. Please try again.');
    }
  }

  async function submitAnswer() {
    if (!answer.trim() || !interviewId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_id: interviewId,
          question_id: questions[currentIdx].id,
          answer_text: answer,
        }),
      });
      const fb = await res.json() as Feedback;
      const updated = [...feedbacks];
      updated[currentIdx] = fb;
      setFeedbacks(updated);
      setStage('feedback');
    } catch {
      alert('Failed to evaluate answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setStage('question');
    } else {
      setStage('done');
    }
  }

  const avgScore = feedbacks.filter(Boolean).length
    ? Math.round(feedbacks.filter(Boolean).reduce((s, f) => s + (f?.score ?? 0), 0) / feedbacks.filter(Boolean).length * 10) / 10
    : 0;

  // ── Setup ────────────────────────────────────────────────────────────────────
  if (stage === 'setup') return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => router.back()} className="btn-secondary text-sm px-3 py-1.5 mb-8">
        <ArrowLeft size={14} /> Back
      </button>
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Mic size={28} className="text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Simulation</h1>
          <p className="text-gray-500 mt-2 text-sm">6 questions tailored to this job. Answer each one, get instant AI feedback.</p>
        </div>

        <p className="text-sm font-semibold text-gray-700 mb-3">Choose interview type</p>
        <div className="space-y-3 mb-8">
          {([
            ['mixed', '🎯 Mixed', 'HR intro + behavioral stories + technical questions — closest to a real interview'],
            ['behavioral', '🧠 Behavioral', 'STAR-method questions about past experience and how you handle situations'],
            ['technical', '⚙️ Technical', 'Role-specific technical knowledge, problem-solving, and system thinking'],
          ] as const).map(([val, label, desc]) => (
            <label key={val} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              interviewType === val ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input type="radio" name="type" value={val} checked={interviewType === val}
                onChange={() => setInterviewType(val)} className="mt-0.5 accent-teal-600" />
              <div>
                <div className="font-semibold text-gray-900 text-sm">{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
            </label>
          ))}
        </div>

        <button onClick={startInterview} className="btn-primary w-full justify-center py-3">
          Start Interview <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (stage === 'loading') return (
    <div className="max-w-lg mx-auto text-center py-24">
      <Loader2 size={36} className="animate-spin text-teal-500 mx-auto mb-4" />
      <p className="font-semibold text-gray-900">Preparing your interview...</p>
      <p className="text-sm text-gray-400 mt-1">Claude is crafting questions tailored to this role</p>
    </div>
  );

  const q = questions[currentIdx];
  const fb = feedbacks[currentIdx];

  // ── Question ────────────────────────────────────────────────────────────────
  if (stage === 'question') return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="btn-secondary text-sm px-3 py-1.5">
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[q.question_type] ?? 'bg-gray-100 text-gray-600'}`}>
              {q.question_type}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${((currentIdx) / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="card p-6 mb-4">
        <p className="text-lg font-semibold text-gray-900 leading-relaxed">{q.question}</p>
      </div>

      <div className="card p-4 mb-4">
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Type your answer here... Take your time, structure your thoughts."
          rows={7}
          className="w-full resize-none text-sm text-gray-800 outline-none placeholder-gray-400 leading-relaxed"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{answer.trim().split(/\s+/).filter(Boolean).length} words</span>
          <button
            onClick={submitAnswer}
            disabled={!answer.trim() || submitting}
            className="btn-primary text-sm px-5"
          >
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Evaluating...</> : <>Submit Answer <ChevronRight size={14} /></>}
          </button>
        </div>
      </div>

      {q.question_type === 'behavioral' && (
        <p className="text-xs text-gray-400 text-center">
          💡 Tip: Use the STAR method — Situation, Task, Action, Result
        </p>
      )}
    </div>
  );

  // ── Feedback ────────────────────────────────────────────────────────────────
  if (stage === 'feedback' && fb) return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {currentIdx + 1} / {questions.length}
        </span>
      </div>

      {/* Score */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-5">
          <ScoreRing score={fb.score} />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</p>
            <p className="font-bold text-gray-900 mt-0.5">
              {fb.score >= 8 ? 'Excellent answer!' : fb.score >= 6 ? 'Good answer' : fb.score >= 4 ? 'Fair answer' : 'Needs improvement'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{q.question}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Strengths */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="text-sm font-semibold text-gray-700">What worked well</span>
          </div>
          <ul className="space-y-2">
            {fb.strengths.map((s, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-emerald-400 shrink-0 mt-0.5">›</span>{s}
              </li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-500" />
            <span className="text-sm font-semibold text-gray-700">What to improve</span>
          </div>
          <ul className="space-y-2">
            {fb.improvements.map((s, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-amber-400 shrink-0 mt-0.5">›</span>{s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sample answer */}
      <div className="card p-4 mb-6">
        <button onClick={() => setShowSample(v => !v)}
          className="flex items-center gap-2 w-full text-left">
          <Lightbulb size={15} className="text-teal-500" />
          <span className="text-sm font-semibold text-gray-700">
            {showSample ? 'Hide' : 'Show'} sample strong answer
          </span>
        </button>
        {showSample && (
          <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 leading-relaxed italic">
            "{fb.sample_answer}"
          </p>
        )}
      </div>

      <button onClick={next} className="btn-primary w-full justify-center py-3">
        {currentIdx < questions.length - 1 ? <>Next Question <ChevronRight size={16} /></> : <>See Results <Trophy size={16} /></>}
      </button>
    </div>
  );

  // ── Done / Results ──────────────────────────────────────────────────────────
  if (stage === 'done') return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="card p-8 mb-6 text-center">
        <div className="flex items-center justify-center mb-4">
          <ScoreRing score={avgScore} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Interview Complete</h2>
        <p className="text-gray-500 mt-1 text-sm">
          {avgScore >= 8 ? 'Outstanding — you\'re ready for the real thing!'
            : avgScore >= 6 ? 'Good performance — a little more practice and you\'ll nail it.'
            : avgScore >= 4 ? 'Fair start — review the feedback and practise again.'
            : 'Keep practising — each attempt builds confidence.'}
        </p>
      </div>

      {/* Per-question recap */}
      <div className="space-y-3 mb-6">
        {questions.map((question, i) => {
          const f = feedbacks[i];
          return (
            <div key={i} className="card p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  !f ? 'bg-gray-100 text-gray-400'
                    : f.score >= 8 ? 'bg-emerald-100 text-emerald-700'
                    : f.score >= 6 ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {f ? f.score : '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{question.question}</p>
                  {f && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {f.strengths.slice(0, 1).map((s, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">{s}</span>
                      ))}
                      {f.improvements.slice(0, 1).map((s, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={() => { setStage('setup'); setQuestions([]); setFeedbacks([]); setCurrentIdx(0); }}
          className="btn-secondary flex-1 justify-center">
          <RotateCcw size={14} /> Try Again
        </button>
        <button onClick={() => router.push(`/job/${jobId}`)} className="btn-primary flex-1 justify-center">
          Back to Job
        </button>
      </div>
    </div>
  );

  return null;
}
