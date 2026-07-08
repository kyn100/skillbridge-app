'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Download, BookOpen, Loader2, RefreshCw,
  Calendar, Wrench, Trophy, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { Resume, ResumeContent } from '@/lib/types';
import type { DailyRoutine } from '@/lib/claude';

export default function ResumePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [jobTitle, setJobTitle] = useState('Software Engineer');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [routines, setRoutines] = useState<Record<number, DailyRoutine | 'loading'>>({});
  const [openRoutine, setOpenRoutine] = useState<number | null>(null);

  useEffect(() => {
    const specificId = searchParams.get('id');
    const resumeUrl = specificId
      ? `/api/resumes?id=${specificId}`
      : `/api/resume?jobId=${jobId}`;
    Promise.all([
      fetch(resumeUrl).then(r => r.json()),
      fetch(`/api/jobs?id=${jobId}`).then(r => r.json()),
    ]).then(([resumeData, jobData]) => {
      setResume(resumeData);
      if (jobData?.title) setJobTitle(jobData.title);
      setLoading(false);
    });
  }, [jobId, searchParams]);

  async function regenerate() {
    setRegenerating(true);
    const res = await fetch('/api/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: Number(jobId) }),
    });
    const data = await res.json();
    setResume(data);
    setRoutines({});
    setOpenRoutine(null);
    setRegenerating(false);
  }

  async function createStudyPlan() {
    if (!resume) return;
    setCreatingPlan(true);
    const res = await fetch('/api/study-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: resume.id, job_listing_id: Number(jobId) }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/study-plan/${resume.id}`);
    else { alert(data.error); setCreatingPlan(false); }
  }

  async function generateRoutine(idx: number, project: NonNullable<ResumeContent['projects']>[number]) {
    const current = routines[idx];
    if (current === 'loading') return;

    // Toggle off if already loaded and open
    if (openRoutine === idx && current != null) {
      setOpenRoutine(null);
      return;
    }

    // Already cached — just open
    if (current != null) {
      setOpenRoutine(idx);
      return;
    }

    setRoutines(r => ({ ...r, [idx]: 'loading' }));
    setOpenRoutine(idx);

    try {
      const res = await fetch('/api/daily-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: project.name,
          project_description: project.description,
          technologies: project.technologies,
          job_title: jobTitle,
        }),
      });
      const data = await res.json() as DailyRoutine;
      setRoutines(r => ({ ...r, [idx]: data }));
    } catch {
      setRoutines(r => { const next = { ...r }; delete next[idx]; return next; });
      setOpenRoutine(null);
    }
  }

  function downloadPDF() {
    if (!resume) return;
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      const c = resume.content as ResumeContent;
      let y = 20;

      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text(c.contact.name, 105, y, { align: 'center' }); y += 8;

      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
      const contactLine = [c.contact.email, c.contact.phone, c.contact.location].filter(Boolean).join(' | ');
      doc.text(contactLine, 105, y, { align: 'center' }); y += 10;

      doc.setTextColor(0);
      const addSection = (title: string, content: string[]) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(title.toUpperCase(), 15, y); y += 1;
        doc.setLineWidth(0.3); doc.line(15, y, 195, y); y += 5;
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        for (const line of content) {
          const lines = doc.splitTextToSize(line, 175);
          doc.text(lines, 15, y); y += lines.length * 5;
          if (y > 270) { doc.addPage(); y = 20; }
        }
        y += 3;
      };

      addSection('Professional Summary', [c.summary]);
      addSection('Skills', c.skills.map(s => `${s.category}: ${s.items.join(', ')}`));
      if (c.experience.length) addSection('Experience', c.experience.flatMap(e => [
        `${e.title} | ${e.company} | ${e.start_date} – ${e.end_date}`,
        ...e.bullets,
        '',
      ]));
      addSection('Education', c.education.map(e => `${e.degree} in ${e.field}, ${e.institution} (${e.graduation_year})${e.gpa ? ` — GPA: ${e.gpa}` : ''}`));
      if (c.projects?.length) addSection('Projects', c.projects.map(p => `${p.name}: ${p.description} [${p.technologies.join(', ')}]`));

      doc.save(`resume-${c.contact.name.replace(/\s+/g, '-')}.pdf`);
    });
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading resume...</div>;
  if (!resume) return <div className="text-center py-20 text-gray-400">No resume found. <button onClick={() => router.push(`/job/${jobId}`)} className="text-blue-600 underline">Generate one</button></div>;

  const c = resume.content as ResumeContent;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push(`/job/${jobId}`)} className="btn-secondary text-sm px-3 py-1.5">
          <ArrowLeft size={14} /> Back to Job
        </button>
        <div className="flex gap-2">
          <button onClick={regenerate} disabled={regenerating} className="btn-secondary text-sm">
            {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerate
          </button>
          <button onClick={downloadPDF} className="btn-secondary text-sm">
            <Download size={14} /> Download PDF
          </button>
          <button onClick={createStudyPlan} disabled={creatingPlan} className="btn-primary text-sm">
            {creatingPlan ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
            {creatingPlan ? 'Building Plan...' : 'Create Study Plan'}
          </button>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="card p-10 bg-white shadow-lg">
        {/* Header */}
        <div className="text-center border-b border-gray-200 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{c.contact.name}</h1>
          <p className="text-gray-500 mt-1">
            {[c.contact.email, c.contact.phone, c.contact.location].filter(Boolean).join(' · ')}
          </p>
          {(c.contact.linkedin || c.contact.github) && (
            <p className="text-sm text-blue-600 mt-1">
              {[c.contact.linkedin, c.contact.github].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Summary */}
        <Section title="Professional Summary">
          <p className="text-gray-700">{c.summary}</p>
        </Section>

        {/* Skills */}
        <Section title="Technical Skills">
          <div className="space-y-2">
            {c.skills.map(sg => (
              <div key={sg.category} className="flex gap-2">
                <span className="font-semibold text-gray-700 text-sm shrink-0 w-36">{sg.category}:</span>
                <span className="text-sm text-gray-600">{sg.items.join(', ')}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Experience */}
        {c.experience.length > 0 && (
          <Section title="Work Experience">
            <div className="space-y-5">
              {c.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{exp.title}</div>
                      <div className="text-gray-500 text-sm">{exp.company}</div>
                    </div>
                    <div className="text-sm text-gray-400 shrink-0">{exp.start_date} – {exp.end_date}</div>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {exp.bullets.map((b, j) => <li key={j} className="text-sm text-gray-700">{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Education */}
        <Section title="Education">
          <div className="space-y-3">
            {c.education.map((edu, i) => (
              <div key={i} className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{edu.degree} in {edu.field}</div>
                  <div className="text-gray-500 text-sm">{edu.institution}{edu.gpa ? ` · GPA: ${edu.gpa}` : ''}</div>
                </div>
                <div className="text-sm text-gray-400 shrink-0">{edu.graduation_year}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Projects */}
        {c.projects && c.projects.length > 0 && (
          <Section title="Projects">
            <div className="space-y-6">
              {c.projects.map((p, i) => (
                <div key={i}>
                  {/* Project header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{p.name}</div>
                      <p className="text-sm text-gray-700 mt-0.5">{p.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.technologies.map(t => <span key={t} className="badge-blue">{t}</span>)}
                      </div>
                    </div>
                    <button
                      onClick={() => generateRoutine(i, p)}
                      disabled={routines[i] === 'loading'}
                      className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        openRoutine === i && routines[i] && routines[i] !== 'loading'
                          ? 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200'
                      }`}
                    >
                      {routines[i] === 'loading'
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Calendar size={12} />}
                      {routines[i] === 'loading'
                        ? 'Generating...'
                        : openRoutine === i && routines[i]
                        ? <>Hide Routine {<ChevronUp size={11} />}</>
                        : <>Daily Routine {<ChevronDown size={11} />}</>}
                    </button>
                  </div>

                  {/* Routine panel */}
                  {openRoutine === i && routines[i] && routines[i] !== 'loading' && (
                    <DailyRoutinePanel routine={routines[i] as DailyRoutine} />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1 mb-3">{title}</h2>
      {children}
    </div>
  );
}

// ── Daily Routine Panel ────────────────────────────────────────────────────────

function DailyRoutinePanel({ routine }: { routine: DailyRoutine }) {
  return (
    <div className="mt-4 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-violet-100 bg-white/60">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-violet-800">{routine.day_type}</span>
          <span className="text-violet-300">·</span>
          <span className="text-sm text-violet-600 italic">{routine.tagline}</span>
        </div>
        {/* Tools used */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <Wrench size={11} className="text-violet-400 shrink-0" />
          {routine.tools_used.map(t => (
            <span key={t} className="text-xs bg-white border border-violet-200 text-violet-700 px-2 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Schedule timeline */}
      <div className="px-5 py-4 space-y-4">
        {routine.schedule.map((block, i) => (
          <div key={i} className="flex gap-3">
            {/* Time + line */}
            <div className="flex flex-col items-center shrink-0 w-14">
              <span className="text-xs font-mono text-violet-500 font-semibold leading-none">{block.time}</span>
              {i < routine.schedule.length - 1 && (
                <div className="w-px flex-1 bg-violet-200 mt-1.5" />
              )}
            </div>
            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base leading-none">{block.emoji}</span>
                <span className="text-sm font-semibold text-gray-800">{block.activity}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{block.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Win / Challenge footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-violet-100">
        <div className="px-5 py-3 flex items-start gap-2 bg-green-50/60 border-r border-violet-100">
          <Trophy size={14} className="text-green-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-bold text-green-700 mb-0.5 uppercase tracking-wide">Win of the day</div>
            <p className="text-xs text-green-800 leading-relaxed">{routine.win_of_day}</p>
          </div>
        </div>
        <div className="px-5 py-3 flex items-start gap-2 bg-amber-50/60">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-bold text-amber-700 mb-0.5 uppercase tracking-wide">Challenge</div>
            <p className="text-xs text-amber-800 leading-relaxed">{routine.challenge_of_day}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
