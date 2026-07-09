'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardPaste, Loader2, ArrowRight, Link2, Building2, Briefcase } from 'lucide-react';

export default function PasteJobPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setError('Please paste a job description first.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, title, company, url }),
      });
      const data = await res.json() as { id?: number; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? 'Failed to import job description');
        setLoading(false);
        return;
      }
      router.push(`/resume/${data.id}`);
    } catch {
      setError('Network error — please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <ClipboardPaste className="text-teal-600" size={20} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Paste a Job Description</h1>
        </div>
        <p className="text-gray-500 ml-13">
          Found a role on LinkedIn, Indeed, or a company site? Paste the description —
          SkillBridge extracts the requirements, tailors your resume, and builds a study plan to close the gaps.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <Briefcase size={13} className="text-gray-400" /> Job Title
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <Building2 size={13} className="text-gray-400" /> Company
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Google"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
            <Link2 size={13} className="text-gray-400" /> Job URL
            <span className="text-gray-400 font-normal ml-1">(optional — for your reference)</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://linkedin.com/jobs/view/..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Job Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Paste the full job description here — responsibilities, requirements, qualifications, tech stack, etc.

The more detail you paste, the better your resume and study plan will be tailored."
            rows={14}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 resize-y leading-relaxed"
          />
          <p className="text-xs text-gray-400 mt-1">
            {description.length > 0
              ? `${description.length.toLocaleString()} characters pasted`
              : 'Works with LinkedIn, Indeed, Glassdoor, company career pages, PDF job ads — anywhere'}
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !description.trim()}
          className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 size={17} className="animate-spin" /> Analyzing job &amp; building your profile...</>
          ) : (
            <>Generate Resume &amp; Study Plan <ArrowRight size={17} /></>
          )}
        </button>

        {loading && (
          <p className="text-center text-xs text-gray-400 -mt-2">
            This takes about 15–20 seconds — Claude is reading the job description and tailoring everything to you.
          </p>
        )}
      </form>

      {/* Steps */}
      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          { step: '1', title: 'Paste', text: 'Drop in the full job posting from anywhere' },
          { step: '2', title: 'Resume', text: 'AI writes a resume targeting this exact role' },
          { step: '3', title: 'Study', text: 'Get a training plan for your skill gaps' },
        ].map(({ step, title: t, text }) => (
          <div key={step} className="p-4 bg-gray-50 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 text-sm font-bold flex items-center justify-center mx-auto mb-2">
              {step}
            </div>
            <p className="font-semibold text-gray-800 text-sm mb-0.5">{t}</p>
            <p className="text-xs text-gray-400">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
