'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, BookOpen, Target, Clock, CheckCircle2, Circle, Lock, ChevronRight } from 'lucide-react';

interface ProgressData {
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  totalTestAttempts: number;
  passedTests: number;
  averageScore: number;
  studyPlans: Array<{
    id: number;
    overview: string;
    total_hours_estimate: number;
    created_at: string;
    resume_id: number;
    job_listing_id: number;
    modules: Array<{
      id: number;
      title: string;
      status: string;
      estimated_hours: number;
      order_num: number;
    }>;
  }>;
}

export default function ProgressPage() {
  const router = useRouter();
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetch('/api/progress').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  const readiness = data.totalModules > 0 ? Math.round((data.completedModules / data.totalModules) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Progress</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Job Readiness', value: `${readiness}%`, icon: Target, color: 'text-blue-500' },
          { label: 'Modules Done', value: `${data.completedModules}/${data.totalModules}`, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Tests Passed', value: `${data.passedTests}/${data.totalTestAttempts}`, icon: Trophy, color: 'text-amber-500' },
          { label: 'Avg Score', value: data.totalTestAttempts > 0 ? `${data.averageScore}%` : '—', icon: BookOpen, color: 'text-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <Icon size={20} className={`${color} mb-2`} />
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Readiness meter */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Job Readiness Score</h2>
          <span className="text-2xl font-bold text-blue-600">{readiness}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 mb-3">
          <div
            className={`h-4 rounded-full transition-all ${readiness >= 80 ? 'bg-green-500' : readiness >= 50 ? 'bg-amber-400' : 'bg-blue-500'}`}
            style={{ width: `${readiness}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {readiness === 0 && 'Start your first module to begin building toward interview-readiness.'}
          {readiness > 0 && readiness < 50 && 'Good start! Keep working through modules to close your skill gaps.'}
          {readiness >= 50 && readiness < 80 && "You're more than halfway there. Keep the momentum going!"}
          {readiness >= 80 && readiness < 100 && 'Almost ready! Finish the remaining modules and you can confidently apply.'}
          {readiness === 100 && 'You have completed all your training. You are ready to apply and ace the interview!'}
        </p>
      </div>

      {/* Study Plans */}
      {data.studyPlans.length > 0 ? (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Study Plans</h2>
          <div className="space-y-4">
            {data.studyPlans.map(plan => (
              <div key={plan.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 line-clamp-2">{plan.overview.slice(0, 140)}...</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={11} />{plan.total_hours_estimate}h total</span>
                      <span>{plan.modules.filter(m => m.status === 'completed').length}/{plan.modules.length} modules done</span>
                    </div>
                  </div>
                  <button onClick={() => router.push(`/study-plan/${plan.resume_id}`)} className="btn-secondary text-xs px-3 py-1.5 shrink-0 ml-3">
                    Open <ChevronRight size={12} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {plan.modules.map(m => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      {m.status === 'completed'
                        ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                        : m.status === 'in_progress' || m.status === 'available'
                        ? <Circle size={14} className="text-blue-400 shrink-0" />
                        : <Lock size={14} className="text-gray-300 shrink-0" />}
                      <span className={m.status === 'locked' ? 'text-gray-400' : 'text-gray-700'}>{m.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <Trophy size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No study plans yet</p>
          <p className="text-sm text-gray-400 mt-1">Search for jobs and generate a resume to get your personalized study plan.</p>
          <button onClick={() => router.push('/')} className="btn-primary mt-4">Browse Job Fields</button>
        </div>
      )}
    </div>
  );
}
