'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, BookOpen, Trophy, UserCircle, Map, PlayCircle, ClipboardList } from 'lucide-react';
import type { JobField } from '@/lib/types';

interface ResumeData {
  module: { id: number; title: string; skill_category: string; status: string };
  chapter_idx: number;
  job: { title: string; company: string };
  plan: { id: number; resume_id: number; total: number; completed: number };
}

export default function HomePage() {
  const [fields, setFields] = useState<JobField[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/fields').then(r => r.json()).then(setFields);
    fetch('/api/profile').then(r => r.json()).then(p => setHasProfile(!!p?.name));
    fetch('/api/resume')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setResume(d))
      .catch(() => {});
  }, []);

  const planPct = resume ? Math.round((resume.plan.completed / Math.max(1, resume.plan.total)) * 100) : 0;

  return (
    <div>
      {/* ── Continue Learning banner ── */}
      {resume && (
        <div className="mb-8 card p-5 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 flex items-start gap-4">
          <BookOpen className="text-green-600 mt-0.5 shrink-0" size={24} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Continue Learning</span>
              {resume.module.status === 'in_progress' && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">In Progress</span>
              )}
            </div>
            <p className="font-semibold text-gray-900 truncate">{resume.module.title}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              For <span className="font-medium text-gray-700">{resume.job.title}</span> at {resume.job.company}
              {resume.chapter_idx > 0 && (
                <> · Chapter {resume.chapter_idx + 1}</>
              )}
            </p>
            {/* Plan progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Study plan progress</span>
                <span>{resume.plan.completed}/{resume.plan.total} modules</span>
              </div>
              <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${planPct}%` }} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => router.push(`/module/${resume.module.id}?chapter=${resume.chapter_idx}`)}
                className="btn-primary text-sm"
              >
                <PlayCircle size={14} /> Continue
              </button>
              <button
                onClick={() => router.push(`/study-plan/${resume.plan.resume_id}`)}
                className="btn-secondary text-sm"
              >
                <ClipboardList size={14} /> View Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasProfile && (
        <div className="mb-8 card p-5 border-blue-200 bg-blue-50 flex items-start gap-4">
          <UserCircle className="text-blue-500 mt-0.5 shrink-0" size={24} />
          <div>
            <p className="font-semibold text-blue-900">Set up your profile first</p>
            <p className="text-sm text-blue-700 mt-0.5">Your profile personalizes your resume and study plan. It takes 2 minutes.</p>
            <button onClick={() => router.push('/profile')} className="btn-primary mt-3 text-sm">
              Complete Profile <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bridge the Gap to Your Dream Job</h1>
        <p className="text-gray-500 mt-2">Pick your target field. SkillBridge finds the jobs, identifies your skill gaps, and trains you until you're ready.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {fields.map((field) => (
          <div key={field.id} className={`card border-2 transition-all hover:shadow-md hover:-translate-y-0.5 ${field.color_class} overflow-hidden`}>
            <button
              onClick={() => router.push(`/field/${field.id}`)}
              className="w-full p-4 text-left"
            >
              <div className="text-3xl mb-2">{field.icon_emoji}</div>
              <div className="font-semibold text-gray-900 text-sm leading-tight">{field.name}</div>
              <div className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2">{field.description}</div>
            </button>
            <div className="px-3 pb-3">
              <button
                onClick={e => { e.stopPropagation(); router.push(`/roadmap/${field.id}`); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-lg bg-white/70 hover:bg-white border border-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Map size={11} /> Roadmap
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: Search, title: 'Find Real Jobs', desc: 'AI searches LinkedIn, Indeed, Glassdoor, ZipRecruiter & Dice to surface the best-matched openings for your target field.', color: 'text-blue-500' },
          { icon: BookOpen, title: 'Close the Skill Gap', desc: 'SkillBridge pinpoints exactly what you\'re missing and builds you a personalised study plan with AI-written textbooks.', color: 'text-green-500' },
          { icon: Trophy, title: 'Arrive Ready', desc: 'Three-level testing, mindmaps, flashcards, and case studies — so you walk into the interview already qualified.', color: 'text-amber-500' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="card p-6">
            <Icon size={28} className={`${color} mb-3`} />
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
