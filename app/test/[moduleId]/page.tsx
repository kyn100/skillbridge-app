'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Trophy, ChevronRight } from 'lucide-react';
import type { Test, TestQuestion } from '@/lib/types';

interface TestWithAttempts extends Test {
  attempts: Array<{ score: number; passed: number; created_at: string }>;
}

const LEVEL_LABELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
const LEVEL_COLORS = {
  1: 'bg-green-50 border-green-200 text-green-700',
  2: 'bg-amber-50 border-amber-200 text-amber-700',
  3: 'bg-red-50 border-red-200 text-red-700',
};

export default function TestPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const router = useRouter();
  const [tests, setTests] = useState<TestWithAttempts[]>([]);
  const [activeTest, setActiveTest] = useState<TestWithAttempts | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; correct: number; total: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    if (!moduleId) return;
    fetch(`/api/tests?moduleId=${moduleId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTests(data); })
      .catch(() => {});
  }, [moduleId]);

  async function startTest(level: 1 | 2 | 3) {
    setGenerating(true);
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', module_id: Number(moduleId), level }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? 'Failed to generate test'); setGenerating(false); return; }
      setActiveTest(data);
      setSelectedAnswers(new Array((data.questions ?? []).length).fill(null));
      setSubmitted(false);
      setResult(null);
      setCurrentQ(0);
    } catch {
      alert('Failed to generate test. Please try again.');
    }
    setGenerating(false);
  }

  async function submitTest() {
    if (!activeTest) return;
    const res = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', test_id: activeTest.id, answers: selectedAnswers }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? 'Submit failed'); return; }
    setResult(data);
    setSubmitted(true);
    fetch(`/api/tests?moduleId=${moduleId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTests(d); })
      .catch(() => {});
  }

  function bestScore(test: TestWithAttempts): number | null {
    if (!test.attempts.length) return null;
    return Math.max(...test.attempts.map(a => a.score));
  }

  function isPassed(test: TestWithAttempts) {
    return test.attempts.some(a => a.passed);
  }

  if (activeTest) {
    const q: TestQuestion = activeTest.questions[currentQ];
    const allAnswered = selectedAnswers.every(a => a !== null);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setActiveTest(null)} className="btn-secondary text-sm px-3 py-1.5">
            <ArrowLeft size={14} /> Exit Test
          </button>
          <div className="text-sm text-gray-500">{currentQ + 1} / {activeTest.questions.length}</div>
        </div>

        <div className="card p-4 mb-2">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${((currentQ + 1) / activeTest.questions.length) * 100}%` }} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 text-lg mb-5">{q.question}</h2>
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let cls = 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
              if (submitted) {
                if (i === q.correct_index) cls = 'border-green-400 bg-green-50';
                else if (selectedAnswers[currentQ] === i) cls = 'border-red-400 bg-red-50';
                else cls = 'border-gray-200 opacity-60';
              } else if (selectedAnswers[currentQ] === i) {
                cls = 'border-blue-500 bg-blue-50';
              }
              return (
                <button
                  key={i}
                  disabled={submitted}
                  onClick={() => {
                    const a = [...selectedAnswers];
                    a[currentQ] = i;
                    setSelectedAnswers(a);
                  }}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-all ${cls}`}
                >
                  <span className="font-medium">{opt}</span>
                  {submitted && i === q.correct_index && <CheckCircle size={16} className="inline ml-2 text-green-600" />}
                  {submitted && selectedAnswers[currentQ] === i && i !== q.correct_index && <XCircle size={16} className="inline ml-2 text-red-500" />}
                </button>
              );
            })}
          </div>

          {submitted && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Explanation:</p>
              <p className="text-sm text-gray-600 mt-1">{q.explanation}</p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentQ(c => Math.max(0, c - 1))} disabled={currentQ === 0} className="btn-secondary disabled:opacity-40 text-sm">Previous</button>
            {currentQ < activeTest.questions.length - 1 ? (
              <button onClick={() => setCurrentQ(c => c + 1)} disabled={!submitted && selectedAnswers[currentQ] === null} className="btn-primary text-sm">
                Next <ChevronRight size={14} />
              </button>
            ) : (
              !submitted ? (
                <button onClick={submitTest} disabled={!allAnswered} className="btn-primary text-sm">
                  Submit Test
                </button>
              ) : result && (
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {result.score}% {result.passed ? '✓ Passed' : '✗ Failed'}
                  </span>
                  <button onClick={() => setActiveTest(null)} className="btn-secondary text-sm">
                    Done
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push(`/module/${moduleId}`)} className="btn-secondary text-sm px-3 py-1.5 mb-6">
        <ArrowLeft size={14} /> Back to Textbook
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Module Tests</h1>
      <p className="text-gray-500 mb-6">Complete all 3 levels to finish this module. Pass each level (≥70%) to unlock the next.</p>

      {generating && (
        <div className="card p-8 text-center mb-4">
          <Loader2 size={28} className="animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500">Generating your test questions...</p>
        </div>
      )}

      <div className="space-y-4">
        {([1, 2, 3] as const).map(level => {
          const existing = tests.find(t => t.level === level);
          const passed = existing ? isPassed(existing) : false;
          const best = existing ? bestScore(existing) : null;
          const canStart = level === 1 || tests.find(t => t.level === (level - 1) as 1 | 2)?.attempts.some(a => a.passed);

          return (
            <div key={level} className={`card p-5 border-2 ${LEVEL_COLORS[level]}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{LEVEL_LABELS[level]}</span>
                    {passed && <Trophy size={16} className="text-amber-500" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {level === 1 && 'Basic concepts and definitions'}
                    {level === 2 && 'Application and problem-solving'}
                    {level === 3 && 'Expert-level synthesis and analysis'}
                  </p>
                  {best !== null && (
                    <p className="text-xs mt-1">Best score: <span className={`font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>{best}%</span></p>
                  )}
                </div>
                <button
                  onClick={() => startTest(level)}
                  disabled={!canStart || generating}
                  className={canStart ? 'btn-primary text-sm' : 'btn-secondary text-sm opacity-40 cursor-not-allowed'}
                >
                  {passed ? 'Retake' : 'Start Test'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
