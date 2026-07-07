'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Shuffle, RotateCcw, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface Flashcard {
  id: number;
  front: string;
  back: string;
  order_num: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardsPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const router = useRouter();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [known, setKnown] = useState<Set<number>>(new Set());

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: Number(moduleId) }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCards(data);
      } else {
        setError((data as { error?: string }).error ?? 'Failed to generate flashcards');
      }
    } catch {
      setError('Network error — could not generate flashcards');
    }
    setGenerating(false);
    setLoading(false);
  }, [moduleId]);

  useEffect(() => {
    fetch(`/api/flashcards?moduleId=${moduleId}`)
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) { setCards(data); setLoading(false); }
        else generate();
      })
      .catch(() => generate());
  }, [moduleId, generate]);

  function next() { setFlipped(false); setTimeout(() => setCurrent(c => Math.min(c + 1, cards.length - 1)), 150); }
  function prev() { setFlipped(false); setTimeout(() => setCurrent(c => Math.max(c - 1, 0)), 150); }
  function doShuffle() { setCards(s => shuffle(s)); setCurrent(0); setFlipped(false); setKnown(new Set()); }
  function restart() { setCurrent(0); setFlipped(false); setKnown(new Set()); }
  function markKnown() {
    setKnown(k => { const n = new Set(k); n.add(cards[current].id); return n; });
    if (current < cards.length - 1) next();
  }

  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-500 font-semibold mb-2">Failed to generate flashcards</p>
      <p className="text-sm text-gray-500 mb-4">{error}</p>
      <button onClick={generate} className="btn-primary">Retry</button>
    </div>
  );

  if (loading || generating) return (
    <div className="text-center py-20">
      <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
      <p className="text-gray-500">Generating your flashcards...</p>
      <p className="text-sm text-gray-400 mt-1">This takes about 10 seconds</p>
    </div>
  );

  const card = cards[current];
  const progress = Math.round(((current + 1) / cards.length) * 100);
  const knownCount = known.size;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push(`/module/${moduleId}`)} className="btn-secondary text-sm px-3 py-1.5">
          <ArrowLeft size={14} /> Back to Textbook
        </button>
        <div className="flex items-center gap-2">
          <button onClick={doShuffle} title="Shuffle" className="btn-secondary text-sm px-3 py-1.5">
            <Shuffle size={14} />
          </button>
          <button onClick={restart} title="Restart" className="btn-secondary text-sm px-3 py-1.5">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <Layers size={14} />
          <span>{current + 1} / {cards.length}</span>
        </div>
        <span className="text-green-600 font-medium">{knownCount} known</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Flip card */}
      <div
        className="cursor-pointer mb-6"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped(f => !f)}
      >
        <div
          style={{
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.4s ease',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            height: '260px',
          }}
        >
          {/* Front */}
          <div
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            className="absolute inset-0 bg-white border-2 border-blue-200 rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 text-center"
          >
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-4">Question</span>
            <p className="text-gray-900 text-xl font-semibold leading-snug">{card.front}</p>
            <p className="text-xs text-gray-400 mt-6">Click to reveal answer</p>
          </div>
          {/* Back */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            className="absolute inset-0 bg-blue-600 border-2 border-blue-600 rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 text-center"
          >
            <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-4">Answer</span>
            <p className="text-white text-lg font-medium leading-snug whitespace-pre-line">{card.back}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={prev} disabled={current === 0} className="btn-secondary flex-1 disabled:opacity-40 justify-center">
          <ChevronLeft size={16} /> Prev
        </button>

        {flipped && (
          <button
            onClick={markKnown}
            className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-1.5"
          >
            Got it ✓
          </button>
        )}

        <button onClick={next} disabled={current === cards.length - 1} className="btn-primary flex-1 disabled:opacity-40 justify-center">
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* Completion message */}
      {current === cards.length - 1 && flipped && (
        <div className="mt-6 card p-5 text-center">
          <p className="font-semibold text-gray-900">Deck complete!</p>
          <p className="text-sm text-gray-500 mt-1">You marked <span className="text-green-600 font-bold">{knownCount}</span> of {cards.length} cards as known.</p>
          <div className="flex gap-3 mt-4 justify-center">
            <button onClick={restart} className="btn-secondary text-sm">Study again</button>
            <button onClick={doShuffle} className="btn-primary text-sm">Shuffle & restart</button>
          </div>
        </div>
      )}
    </div>
  );
}
