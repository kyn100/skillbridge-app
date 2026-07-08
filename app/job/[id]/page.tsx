'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileText, MapPin, Building2, ExternalLink, Loader2, ChevronDown, ChevronUp, CheckCircle2, Mic } from 'lucide-react';
import type { JobListing } from '@/lib/types';

interface JobSummary {
  requirements: string[];
  nice_to_haves: string[];
  salary_range: string;
  key_technologies: string[];
  culture_notes: string;
  summary: string;
}

const RESUME_STEPS = [
  { label: 'Reading your profile', duration: 3000 },
  { label: 'Analysing job requirements', duration: 6000 },
  { label: 'Tailoring resume content', duration: 10000 },
  { label: 'Writing achievements & skills', duration: 8000 },
  { label: 'Finalising and formatting', duration: 4000 },
];

function ResumeProgressOverlay() {
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let current = 0;
    function advance() {
      current += 1;
      if (current < RESUME_STEPS.length) {
        setStep(current);
        timerRef.current = setTimeout(advance, RESUME_STEPS[current].duration);
      }
    }
    timerRef.current = setTimeout(advance, RESUME_STEPS[0].duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
            <Loader2 size={28} className="text-teal-600 animate-spin" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Building your resume</h3>
          <p className="text-sm text-gray-400 mt-1">Claude is tailoring it to this job</p>
        </div>
        <div className="space-y-3">
          {RESUME_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                i < step ? 'bg-teal-500' : i === step ? 'bg-teal-100 ring-2 ring-teal-400' : 'bg-gray-100'
              }`}>
                {i < step
                  ? <CheckCircle2 size={14} className="text-white" />
                  : i === step
                  ? <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  : <div className="w-2 h-2 rounded-full bg-gray-300" />}
              </div>
              <span className={`text-sm transition-colors ${
                i < step ? 'text-teal-600 line-through' : i === step ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">This usually takes 20–35 seconds</p>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobListing | null>(null);
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [generatingResume, setGeneratingResume] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs?id=${id}`).then(r => r.json()).then(setJob);
  }, [id]);

  async function getSummary() {
    if (!job) return;
    setSummarizing(true);
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id, keywords: [] }),
    });
    const data = await res.json();
    setSummary(data);
    setSummarizing(false);
  }

  async function generateResume() {
    if (!job) return;
    setGeneratingResume(true);
    const res = await fetch('/api/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/resume/${job.id}`);
    else { alert(data.error); setGeneratingResume(false); }
  }

  if (!job) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      {generatingResume && <ResumeProgressOverlay />}
      <button onClick={() => router.back()} className="btn-secondary text-sm px-3 py-1.5 mb-6">
        <ArrowLeft size={14} /> Back to Results
      </button>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-gray-500">
              <span className="flex items-center gap-1.5"><Building2 size={15} />{job.company}</span>
              <span className="flex items-center gap-1.5"><MapPin size={15} />{job.location}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="badge-purple">{job.source_site}</span>
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                View Original <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={generateResume} disabled={generatingResume} className="btn-primary flex-1 justify-center">
            {generatingResume ? <><Loader2 size={16} className="animate-spin" /> Generating Resume...</> : <><FileText size={16} /> Generate My Resume</>}
          </button>
          <button onClick={() => router.push(`/interview/${job.id}`)} className="btn-secondary">
            <Mic size={16} /> Practice Interview
          </button>
          {!summary && (
            <button onClick={getSummary} disabled={summarizing} className="btn-secondary">
              {summarizing ? <Loader2 size={16} className="animate-spin" /> : 'AI Summary'}
            </button>
          )}
        </div>
      </div>

      {summary && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">AI Analysis</h2>
          <p className="text-sm text-gray-700 mb-5">{summary.summary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Required Skills</h3>
              <ul className="space-y-1">
                {summary.requirements.map(r => <li key={r} className="text-sm text-gray-700 flex items-start gap-1.5"><span className="text-green-500 mt-0.5">✓</span>{r}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nice to Have</h3>
              <ul className="space-y-1">
                {summary.nice_to_haves.map(r => <li key={r} className="text-sm text-gray-700 flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">+</span>{r}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Technologies</h3>
              <div className="flex flex-wrap gap-1.5">
                {summary.key_technologies.map(t => <span key={t} className="badge-blue">{t}</span>)}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Compensation</h3>
              <p className="text-sm text-gray-700 font-medium">{summary.salary_range}</p>
              {summary.culture_notes && <p className="text-xs text-gray-500 mt-1">{summary.culture_notes}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50"
        >
          <span className="font-semibold text-gray-900">Full Job Description</span>
          {showRaw ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showRaw && (
          <div className="px-5 pb-5 border-t border-gray-100">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed mt-4">{job.description_raw || job.description_summary}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
