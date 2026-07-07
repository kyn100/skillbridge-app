'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Search, Loader2, ExternalLink, Star, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import type { JobField, FieldKeyword, JobListing } from '@/lib/types';

const STEPS = [
  'Searching LinkedIn, Indeed, Glassdoor, ZipRecruiter & Dice...',
  'Ranking and formatting results...',
  'Saving results...',
];

function stepIndex(msg: string): number {
  if (msg.includes('Ranking') || msg.includes('format')) return 1;
  if (msg.includes('Saving')) return 2;
  return 0;
}

export default function SearchPage() {
  const { fieldId } = useParams<{ fieldId: string }>();
  const router = useRouter();
  const [field, setField] = useState<JobField | null>(null);
  const [keywords, setKeywords] = useState<FieldKeyword[]>([]);
  const [searching, setSearching] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [error, setError] = useState('');
  const [searchId, setSearchId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/fields').then(r => r.json()).then((fs: JobField[]) => {
      const f = fs.find(x => x.id === Number(fieldId));
      if (f) setField(f);
    });
    fetch(`/api/keywords?fieldId=${fieldId}`).then(r => r.json()).then(setKeywords);
  }, [fieldId]);

  const doSearch = useCallback(async () => {
    if (!field || keywords.length === 0) return;
    setSearching(true);
    setError('');
    setJobs([]);
    setCurrentStep(0);
    setStatusMsg('Starting search...');

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: Number(fieldId),
          field_name: field.name,
          keywords: keywords.map(k => k.keyword),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Search failed' }));
        throw new Error((data as { error?: string }).error ?? 'Search failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE packets are separated by double newline
        const packets = buffer.split('\n\n');
        buffer = packets.pop() ?? '';

        for (const packet of packets) {
          const line = packet.trim();
          if (!line.startsWith('data: ')) continue;
          const event = JSON.parse(line.slice(6)) as
            | { type: 'status'; message: string }
            | { type: 'done'; search_id: number; jobs: JobListing[] }
            | { type: 'error'; message: string };

          if (event.type === 'status') {
            setStatusMsg(event.message);
            setCurrentStep(stepIndex(event.message));
          } else if (event.type === 'done') {
            setJobs(event.jobs);
            setSearchId(event.search_id);
          } else if (event.type === 'error') {
            setError(event.message);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
      setStatusMsg('');
    }
  }, [field, keywords, fieldId]);

  function scoreColor(score: number) {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push(`/field/${fieldId}`)} className="btn-secondary text-sm px-3 py-1.5 mb-6">
        <ArrowLeft size={14} /> Edit Keywords
      </button>

      {field && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">{field.icon_emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Search</h1>
            <p className="text-gray-500">{field.name} · {keywords.length} keywords</p>
          </div>
        </div>
      )}

      <div className="card p-5 mb-6">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {keywords.slice(0, 12).map(k => (
            <span key={k.id} className="badge-blue">{k.keyword}</span>
          ))}
          {keywords.length > 12 && <span className="badge-blue">+{keywords.length - 12} more</span>}
        </div>

        <button onClick={doSearch} disabled={searching} className="btn-primary w-full justify-center">
          {searching ? <><Loader2 size={16} className="animate-spin" /> Searching...</> : <><Search size={16} /> Search Top 5 Job Sites</>}
        </button>

        {error && <p className="text-sm text-red-600 mt-3 text-center">{error}</p>}

        {/* Live progress indicator */}
        {searching && (
          <div className="mt-5 space-y-3">
            {STEPS.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div key={i} className={`flex items-center gap-3 text-sm transition-opacity ${i > currentStep ? 'opacity-30' : 'opacity-100'}`}>
                  <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                    {done
                      ? <CheckCircle2 size={18} className="text-green-500" />
                      : active
                      ? <Loader2 size={18} className="animate-spin text-blue-500" />
                      : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                  </div>
                  <span className={active ? 'text-gray-900 font-medium' : done ? 'text-gray-400 line-through' : 'text-gray-400'}>
                    {active && statusMsg ? statusMsg : step}
                  </span>
                </div>
              );
            })}
            <p className="text-xs text-gray-400 pl-9 pt-1">
              {currentStep === 0 ? 'Web search takes 15–25 seconds' : currentStep === 1 ? 'Almost done...' : 'Finishing up...'}
            </p>
          </div>
        )}
      </div>

      {jobs.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">{jobs.length} Jobs Found</h2>
          <div className="space-y-4">
            {jobs.map(job => (
              <div
                key={job.id}
                onClick={() => router.push(`/job/${job.id}`)}
                className="card p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{job.title}</div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Building2 size={13} />{job.company}</span>
                      <span className="flex items-center gap-1"><MapPin size={13} />{job.location}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{job.description_summary}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="badge-purple text-xs">{job.source_site}</span>
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                          View <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-lg font-bold text-lg ${scoreColor(job.match_score)}`}>
                    <Star size={14} className="mb-0.5" />
                    {job.match_score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
