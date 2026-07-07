'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Clock, Lock, CheckCircle2, Circle, Play, ChevronRight } from 'lucide-react';
import type { StudyPlan, StudyModule } from '@/lib/types';

interface PlanData extends StudyPlan {
  modules: StudyModule[];
}

export default function StudyPlanPage() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/study-plan?resumeId=${resumeId}`)
      .then(r => r.json())
      .then(data => { setPlan(data); setLoading(false); });
  }, [resumeId]);

  function statusIcon(status: StudyModule['status']) {
    switch (status) {
      case 'completed': return <CheckCircle2 size={20} className="text-green-500" />;
      case 'in_progress': return <Play size={20} className="text-blue-500" />;
      case 'available': return <Circle size={20} className="text-blue-400" />;
      default: return <Lock size={20} className="text-gray-300" />;
    }
  }

  function statusLabel(status: StudyModule['status']) {
    switch (status) {
      case 'completed': return <span className="badge-green">Completed</span>;
      case 'in_progress': return <span className="badge-blue">In Progress</span>;
      case 'available': return <span className="badge-blue">Ready to Start</span>;
      default: return <span className="text-xs text-gray-400">Locked</span>;
    }
  }

  const totalHours = plan?.modules.reduce((s, m) => s + m.estimated_hours, 0) ?? 0;
  const completedModules = plan?.modules.filter(m => m.status === 'completed').length ?? 0;

  if (loading) return <div className="text-center py-20 text-gray-400">Loading study plan...</div>;
  if (!plan) return <div className="text-center py-20 text-gray-400">Study plan not found</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="btn-secondary text-sm px-3 py-1.5 mb-6">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Study Plan</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Clock size={14} />{totalHours} hours total</span>
          <span>{completedModules}/{plan.modules.length} modules completed</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600">{plan.modules.length > 0 ? Math.round((completedModules / plan.modules.length) * 100) : 0}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${plan.modules.length > 0 ? (completedModules / plan.modules.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Skill Gaps */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Identified Skill Gaps</h2>
        <div className="flex flex-wrap gap-2">
          {plan.skill_gaps.map(gap => <span key={gap} className="badge-amber">{gap}</span>)}
        </div>
        <p className="text-sm text-gray-600 mt-4">{plan.overview}</p>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {plan.modules.map((mod, idx) => (
          <div
            key={mod.id}
            onClick={() => mod.status !== 'locked' && router.push(`/module/${mod.id}`)}
            className={`card p-5 flex items-center gap-4 transition-all ${
              mod.status === 'locked' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="shrink-0 flex flex-col items-center">
              {statusIcon(mod.status)}
              {idx < plan.modules.length - 1 && <div className="w-0.5 h-6 bg-gray-200 mt-1" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Module {idx + 1}</span>
                {statusLabel(mod.status)}
              </div>
              <div className="font-semibold text-gray-900 mt-0.5">{mod.title}</div>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{mod.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock size={11} />{mod.estimated_hours}h</span>
                <span>{mod.skill_category}</span>
              </div>
            </div>
            {mod.status !== 'locked' && <ChevronRight size={18} className="text-gray-400 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
