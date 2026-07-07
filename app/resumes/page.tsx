'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Building2, MapPin, Calendar, ExternalLink } from 'lucide-react';

interface ResumeRow {
  id: number;
  job_listing_id: number;
  created_at: string;
  job_title: string;
  company: string;
  location: string;
  source_site: string;
}

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/resume')
      .then(r => r.json())
      .then((data: unknown) => {
        setResumes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading resumes...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Resumes</h1>
          <p className="text-sm text-gray-500 mt-1">{resumes.length} resume{resumes.length !== 1 ? 's' : ''} generated</p>
        </div>
        <button onClick={() => router.push('/')} className="btn-primary text-sm">
          Search More Jobs
        </button>
      </div>

      {resumes.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No resumes yet</p>
          <p className="text-sm text-gray-400 mt-1">Search for a job and click "Generate Resume" to create your first tailored resume.</p>
          <button onClick={() => router.push('/')} className="btn-primary mt-5">Browse Job Fields</button>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map(r => (
            <div
              key={r.id}
              onClick={() => router.push(`/resume/${r.job_listing_id}`)}
              className="card p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{r.job_title}</div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Building2 size={12} />{r.company}</span>
                  {r.location && <span className="flex items-center gap-1"><MapPin size={12} />{r.location}</span>}
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{r.source_site}</span>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-300 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
