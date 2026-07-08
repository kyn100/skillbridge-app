'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, BookOpen, CheckCircle, Loader2, ClipboardList,
  Layers, BookMarked, Search, X, Network, Clock, ChevronLeft, ChevronRight, RefreshCw, PlayCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Chapter {
  id: number;
  title: string;
  content_markdown: string;
  order_num: number;
}

interface Video {
  id: number;
  title: string;
  channel: string;
  url: string;
  duration: string;
  description: string;
  order_num: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function highlight(text: string, term: string): string {
  if (!term.trim()) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '**$1**');
}

function readingTime(text: string): number {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));
}

// ─── Code block with copy button ─────────────────────────────────────────────

function CodeBlock({ lang, children }: { lang: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="my-6 rounded-xl overflow-hidden shadow-md border border-gray-800">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2.5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 opacity-60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-60" />
          </div>
          {lang && <span className="text-xs text-gray-400 font-mono">{lang}</span>}
        </div>
        <button
          onClick={copy}
          className="text-xs text-gray-400 hover:text-white transition-colors px-2.5 py-1 rounded-md hover:bg-gray-700 font-medium"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="bg-gray-950 p-5 overflow-x-auto">
        <code className="text-sm text-gray-100 font-mono leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

// ─── Callout box for blockquotes ─────────────────────────────────────────────

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in (node as object)) {
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return '';
}

const CALLOUT_TYPES = {
  '⚡': { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-900', icon: '⚡', label: 'Quick Win'  },
  '⚠':  { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-900',   icon: '⚠️', label: 'Watch Out'  },
  '⚠️': { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-900',   icon: '⚠️', label: 'Watch Out'  },
  '🌍': { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-900', icon: '🌍', label: 'Real World' },
  '💡': { bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-900',  icon: '💡', label: 'Note'       },
} as const;

function Callout({ children }: { children: React.ReactNode }) {
  const text = extractText(children).trimStart();
  const match = Object.entries(CALLOUT_TYPES).find(([emoji]) => text.startsWith(emoji));
  const style = match ? match[1] : CALLOUT_TYPES['💡'];
  return (
    <div className={`my-6 flex gap-3 px-4 py-4 ${style.bg} border ${style.border} rounded-xl`}>
      <span className="text-lg mt-0.5 shrink-0">{style.icon}</span>
      <div className={`${style.text} text-sm leading-relaxed [&>p]:mb-0`}>{children}</div>
    </div>
  );
}

// ─── Build ReactMarkdown component map ───────────────────────────────────────

function buildComponents(isSearching: boolean): Components {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-gray-900 mt-10 mb-5 pb-3 border-b-2 border-blue-100 first:mt-0 scroll-mt-20">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold text-gray-900 mt-9 mb-4 flex items-center gap-2.5 scroll-mt-20">
        <span className="w-1 h-6 bg-blue-500 rounded-full shrink-0" />
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-gray-800 mt-7 mb-3 flex items-center gap-2 scroll-mt-20">
        <span className="w-2 h-2 bg-blue-300 rounded-full shrink-0" />
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold text-gray-700 mt-5 mb-2">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="text-gray-700 leading-[1.85] mb-5 text-base">{children}</p>
    ),
    // Yellow highlight when searching; semibold when not
    strong: ({ children }) =>
      isSearching
        ? <mark className="bg-yellow-200 text-yellow-950 px-0.5 rounded-sm font-semibold not-italic">{children}</mark>
        : <strong className="font-semibold text-gray-900">{children}</strong>,
    em: ({ children }) => <em className="text-gray-600 italic">{children}</em>,
    // Inline vs block code detection via className
    code: ({ className, children }) => {
      const lang = className?.replace('language-', '') ?? '';
      if (!lang) {
        return (
          <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[0.875em] font-mono border border-slate-200">
            {children}
          </code>
        );
      }
      return <CodeBlock lang={lang}>{children}</CodeBlock>;
    },
    // Let code component handle the wrapper
    pre: ({ children }) => <>{children}</>,
    blockquote: ({ children }) => <Callout>{children}</Callout>,
    ul: ({ children }) => (
      <ul className="my-4 space-y-2 pl-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-4 space-y-2 pl-5 list-decimal marker:text-blue-500 marker:font-semibold">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-700 leading-relaxed flex items-baseline gap-2.5">
        <span className="text-blue-400 font-bold text-sm shrink-0 leading-none mt-[3px]">›</span>
        <span className="flex-1">{children}</span>
      </li>
    ),
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline underline-offset-2 decoration-blue-300">
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>,
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100 last:border-0">
        {children}
      </th>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">{children}</tr>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-gray-700 border-r border-gray-100 last:border-0">{children}</td>
    ),
    hr: () => <hr className="my-10 border-gray-200" />,
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

const FONT_SIZES = [
  { label: 'A', cls: 'text-sm', lh: 'leading-[1.8]' },
  { label: 'A', cls: 'text-base', lh: 'leading-[1.85]' },
  { label: 'A', cls: 'text-lg', lh: 'leading-[1.9]' },
];

function getYouTubeId(url: string): string | null {
  return url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1] ?? null;
}

export default function ModulePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [fontIdx, setFontIdx] = useState(1); // 0=small 1=base 2=large
  const [activeTab, setActiveTab] = useState<'textbook' | 'videos'>('textbook');
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosFetched, setVideosFetched] = useState(false);

  // Track restoration so we don't save before we've restored
  const restoredRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/textbook?moduleId=${id}`)
      .then(r => r.json())
      .then((chs: unknown) => {
        if (Array.isArray(chs) && chs.length > 0) {
          setChapters(chs as Chapter[]);
          restoreChapter(chs as Chapter[]);
          setLoading(false);
        } else {
          generateTextbook();
        }
      })
      .catch(() => generateTextbook());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function restoreChapter(chs: Chapter[]) {
    const maxIdx = chs.length - 1;

    // 1) URL param takes priority
    const params = new URLSearchParams(window.location.search);
    const urlChapter = params.get('chapter');
    if (urlChapter !== null) {
      const idx = Math.min(Math.max(0, parseInt(urlChapter, 10)), maxIdx);
      setActiveChapter(idx);
      restoredRef.current = true;
      return;
    }

    // 2) Fall back to bookmark from /api/resume
    try {
      const res = await fetch('/api/resume');
      if (res.ok) {
        const data = await res.json() as { module?: { id: number }; chapter_idx?: number } | null;
        if (data?.module?.id === Number(id) && typeof data.chapter_idx === 'number') {
          const idx = Math.min(Math.max(0, data.chapter_idx), maxIdx);
          setActiveChapter(idx);
        }
      }
    } catch { /* not logged-in or network error — start from chapter 0 */ }

    restoredRef.current = true;
  }

  async function generateTextbook() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/textbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: Number(id) }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setChapters(data as Chapter[]);
        await restoreChapter(data as Chapter[]);
      } else {
        setError((data as { error?: string }).error ?? 'Failed to generate textbook');
      }
    } catch {
      setError('Network error — could not generate textbook');
    }
    setGenerating(false);
    setLoading(false);
  }

  async function loadVideos() {
    if (videosFetched) return;
    setVideosLoading(true);
    try {
      const res = await fetch(`/api/videos?moduleId=${id}`);
      const data = await res.json() as Video[] | { error: string };
      if (Array.isArray(data) && data.length > 0) {
        setVideos(data);
        setVideosFetched(true);
      } else {
        // Not cached yet — generate now
        const genRes = await fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module_id: Number(id) }),
        });
        const genData = await genRes.json() as Video[] | { error: string };
        if (Array.isArray(genData)) setVideos(genData);
        setVideosFetched(true);
      }
    } catch { /* best-effort */ }
    setVideosLoading(false);
  }

  // Auto-save chapter position with 1s debounce (only after restore completes)
  useEffect(() => {
    if (!restoredRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/resume/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: Number(id), chapter_idx: activeChapter }),
      }).catch(() => { /* best-effort */ });
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter]);

  const matchingChapters = useMemo(() => {
    if (!search.trim()) return null;
    const term = search.toLowerCase();
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return chapters
      .map((ch, i) => ({ ch, i, hits: (ch.content_markdown.toLowerCase().match(new RegExp(esc, 'g')) || []).length }))
      .filter(({ hits }) => hits > 0)
      .sort((a, b) => b.hits - a.hits);
  }, [search, chapters]);

  const displayContent = useMemo(() => {
    const ch = chapters[activeChapter];
    if (!ch) return '';
    return search.trim() ? highlight(ch.content_markdown, search) : ch.content_markdown;
  }, [chapters, activeChapter, search]);

  const mdComponents = useMemo(() => buildComponents(!!search.trim()), [search]);

  const chapter = chapters[activeChapter];
  const mins = chapter ? readingTime(chapter.content_markdown) : 0;
  const fs = FONT_SIZES[fontIdx];

  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-500 font-semibold mb-2">Failed to generate textbook</p>
      <p className="text-sm text-gray-500 mb-4">{error}</p>
      <button onClick={generateTextbook} className="btn-primary">Retry</button>
    </div>
  );

  if (loading || generating) return (
    <div className="text-center py-20">
      <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
      <p className="text-gray-500">Generating your personalized textbook...</p>
      <p className="text-sm text-gray-400 mt-1">This may take 20–30 seconds</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="btn-secondary text-sm px-3 py-1.5 mb-6">
        <ArrowLeft size={14} /> Back to Study Plan
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Sidebar ── */}
        <div className="lg:col-span-1">
          <div className="card p-4 sticky top-20">

            {/* Search */}
            <div className="relative mb-4">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search chapters..."
                className="w-full pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Search matches */}
            {matchingChapters && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1.5">
                  {matchingChapters.length} chapter{matchingChapters.length !== 1 ? 's' : ''} match
                </p>
                <div className="space-y-1">
                  {matchingChapters.map(({ ch, i, hits }) => (
                    <button key={ch.id} onClick={() => { setActiveChapter(i); setSearch(''); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-100 transition-colors">
                      <div className="font-medium truncate">{ch.title}</div>
                      <div className="text-xs text-yellow-600">{hits} match{hits !== 1 ? 'es' : ''}</div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 mt-3 mb-2" />
              </div>
            )}

            {/* Chapter list */}
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-blue-500" />
              <span className="font-semibold text-sm text-gray-900">Chapters</span>
              <span className="ml-auto text-xs text-gray-400">{chapters.length} total</span>
            </div>
            <div className="space-y-1">
              {chapters.map((ch, i) => (
                <button key={ch.id}
                  onClick={() => { setActiveChapter(i); setSearch(''); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-start gap-2 ${
                    activeChapter === i
                      ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <span className={`text-xs font-bold mt-0.5 shrink-0 ${activeChapter === i ? 'text-blue-400' : 'text-gray-300'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="leading-snug">{ch.title}</span>
                </button>
              ))}
            </div>

            {/* Chapter progress bar */}
            {chapters.length > 1 && (
              <div className="mt-3 px-1">
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all"
                    style={{ width: `${((activeChapter + 1) / chapters.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center mt-1">
                  Chapter {activeChapter + 1} of {chapters.length}
                </p>
              </div>
            )}

            {/* Study tools */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <button
                onClick={() => { if (confirm('Regenerate all chapters with the new engaging style?')) { setChapters([]); generateTextbook(); } }}
                className="btn-secondary w-full justify-center text-sm py-2 text-orange-600 hover:text-orange-700 hover:border-orange-200"
              >
                <RefreshCw size={14} /> Regenerate Textbook
              </button>
              <button onClick={() => router.push(`/mindmap/${id}`)} className="btn-secondary w-full justify-center text-sm py-2">
                <Network size={14} /> Mind Map
              </button>
              <button onClick={() => router.push(`/cases/${id}`)} className="btn-secondary w-full justify-center text-sm py-2">
                <BookMarked size={14} /> Case Studies
              </button>
              <button onClick={() => router.push(`/flashcards/${id}`)} className="btn-secondary w-full justify-center text-sm py-2">
                <Layers size={14} /> Flashcards
              </button>
              <button onClick={() => router.push(`/test/${id}`)} className="btn-primary w-full justify-center text-sm py-2">
                <ClipboardList size={14} /> Take Tests
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="lg:col-span-3">
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('textbook')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'textbook'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookOpen size={14} /> Textbook
            </button>
            <button
              onClick={() => { setActiveTab('videos'); loadVideos(); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'videos'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PlayCircle size={14} /> Videos
            </button>
          </div>

          {/* Videos panel */}
          {activeTab === 'videos' && (
            <div>
              {videosLoading && (
                <div className="text-center py-16">
                  <Loader2 size={28} className="animate-spin text-red-500 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Finding the best videos for this topic...</p>
                </div>
              )}
              {!videosLoading && videos.length === 0 && videosFetched && (
                <div className="text-center py-16 text-gray-400 text-sm">No videos found for this module.</div>
              )}
              {!videosLoading && videos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {videos.map(v => {
                    const ytId = getYouTubeId(v.url);
                    return (
                      <div key={v.id} className="card overflow-hidden flex flex-col">
                        <div className="relative bg-gray-900">
                          {ytId ? (
                            <img
                              src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                              alt={v.title}
                              className="w-full aspect-video object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full aspect-video flex items-center justify-center bg-gray-800">
                              <PlayCircle size={40} className="text-gray-600" />
                            </div>
                          )}
                          {v.duration && (
                            <span className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                              {v.duration}
                            </span>
                          )}
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <p className="text-xs text-gray-500 mb-1">{v.channel}</p>
                          <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 leading-snug">{v.title}</h3>
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">{v.description}</p>
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                          >
                            <PlayCircle size={13} /> Watch on YouTube
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'textbook' && chapter && (
            <div className="card overflow-hidden">

              {/* Chapter header bar */}
              <div className="px-8 pt-7 pb-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                        Chapter {activeChapter + 1}
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} /> {mins} min read
                      </span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 leading-snug">{chapter.title}</h1>
                  </div>

                  {/* Font size controls */}
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    {FONT_SIZES.map((f, i) => (
                      <button key={i} onClick={() => setFontIdx(i)}
                        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                          fontIdx === i
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        style={{ fontSize: 11 + i * 2 }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search highlight banner */}
              {search.trim() && matchingChapters?.some(m => m.i === activeChapter) && (
                <div className="mx-8 mt-5 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex items-center gap-1.5">
                  <Search size={11} />
                  Highlighting <strong>&quot;{search}&quot;</strong> — {
                    matchingChapters.find(m => m.i === activeChapter)?.hits
                  } match{matchingChapters.find(m => m.i === activeChapter)?.hits !== 1 ? 'es' : ''} in this chapter
                </div>
              )}

              {/* Textbook content */}
              <div className={`px-8 py-8 ${fs.cls} ${fs.lh}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={mdComponents}
                >
                  {displayContent}
                </ReactMarkdown>
              </div>

              {/* Bottom navigation */}
              <div className="px-8 pb-8">
                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <button
                    onClick={() => { setActiveChapter(i => Math.max(0, i - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={activeChapter === 0}
                    className="btn-secondary text-sm disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <ChevronLeft size={15} /> Previous
                  </button>

                  {/* Dot indicators */}
                  <div className="flex items-center gap-1.5">
                    {chapters.map((_, i) => (
                      <button key={i} onClick={() => setActiveChapter(i)}
                        className={`rounded-full transition-all ${
                          i === activeChapter ? 'w-6 h-2 bg-blue-500' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  {activeChapter === chapters.length - 1 ? (
                    <button onClick={() => router.push(`/test/${id}`)} className="btn-primary text-sm">
                      <CheckCircle size={14} /> Take Tests
                    </button>
                  ) : (
                    <button
                      onClick={() => { setActiveChapter(i => i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="btn-primary text-sm flex items-center gap-1.5"
                    >
                      Next <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
