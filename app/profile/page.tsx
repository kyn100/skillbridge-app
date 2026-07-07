'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import type { UserProfile, Education, Experience } from '@/lib/types';

const BLANK_EDU: Education = { institution: '', degree: '', field: '', graduation_year: '', gpa: '' };
const BLANK_EXP: Experience = { company: '', title: '', start_date: '', end_date: '', description: '' };

export default function ProfilePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', summary: '',
    education: [{ ...BLANK_EDU }] as Education[],
    experience: [] as Experience[],
    skills: '' as string,
  });

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then((p: UserProfile | null) => {
      if (p) {
        setForm({
          name: p.name, email: p.email, phone: p.phone, summary: p.summary,
          education: p.education.length ? p.education : [{ ...BLANK_EDU }],
          experience: p.experience,
          skills: p.skills.join(', '),
        });
      }
    });
  }, []);

  async function save() {
    setSaving(true);
    const skills = form.skills.split(',').map(s => s.trim()).filter(Boolean);
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, skills }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function updateEdu(i: number, key: keyof Education, val: string) {
    const edu = [...form.education];
    edu[i] = { ...edu[i], [key]: val };
    setForm(f => ({ ...f, education: edu }));
  }

  function updateExp(i: number, key: keyof Experience, val: string) {
    const exp = [...form.experience];
    exp[i] = { ...exp[i], [key]: val };
    setForm(f => ({ ...f, experience: exp }));
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="btn-secondary text-sm px-3 py-1.5">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Full Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" /></div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Professional Summary</label>
            <textarea className="input resize-none" rows={3} value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Recent CS graduate with strong foundation in Python and ML..." />
          </div>
        </div>

        {/* Skills */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Current Skills</h2>
          <p className="text-xs text-gray-500 mb-3">Comma-separated list of your current technical skills</p>
          <textarea className="input resize-none" rows={3} value={form.skills}
            onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
            placeholder="Python, React, SQL, Git, Machine Learning, Data Analysis..." />
        </div>

        {/* Education */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Education</h2>
            <button onClick={() => setForm(f => ({ ...f, education: [...f.education, { ...BLANK_EDU }] }))} className="btn-secondary text-xs px-3 py-1.5">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="space-y-5">
            {form.education.map((edu, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 relative">
                {form.education.length > 1 && (
                  <button onClick={() => setForm(f => ({ ...f, education: f.education.filter((_, j) => j !== i) }))}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Institution</label>
                    <input className="input" value={edu.institution} onChange={e => updateEdu(i, 'institution', e.target.value)} placeholder="University of South Florida" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Degree</label>
                    <input className="input" value={edu.degree} onChange={e => updateEdu(i, 'degree', e.target.value)} placeholder="Bachelor of Science" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Field of Study</label>
                    <input className="input" value={edu.field} onChange={e => updateEdu(i, 'field', e.target.value)} placeholder="Computer Science" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Graduation Year</label>
                    <input className="input" value={edu.graduation_year} onChange={e => updateEdu(i, 'graduation_year', e.target.value)} placeholder="2026" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">GPA (optional)</label>
                    <input className="input" value={edu.gpa ?? ''} onChange={e => updateEdu(i, 'gpa', e.target.value)} placeholder="3.8" /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Work Experience</h2>
            <button onClick={() => setForm(f => ({ ...f, experience: [...f.experience, { ...BLANK_EXP }] }))} className="btn-secondary text-xs px-3 py-1.5">
              <Plus size={12} /> Add
            </button>
          </div>
          {form.experience.length === 0 && (
            <p className="text-sm text-gray-400">No experience added yet — that's okay! Click "Add" to include internships, projects, or part-time work.</p>
          )}
          <div className="space-y-5">
            {form.experience.map((exp, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 relative">
                <button onClick={() => setForm(f => ({ ...f, experience: f.experience.filter((_, j) => j !== i) }))}
                  className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Company</label>
                    <input className="input" value={exp.company} onChange={e => updateExp(i, 'company', e.target.value)} placeholder="Acme Corp" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
                    <input className="input" value={exp.title} onChange={e => updateExp(i, 'title', e.target.value)} placeholder="Software Engineering Intern" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Start Date</label>
                    <input className="input" value={exp.start_date} onChange={e => updateExp(i, 'start_date', e.target.value)} placeholder="Jun 2025" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">End Date</label>
                    <input className="input" value={exp.end_date} onChange={e => updateExp(i, 'end_date', e.target.value)} placeholder="Aug 2025 or Present" /></div>
                </div>
                <div className="mt-3"><label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                  <textarea className="input resize-none" rows={2} value={exp.description}
                    onChange={e => updateExp(i, 'description', e.target.value)}
                    placeholder="Built REST APIs, reduced load time by 30%, collaborated with 3-person team..." /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={save} disabled={saving || !form.name} className="btn-primary">
            <Save size={16} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
