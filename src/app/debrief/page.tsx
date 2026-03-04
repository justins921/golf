'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRounds, useRoundHoles } from '@/lib/hooks';
import {
  generateDebrief,
  type RoundDebrief,
  type DebriefInsight,
  type DebriefActionItem,
  type HoleHighlight,
  type ScoringPattern,
} from '@/lib/debrief';

// ── Emoji map (text-based) ──────────────────────────────────
const EMOJI_MAP: Record<string, string> = {
  fire: '🔥', star: '⭐', thumbsup: '👍', muscle: '💪', chart: '📈', book: '📖',
};

// ── Insight Card ────────────────────────────────────────────

function InsightCard({ insight }: { insight: DebriefInsight }) {
  const border = insight.category === 'positive' ? 'border-green-500/30' :
    insight.category === 'negative' ? 'border-red-500/30' : 'border-gray-700';
  const icon = insight.category === 'positive' ? (
    <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : insight.category === 'negative' ? (
    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className={`bg-gray-800 border ${border} rounded-lg p-3 flex gap-3`}>
      {icon}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-50">{insight.title}</span>
          {insight.impact === 'high' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              High Impact
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{insight.detail}</p>
      </div>
    </div>
  );
}

// ── Action Item ─────────────────────────────────────────────

function ActionItemCard({ item, index }: { item: DebriefActionItem; index: number }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-6 h-6 bg-green-600/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
        {index + 1}
      </div>
      <div>
        <div className="text-sm text-gray-50">{item.action}</div>
        <div className="text-xs text-gray-500 mt-0.5">{item.area}</div>
      </div>
    </div>
  );
}

// ── Hole Highlight Chip ─────────────────────────────────────

function HoleChip({ h }: { h: HoleHighlight }) {
  const colors: Record<string, string> = {
    birdie: 'bg-green-500/10 border-green-500/30 text-green-400',
    best: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    worst: 'bg-red-500/10 border-red-500/30 text-red-400',
    double_plus: 'bg-red-500/10 border-red-500/30 text-red-400',
    three_putt: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    one_putt: 'bg-green-500/10 border-green-500/30 text-green-400',
  };

  return (
    <div className={`border rounded-lg p-3 ${colors[h.type] ?? 'bg-gray-800 border-gray-700 text-gray-300'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold">#{h.holeNumber}</span>
        <span className="text-xs">Par {h.par} &rarr; {h.score}</span>
      </div>
      <p className="text-xs opacity-80">{h.detail}</p>
    </div>
  );
}

// ── SG Bar ──────────────────────────────────────────────────

function SGBar({ label, value }: { label: string; value: number }) {
  const maxWidth = 100;
  const width = Math.min(maxWidth, Math.abs(value) * 20);
  const isPositive = value >= 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-24 text-right">{label}</span>
      <div className="flex-1 flex items-center h-5">
        <div className="w-full relative h-2 bg-gray-900 rounded-full">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600" />
          {/* Bar */}
          <div
            className={`absolute top-0 h-full rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
            style={{
              width: `${width / 2}%`,
              left: isPositive ? '50%' : undefined,
              right: isPositive ? undefined : '50%',
            }}
          />
        </div>
      </div>
      <span className={`text-xs font-medium w-12 text-right ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{value.toFixed(1)}
      </span>
    </div>
  );
}

// ── Round Selector ──────────────────────────────────────────

function RoundSelector({ rounds, selectedId, onSelect }: {
  rounds: ReturnType<typeof useRounds>['rounds'];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const scored = rounds.filter(r => r.total_score != null);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-50">Select a Round to Debrief</h2>
      {scored.length === 0 ? (
        <p className="text-sm text-gray-400">No scored rounds yet. Add rounds with scores to get started.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {scored.map((r) => {
            const par = r.holes_played === 18 ? 72 : 36;
            const toPar = (r.total_score ?? 0) - par;
            return (
              <button key={r.id} onClick={() => onSelect(r.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between ${
                  selectedId === r.id ? 'bg-green-600/20 border border-green-500/30' : 'bg-gray-900 border border-gray-700/50 hover:bg-gray-750'
                }`}>
                <div>
                  <div className="text-sm font-medium text-gray-50">{r.course_name}</div>
                  <div className="text-xs text-gray-500">{r.round_date} &middot; {r.tees ?? ''} &middot; {r.holes_played}H</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-50">{r.total_score}</div>
                  <div className={`text-xs ${toPar <= 0 ? 'text-green-400' : toPar <= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                    {toPar >= 0 ? '+' : ''}{toPar}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Debrief View ────────────────────────────────────────────

function DebriefView({ debrief }: { debrief: RoundDebrief }) {
  const { round, analysis, overallVerdict, overallEmoji, insights, actionItems, holeHighlights, scoringPatterns, strengths, improvementAreas } = debrief;
  const score = round.total_score ?? 0;
  const par = analysis.holes.reduce((s, h) => s + h.par, 0) || 72;
  const toPar = score - par;

  return (
    <div className="space-y-6">
      {/* Overall verdict */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 text-center">
        <div className="text-3xl mb-2">{EMOJI_MAP[overallEmoji] ?? '⛳'}</div>
        <div className="text-2xl font-bold text-gray-50 mb-1">
          {score} <span className={`text-lg ${toPar <= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ({toPar >= 0 ? '+' : ''}{toPar})
          </span>
        </div>
        <div className="text-sm text-gray-300 mb-1">{round.course_name}</div>
        <p className="text-sm text-gray-400">{overallVerdict}</p>
      </div>

      {/* SG breakdown */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-50">Strokes Gained Breakdown</h3>
        <SGBar label="Off the Tee" value={analysis.sgOtt} />
        <SGBar label="Approach" value={analysis.sgApproach} />
        <SGBar label="Short Game" value={analysis.sgShortGame} />
        <SGBar label="Putting" value={analysis.sgPutting} />
        <div className="border-t border-gray-700 pt-2 mt-2">
          <SGBar label="Total SG" value={analysis.totalSG} />
        </div>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Putts', value: String(analysis.totalPutts), sub: `${analysis.puttsPerGir} per GIR` },
          { label: 'GIR', value: `${analysis.girPct}%`, sub: `${analysis.girCount} greens` },
          { label: 'Fairways', value: `${analysis.firPct}%`, sub: `${analysis.firCount}/${analysis.firHoles}` },
          { label: 'Penalties', value: String(analysis.totalPenalties), sub: analysis.totalPenalties === 0 ? 'Clean!' : 'strokes lost' },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className="text-lg font-bold text-gray-50">{stat.value}</div>
            <div className="text-[10px] text-gray-500">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Scoring patterns */}
      {scoringPatterns.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-50 mb-3">Scoring Patterns</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {scoringPatterns.map((p, i) => (
              <div key={i} className="text-center">
                <div className="text-xs text-gray-500">{p.label}</div>
                <div className={`text-sm font-bold ${
                  p.trend === 'good' ? 'text-green-400' : p.trend === 'bad' ? 'text-red-400' : 'text-gray-300'
                }`}>
                  {p.value}
                </div>
                <div className="text-[10px] text-gray-500">{p.context}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-50">Key Insights</h3>
        {insights.map((ins, i) => (
          <InsightCard key={i} insight={ins} />
        ))}
        {insights.length === 0 && (
          <p className="text-sm text-gray-500">Add more detail to your scorecard for deeper insights.</p>
        )}
      </div>

      {/* Hole highlights */}
      {holeHighlights.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-50 mb-3">Hole Highlights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {holeHighlights.map((h, i) => (
              <HoleChip key={i} h={h} />
            ))}
          </div>
        </div>
      )}

      {/* Strengths & improvements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {strengths.length > 0 && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-400 mb-2">Strengths</h3>
            <ul className="space-y-1">
              {strengths.map((s, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                  <span className="text-green-400">+</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {improvementAreas.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-400 mb-2">Focus Areas</h3>
            <ul className="space-y-1">
              {improvementAreas.map((s, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                  <span className="text-red-400">-</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action items */}
      {actionItems.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-50">Action Plan</h3>
          {actionItems.map((item, i) => (
            <ActionItemCard key={i} item={item} index={i} />
          ))}
        </div>
      )}

      {/* Reflection prompts */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-50">Post-Round Reflection</h3>
        <div className="space-y-2">
          {[
            'What was your best decision on the course today?',
            'Which shot would you want back?',
            'What will you focus on in your next practice session?',
            'Rate your mental game today (1-10). Why?',
          ].map((q, i) => (
            <div key={i} className="bg-gray-900 border border-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">{q}</p>
              <div className="h-5 border-b border-gray-700/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function DebriefPage() {
  const { rounds, loading } = useRounds();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const { holes, loading: holesLoading } = useRoundHoles(selectedRoundId);
  const [debrief, setDebrief] = useState<RoundDebrief | null>(null);

  const selectedRound = rounds.find(r => r.id === selectedRoundId);

  const handleSelect = useCallback((id: string) => {
    setSelectedRoundId(id);
    setDebrief(null);
  }, []);

  // Auto-generate debrief when holes load
  useMemo(() => {
    if (selectedRound && holes.length > 0 && !holesLoading) {
      const d = generateDebrief(selectedRound, holes, rounds);
      setDebrief(d);
    }
  }, [selectedRound, holes, holesLoading, rounds]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Post-Round Debrief</h1>
          <p className="text-sm text-gray-400">Guided reflection with auto-generated insights</p>
        </div>
        {debrief && (
          <button onClick={() => { setSelectedRoundId(null); setDebrief(null); }}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
            Change Round
          </button>
        )}
      </div>

      {!debrief ? (
        <RoundSelector rounds={rounds} selectedId={selectedRoundId} onSelect={handleSelect} />
      ) : null}

      {selectedRoundId && holesLoading && (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400 text-sm">Loading hole data...</div>
        </div>
      )}

      {selectedRoundId && !holesLoading && holes.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-400 text-sm mb-2">No hole-by-hole data for this round.</p>
          <p className="text-gray-500 text-xs">Add hole data from the Rounds page or use the Play scorer for detailed analysis.</p>
        </div>
      )}

      {debrief && <DebriefView debrief={debrief} />}
    </div>
  );
}
