'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Clock, ChevronDown, ChevronUp, CheckCircle2, Wrench, BookOpen, Trophy, Target, Zap } from 'lucide-react';
import type { Roadmap, RoadmapStage } from '@/lib/claude';

const STAGE_COLORS: Record<string, { bg: string; border: string; badge: string; dot: string; ring: string }> = {
  Beginner:     { bg: 'bg-emerald-50',  border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  Elementary:   { bg: 'bg-teal-50',     border: 'border-teal-200',    badge: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500',    ring: 'ring-teal-200'    },
  Intermediate: { bg: 'bg-blue-50',     border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',    ring: 'ring-blue-200'    },
  Advanced:     { bg: 'bg-violet-50',   border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500',  ring: 'ring-violet-200'  },
  Senior:       { bg: 'bg-orange-50',   border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500',  ring: 'ring-orange-200'  },
  Expert:       { bg: 'bg-rose-50',     border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700',       dot: 'bg-rose-500',    ring: 'ring-rose-200'    },
};

function getColor(label: string) {
  return STAGE_COLORS[label] ?? STAGE_COLORS['Intermediate'];
}

function StageCard({ stage, index, total, expanded, onToggle }: {
  stage: RoadmapStage; index: number; total: number; expanded: boolean; onToggle: () => void;
}) {
  const c = getColor(stage.label);
  const isLast = index === total - 1;

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-10 h-10 rounded-full ${c.dot} ring-4 ${c.ring} flex items-center justify-center text-white font-bold text-sm z-10 shrink-0`}>
          {stage.level}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-6 border-2 ${c.border} ${c.bg} rounded-2xl overflow-hidden`}>
        <button onClick={onToggle} className="w-full text-left p-5 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>{stage.label}</span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} />{stage.months_estimate}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-base">{stage.title}</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{stage.description}</p>
          </div>
          {expanded
            ? <ChevronUp size={18} className="text-gray-400 shrink-0 mt-1" />
            : <ChevronDown size={18} className="text-gray-400 shrink-0 mt-1" />}
        </button>

        {expanded && (
          <div className="px-5 pb-5 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-5 mt-1 pt-4">
            {/* Skills */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Zap size={13} className="text-amber-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Skills to Learn</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stage.skills.map(s => (
                  <span key={s} className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium shadow-sm">{s}</span>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Wrench size={13} className="text-blue-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tools & Tech</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stage.tools.map(t => (
                  <span key={t} className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium shadow-sm">{t}</span>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <CheckCircle2 size={13} className="text-green-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Milestones</span>
              </div>
              <ul className="space-y-1.5">
                {stage.milestones.map(m => (
                  <li key={m} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-400 mt-0.5 shrink-0">✓</span>{m}
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <BookOpen size={13} className="text-purple-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resources</span>
              </div>
              <ul className="space-y-1.5">
                {stage.resources.map(r => (
                  <li key={r} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-purple-400 mt-0.5 shrink-0">→</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const { fieldId } = useParams<{ fieldId: string }>();
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: Number(fieldId) }),
      });
      const data = await res.json();
      if (data && data.stages) {
        setRoadmap(data);
        setExpanded(new Set([0]));
      } else {
        setError((data as { error?: string }).error ?? 'Failed to generate roadmap');
      }
    } catch {
      setError('Network error — could not generate roadmap');
    }
    setGenerating(false);
    setLoading(false);
  }, [fieldId]);

  useEffect(() => {
    fetch(`/api/roadmap?fieldId=${fieldId}`)
      .then(r => r.json())
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'stages' in data) {
          setRoadmap(data as Roadmap);
          setLoading(false);
        } else {
          generate();
        }
      })
      .catch(() => generate());
  }, [fieldId, generate]);

  function toggle(i: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function expandAll() { setExpanded(new Set(roadmap?.stages.map((_, i) => i) ?? [])); }
  function collapseAll() { setExpanded(new Set()); }

  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-500 font-semibold mb-2">Failed to generate roadmap</p>
      <p className="text-sm text-gray-500 mb-4">{error}</p>
      <button onClick={generate} className="btn-primary">Retry</button>
    </div>
  );

  if (loading || generating) return (
    <div className="text-center py-20">
      <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
      <p className="text-gray-500">Building your expert roadmap...</p>
      <p className="text-sm text-gray-400 mt-1">Designing your path from beginner to expert — about 20 seconds</p>
    </div>
  );

  if (!roadmap) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="btn-secondary text-sm px-3 py-1.5 mb-6">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div className="card p-6 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={18} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Expert Roadmap</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{roadmap.title}</h1>
            <p className="text-gray-600 leading-relaxed">{roadmap.overview}</p>
          </div>
          <div className="text-center shrink-0 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1 text-blue-600 mb-0.5">
              <Target size={14} />
              <span className="text-xs font-semibold">Total Journey</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{roadmap.total_months_estimate}</div>
            <div className="text-xs text-blue-400">months</div>
          </div>
        </div>

        {/* Stage overview pills */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {roadmap.stages.map((s, i) => {
            const c = getColor(s.label);
            return (
              <button
                key={i}
                onClick={() => { setExpanded(new Set([i])); document.getElementById(`stage-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${c.badge} transition-opacity hover:opacity-80`}
              >
                {s.level}. {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expand / Collapse all */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">Learning Stages</h2>
        <div className="flex gap-2 text-sm">
          <button onClick={expandAll} className="text-blue-500 hover:underline">Expand all</button>
          <span className="text-gray-300">|</span>
          <button onClick={collapseAll} className="text-gray-400 hover:underline">Collapse all</button>
        </div>
      </div>

      {/* Timeline */}
      <div>
        {roadmap.stages.map((stage, i) => (
          <div key={i} id={`stage-${i}`}>
            <StageCard
              stage={stage}
              index={i}
              total={roadmap.stages.length}
              expanded={expanded.has(i)}
              onToggle={() => toggle(i)}
            />
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="card p-6 text-center mt-2">
        <Trophy size={28} className="text-amber-400 mx-auto mb-2" />
        <p className="font-semibold text-gray-900">Ready to start your journey?</p>
        <p className="text-sm text-gray-500 mt-1">Search for jobs in this field and generate a personalized study plan to begin.</p>
        <button onClick={() => router.push(`/field/${fieldId}`)} className="btn-primary mt-4">
          Search Jobs in This Field
        </button>
      </div>
    </div>
  );
}
