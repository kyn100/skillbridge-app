'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, X, Plus, Sparkles, Loader2, Map } from 'lucide-react';
import type { JobField, FieldKeyword } from '@/lib/types';

export default function FieldPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [field, setField] = useState<JobField | null>(null);
  const [keywords, setKeywords] = useState<FieldKeyword[]>([]);
  const [newKw, setNewKw] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/fields').then(r => r.json()).then((fs: JobField[]) => {
      const f = fs.find(x => x.id === Number(id));
      if (f) setField(f);
    });
    fetch(`/api/keywords?fieldId=${id}`).then(r => r.json()).then(setKeywords);
  }, [id]);

  async function addKeyword() {
    if (!newKw.trim()) return;
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: Number(id), keyword: newKw }),
    });
    const created = await res.json();
    setKeywords(kws => [...kws, created]);
    setNewKw('');
  }

  async function removeKeyword(kwId: number) {
    await fetch(`/api/keywords?id=${kwId}`, { method: 'DELETE' });
    setKeywords(kws => kws.filter(k => k.id !== kwId));
  }

  async function generateMore() {
    if (!field) return;
    setGenerating(true);
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generate: true, field_id: Number(id), field_name: field.name }),
    });
    const all = await res.json();
    setKeywords(all);
    setGenerating(false);
  }

  const selectedKeywords = keywords.map(k => k.keyword);

  if (!field) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/')} className="btn-secondary text-sm px-3 py-1.5 mb-6">
        <ArrowLeft size={14} /> All Fields
      </button>

      <div className="flex items-center gap-4 mb-6">
        <span className="text-5xl">{field.icon_emoji}</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{field.name}</h1>
          <p className="text-gray-500 mt-0.5">{field.description}</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Search Keywords</h2>
            <p className="text-xs text-gray-500 mt-0.5">These keywords will be used to find matching jobs. Add, remove, or generate more.</p>
          </div>
          <button onClick={generateMore} disabled={generating} className="btn-secondary text-sm px-3 py-1.5">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI Generate
          </button>
        </div>

        <div className="flex flex-wrap gap-2 min-h-12 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
          {keywords.map(kw => (
            <span key={kw.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm">
              {kw.keyword}
              {!kw.is_default && <span className="badge-blue ml-1">custom</span>}
              <button onClick={() => removeKeyword(kw.id)} className="text-gray-400 hover:text-red-500 transition-colors ml-0.5">
                <X size={12} />
              </button>
            </span>
          ))}
          {keywords.length === 0 && <span className="text-sm text-gray-400">No keywords yet</span>}
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={newKw}
            onChange={e => setNewKw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder="Add a custom keyword..."
          />
          <button onClick={addKeyword} disabled={!newKw.trim()} className="btn-secondary px-3">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => router.push(`/roadmap/${id}`)}
          className="btn-secondary"
        >
          <Map size={16} /> Expert Roadmap
        </button>
        <button
          onClick={() => router.push(`/search/${id}`)}
          disabled={keywords.length === 0}
          className="btn-primary"
        >
          Search Jobs <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
