'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, BookMarked, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface CaseStudy {
  id: number;
  title: string;
  industry: string;
  story: string;
  analysis: string;
  key_learnings: string[];
  order_num: number;
}

export default function CasesPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const router = useRouter();

  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: Number(moduleId) }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCases(data);
        setExpanded(new Set([0]));
      } else {
        setError((data as { error?: string }).error ?? 'Failed to generate case studies');
      }
    } catch {
      setError('Network error — could not generate case studies');
    }
    setGenerating(false);
    setLoading(false);
  }, [moduleId]);

  useEffect(() => {
    fetch(`/api/cases?moduleId=${moduleId}`)
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) { setCases(data); setLoading(false); }
        else generate();
      })
      .catch(() => generate());
  }, [moduleId, generate]);

  function toggle(i: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-500 font-semibold mb-2">Failed to generate case studies</p>
      <p className="text-sm text-gray-500 mb-4">{error}</p>
      <button onClick={generate} className="btn-primary">Retry</button>
    </div>
  );

  if (loading || generating) return (
    <div className="text-center py-20">
      <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
      <p className="text-gray-500">Generating real-world case studies...</p>
      <p className="text-sm text-gray-400 mt-1">Sourcing industry examples — about 20 seconds</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push(`/module/${moduleId}`)} className="btn-secondary text-sm px-3 py-1.5 mb-6">
        <ArrowLeft size={14} /> Back to Textbook
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Real-World Case Studies</h1>
        <p className="text-gray-500 mt-1">Industry examples that bring the concepts to life — read, analyze, and internalize.</p>
      </div>

      <div className="space-y-4">
        {cases.map((c, i) => (
          <div key={c.id} className="card overflow-hidden">
            {/* Header — always visible */}
            <button
              onClick={() => toggle(i)}
              className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <BookMarked size={15} className="text-blue-500 shrink-0" />
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{c.industry}</span>
                </div>
                <h2 className="font-semibold text-gray-900 text-base leading-snug">{c.title}</h2>
              </div>
              {expanded.has(i) ? <ChevronUp size={18} className="text-gray-400 shrink-0 mt-0.5" /> : <ChevronDown size={18} className="text-gray-400 shrink-0 mt-0.5" />}
            </button>

            {expanded.has(i) && (
              <div className="px-5 pb-6 border-t border-gray-100">
                {/* Story */}
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">The Story</h3>
                  <p className="text-gray-700 leading-relaxed text-sm">{c.story}</p>
                </div>

                {/* Analysis */}
                <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">Analysis</h3>
                  <p className="text-amber-900 leading-relaxed text-sm">{c.analysis}</p>
                </div>

                {/* Key Learnings */}
                <div className="mt-5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Key Learnings</h3>
                  <ul className="space-y-2">
                    {c.key_learnings.map((kl, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <Lightbulb size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                        <span>{kl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
