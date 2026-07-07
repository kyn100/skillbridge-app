'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, RefreshCw, Network, X } from 'lucide-react';

interface MindmapBranch {
  label: string;
  color: string;
  children: string[];
}

interface MindmapData {
  center: string;
  branches: MindmapBranch[];
}

interface ConceptDetail {
  definition: string;
  sub_topics: Array<{ name: string; description: string }>;
  example: string;
}

interface PlacedChild {
  label: string;
  cx: number;
  cy: number;
}

interface PlacedBranch extends MindmapBranch {
  angle: number;
  bx: number;
  by: number;
  placedChildren: PlacedChild[];
}

// Layout constants
const CX = 550, CY = 390;
const BRANCH_R = 215;
const CHILD_R = 130;
const LEAF_R = 88;
const FAN = Math.PI * 0.72;
const LEAF_FAN = Math.PI * 0.55;

function layoutMindmap(data: MindmapData): PlacedBranch[] {
  const N = data.branches.length;
  return data.branches.map((branch, i) => {
    const angle = (2 * Math.PI / N) * i - Math.PI / 2;
    const bx = CX + Math.cos(angle) * BRANCH_R;
    const by = CY + Math.sin(angle) * BRANCH_R;
    const nC = branch.children.length;
    const placedChildren: PlacedChild[] = branch.children.map((child, j) => {
      const childAngle = nC <= 1 ? angle : angle - FAN / 2 + (FAN / (nC - 1)) * j;
      return { label: child, cx: bx + Math.cos(childAngle) * CHILD_R, cy: by + Math.sin(childAngle) * CHILD_R };
    });
    return { ...branch, angle, bx, by, placedChildren };
  });
}

function MindmapView({ data, moduleId }: { data: MindmapData; moduleId: number }) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [drilled, setDrilled] = useState<Record<string, ConceptDetail | 'loading'>>({});
  const [selected, setSelected] = useState<{ key: string; color: string; label: string } | null>(null);
  const branches = useMemo(() => layoutMindmap(data), [data]);

  function toggleBranch(i: number) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleChildClick(bi: number, ci: number, childLabel: string, branchLabel: string, color: string) {
    const key = `${bi}-${ci}`;
    // Toggle off if already selected
    if (selected?.key === key) { setSelected(null); return; }
    setSelected({ key, color, label: childLabel });
    // Use cache if available
    if (drilled[key]) return;
    setDrilled(prev => ({ ...prev, [key]: 'loading' }));
    try {
      const res = await fetch('/api/mindmap/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: childLabel, module_id: moduleId, branch_label: branchLabel }),
      });
      const detail = await res.json() as ConceptDetail;
      setDrilled(prev => ({ ...prev, [key]: detail }));
    } catch {
      setDrilled(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  }

  const selectedDetail = selected ? drilled[selected.key] : null;

  // Multi-line center text
  function centerLines(text: string): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (test.length > 12 && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  const cLines = centerLines(data.center);

  return (
    <>
      {/* SVG canvas */}
      <div
        className="w-full overflow-auto rounded-2xl border border-gray-200"
        style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 50%,#e8f0fe 100%)', minHeight: 520 }}
      >
        <svg
          viewBox="0 0 1100 780"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', minWidth: 640, overflow: 'visible' }}
        >
          <defs>
            <filter id="mm-shadow"><feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.18" /></filter>
            <radialGradient id="center-grad" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* Dot grid */}
          <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#cbd5e1" fillOpacity="0.5" />
          </pattern>
          <rect width="1100" height="780" fill="url(#dots)" />

          {/* ── LEVEL 1: center → branch lines ── */}
          {branches.map((b, i) => (
            <line key={`cl-${i}`} x1={CX} y1={CY} x2={b.bx} y2={b.by}
              stroke={b.color} strokeWidth="2.5" opacity="0.45" />
          ))}

          {/* ── LEVEL 2: branch → child lines ── */}
          {branches.map((b, i) =>
            !collapsed.has(i) && b.placedChildren.map((ch, j) => (
              <line key={`chl-${i}-${j}`} x1={b.bx} y1={b.by} x2={ch.cx} y2={ch.cy}
                stroke={b.color} strokeWidth="1.5" opacity="0.3" strokeDasharray="5 4" />
            ))
          )}

          {/* ── LEVEL 3: child → leaf lines ── */}
          {branches.map((b, i) =>
            !collapsed.has(i) && b.placedChildren.map((ch, j) => {
              const key = `${i}-${j}`;
              const detail = drilled[key];
              if (!detail || detail === 'loading') return null;
              const awayAngle = Math.atan2(ch.cy - b.by, ch.cx - b.bx);
              const nL = detail.sub_topics.length;
              return detail.sub_topics.map((_, k) => {
                const la = nL === 1 ? awayAngle : awayAngle - LEAF_FAN / 2 + (LEAF_FAN / (nL - 1)) * k;
                return (
                  <line key={`ll-${i}-${j}-${k}`}
                    x1={ch.cx} y1={ch.cy}
                    x2={ch.cx + Math.cos(la) * LEAF_R}
                    y2={ch.cy + Math.sin(la) * LEAF_R}
                    stroke={b.color} strokeWidth="1" opacity="0.2" />
                );
              });
            })
          )}

          {/* ── LEAF NODES (3rd level) ── */}
          {branches.map((b, i) =>
            !collapsed.has(i) && b.placedChildren.map((ch, j) => {
              const key = `${i}-${j}`;
              const detail = drilled[key];
              if (!detail || detail === 'loading') return null;
              const awayAngle = Math.atan2(ch.cy - b.by, ch.cx - b.bx);
              const nL = detail.sub_topics.length;
              return detail.sub_topics.map((st, k) => {
                const la = nL === 1 ? awayAngle : awayAngle - LEAF_FAN / 2 + (LEAF_FAN / (nL - 1)) * k;
                const lx = ch.cx + Math.cos(la) * LEAF_R;
                const ly = ch.cy + Math.sin(la) * LEAF_R;
                const lbl = st.name.length > 18 ? st.name.slice(0, 16) + '…' : st.name;
                const w = Math.min(Math.max(lbl.length * 5.8 + 14, 58), 108);
                return (
                  <g key={`lf-${i}-${j}-${k}`}>
                    <rect x={lx - w / 2} y={ly - 11} width={w} height={22} rx={11}
                      fill={b.color} fillOpacity="0.09"
                      stroke={b.color} strokeWidth="1" strokeOpacity="0.4" />
                    <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize="9.5" fontWeight="500" fill={b.color} fontFamily="system-ui,sans-serif">
                      {lbl}
                    </text>
                  </g>
                );
              });
            })
          )}

          {/* ── CHILD NODES (2nd level, clickable) ── */}
          {branches.map((b, i) =>
            !collapsed.has(i) && b.placedChildren.map((ch, j) => {
              const key = `${i}-${j}`;
              const isSelected = selected?.key === key;
              const isLoading = drilled[key] === 'loading';
              const hasDrilled = drilled[key] && drilled[key] !== 'loading';
              const lbl = ch.label.length > 22 ? ch.label.slice(0, 20) + '…' : ch.label;
              const w = Math.min(Math.max(lbl.length * 6.5 + 22, 68), 140);
              return (
                <g key={`ch-${i}-${j}`}
                  onClick={() => handleChildClick(i, j, ch.label, b.label, b.color)}
                  style={{ cursor: 'pointer' }}>
                  {/* Selection glow */}
                  {isSelected && (
                    <rect x={ch.cx - w / 2 - 6} y={ch.cy - 20} width={w + 12} height={40} rx={20}
                      fill={b.color} fillOpacity="0.22" />
                  )}
                  <rect x={ch.cx - w / 2} y={ch.cy - 14} width={w} height={28} rx={14}
                    fill={b.color} fillOpacity={isSelected ? 0.22 : 0.1}
                    stroke={b.color} strokeWidth={isSelected ? 2 : 1.5}
                    strokeOpacity={isSelected ? 0.9 : 0.55} />
                  <text x={ch.cx} y={ch.cy + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize="11" fontWeight={isSelected ? '700' : '500'}
                    fill={b.color} fontFamily="system-ui,sans-serif">
                    {lbl}
                  </text>
                  {/* Loading pulse dot */}
                  {isLoading && (
                    <circle cx={ch.cx + w / 2 - 8} cy={ch.cy - 10} r="4" fill={b.color}>
                      <animate attributeName="opacity" values="1;0.2;1" dur="0.7s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Drilled indicator (green dot) */}
                  {hasDrilled && (
                    <circle cx={ch.cx + w / 2 - 8} cy={ch.cy - 10} r="3.5" fill="#22c55e" />
                  )}
                  {/* Hint arrow for un-drilled nodes */}
                  {!hasDrilled && !isLoading && (
                    <text x={ch.cx + w / 2 - 8} y={ch.cy - 9} textAnchor="middle" dominantBaseline="middle"
                      fontSize="8" fill={b.color} opacity="0.45" fontFamily="system-ui,sans-serif">+</text>
                  )}
                </g>
              );
            })
          )}

          {/* ── BRANCH NODES (1st level, collapse/expand) ── */}
          {branches.map((b, i) => {
            const lbl = b.label.length > 20 ? b.label.slice(0, 18) + '…' : b.label;
            const w = Math.min(Math.max(lbl.length * 7.8 + 28, 92), 158);
            const isOff = collapsed.has(i);
            return (
              <g key={`b-${i}`} onClick={() => toggleBranch(i)} style={{ cursor: 'pointer' }}>
                {!isOff && (
                  <rect x={b.bx - w / 2 - 3} y={b.by - 22} width={w + 6} height={44} rx={22}
                    fill={b.color} fillOpacity="0.2" />
                )}
                <rect x={b.bx - w / 2} y={b.by - 19} width={w} height={38} rx={19}
                  fill={b.color} filter="url(#mm-shadow)" opacity={isOff ? 0.7 : 1} />
                <text x={b.bx} y={b.by + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize="12.5" fontWeight="700" fill="white" fontFamily="system-ui,sans-serif">
                  {lbl}
                </text>
                {isOff && (
                  <text x={b.bx + w / 2 - 14} y={b.by + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize="9" fill="white" fillOpacity="0.8" fontFamily="system-ui,sans-serif">
                    +{b.children.length}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── CENTER NODE ── */}
          <circle cx={CX} cy={CY} r={70} fill="url(#center-grad)" filter="url(#mm-shadow)" />
          <circle cx={CX} cy={CY} r={67} fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeOpacity="0.55" />
          {cLines.map((line, li) => {
            const lineH = 18;
            const startY = CY - ((cLines.length - 1) * lineH) / 2;
            return (
              <text key={li} x={CX} y={startY + li * lineH} textAnchor="middle" dominantBaseline="middle"
                fontSize="14" fontWeight="700" fill="white" fontFamily="system-ui,sans-serif">
                {line}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Hint bar */}
      <p className="text-xs text-gray-400 text-center mt-2">
        Click <span className="text-gray-600 font-medium">colored branches</span> to collapse · Click <span className="text-gray-600 font-medium">sub-concept pills</span> to drill down
      </p>

      {/* ── DETAIL PANEL ── */}
      {selected && (
        <div
          className="mt-4 card overflow-hidden transition-all"
          style={{ borderLeftWidth: 4, borderLeftColor: selected.color }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
            <h3 className="font-bold text-gray-900 flex-1">{selected.label}</h3>
            {selectedDetail === 'loading' && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Generating details...
              </span>
            )}
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          {selectedDetail && selectedDetail !== 'loading' && (
            <div className="p-5 space-y-4">
              {/* Definition */}
              <p className="text-sm text-gray-700 leading-relaxed">{selectedDetail.definition}</p>

              {/* Sub-topics grid */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sub-concepts</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedDetail.sub_topics.map((st, k) => (
                    <div key={k} className="px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50">
                      <div
                        className="text-xs font-semibold mb-0.5"
                        style={{ color: selected.color }}
                      >
                        {st.name}
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">{st.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example */}
              {selectedDetail.example && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Example</p>
                  <div className="px-4 py-3 bg-gray-900 rounded-xl">
                    <code className="text-xs text-green-400 leading-relaxed break-all whitespace-pre-wrap">
                      {selectedDetail.example}
                    </code>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-5 card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Topics at a glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.branches.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: b.color }} />
              <div>
                <div className="text-xs font-semibold text-gray-800">{b.label}</div>
                <div className="text-xs text-gray-500">{b.children.join(' · ')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Page wrapper ────────────────────────────────────────────────────────────

export default function MindmapPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const router = useRouter();
  const [data, setData] = useState<MindmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/mindmap?moduleId=${moduleId}`)
      .then(r => r.json())
      .then((d: MindmapData | null) => {
        if (d?.center && d.branches?.length > 0) { setData(d); setLoading(false); }
        else generate();
      })
      .catch(() => generate());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: Number(moduleId) }),
      });
      const d = await res.json() as MindmapData & { error?: string };
      if (d.center && d.branches) setData(d);
      else setError(d.error ?? 'Failed to generate mindmap');
    } catch {
      setError('Network error — could not generate mindmap');
    }
    setGenerating(false);
    setLoading(false);
  }

  if (error) return (
    <div className="text-center py-20">
      <Network size={40} className="mx-auto mb-4 text-gray-300" />
      <p className="text-red-500 font-semibold mb-2">Failed to generate mindmap</p>
      <p className="text-sm text-gray-500 mb-4">{error}</p>
      <button onClick={generate} className="btn-primary">Retry</button>
    </div>
  );

  if (loading || generating) return (
    <div className="text-center py-20">
      <Loader2 size={36} className="animate-spin text-blue-500 mx-auto mb-4" />
      <p className="text-gray-600 font-medium">Building your mind map...</p>
      <p className="text-sm text-gray-400 mt-1">This takes about 10 seconds</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="btn-secondary text-sm px-3 py-1.5">
          <ArrowLeft size={14} /> Back to Module
        </button>
        <button onClick={generate} className="btn-secondary text-sm px-3 py-1.5">
          <RefreshCw size={14} /> Regenerate
        </button>
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <Network size={22} className="text-blue-500" />
          <h1 className="text-xl font-bold text-gray-900">Mind Map</h1>
        </div>
      </div>

      {data && <MindmapView data={data} moduleId={Number(moduleId)} />}
    </div>
  );
}
