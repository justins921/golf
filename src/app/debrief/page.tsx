'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRounds, useRoundHoles } from '@/lib/hooks';
import { calculateHandicap } from '@/lib/handicap';
import {
  generateDebrief,
  getReflection, saveReflection,
  getCoachNotes, saveCoachNotes,
  getRoundTags, saveRoundTags,
  AVAILABLE_TAGS,
  type RoundDebrief,
  type DebriefInsight,
  type DebriefActionItem,
  type HoleHighlight,
  type ScoringPattern,
  type WhatIf,
  type CourseHistory,
} from '@/lib/debrief';

// ── Emoji map ───────────────────────────────────────────────
const EMOJI_MAP: Record<string, string> = {
  fire: '🔥', star: '⭐', thumbsup: '👍', muscle: '💪', chart: '📈', book: '📖',
};

// ── View Mode ───────────────────────────────────────────────
type ViewMode = 'simple' | 'detailed';

// ── Insight Card ────────────────────────────────────────────

function InsightCard({ insight, simple }: { insight: DebriefInsight; simple: boolean }) {
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
          {!simple && insight.impact === 'high' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              High Impact
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {simple ? insight.casualDetail : insight.detail}
        </p>
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
      <div className="flex-1">
        <div className="text-sm text-gray-50">{item.action}</div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500">{item.area}</span>
          {item.practiceLink && (
            <Link href={item.practiceLink}
              className="text-xs text-green-400 hover:text-green-300 underline underline-offset-2">
              {item.practiceLinkLabel ?? 'Practice This'}
            </Link>
          )}
        </div>
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

// ── SG Bar (dynamic scaling) ────────────────────────────────

function SGBarChart({ analysis }: { analysis: RoundDebrief['analysis'] }) {
  const items = [
    { label: 'Off the Tee', value: analysis.sgOtt },
    { label: 'Approach', value: analysis.sgApproach },
    { label: 'Short Game', value: analysis.sgShortGame },
    { label: 'Putting', value: analysis.sgPutting },
  ];

  // Dynamic scale: find max absolute value, use at least 2
  const maxAbs = Math.max(2, ...items.map(i => Math.abs(i.value)));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-50">Strokes Gained Breakdown</h3>
      {items.map(({ label, value }) => {
        const pct = (Math.abs(value) / maxAbs) * 50; // 50% max width per side
        const isPositive = value >= 0;
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-24 text-right">{label}</span>
            <div className="flex-1 flex items-center h-5">
              <div className="w-full relative h-2 bg-gray-900 rounded-full">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600" />
                <div
                  className={`absolute top-0 h-full rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{
                    width: `${pct}%`,
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
      })}
      <div className="border-t border-gray-700 pt-2 mt-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-24 text-right font-medium">Total SG</span>
          <div className="flex-1" />
          <span className={`text-sm font-bold w-12 text-right ${analysis.totalSG >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {analysis.totalSG >= 0 ? '+' : ''}{analysis.totalSG.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── What-If Card ────────────────────────────────────────────

function WhatIfSection({ whatIfs, actualScore }: { whatIfs: WhatIf[]; actualScore: number }) {
  if (whatIfs.length === 0) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-50 mb-3">What-If Scenarios</h3>
      <p className="text-xs text-gray-500 mb-3">How your score changes if you fix specific weaknesses</p>
      <div className="space-y-2">
        {whatIfs.map((w, i) => (
          <div key={i} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-300">{w.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-400">-{w.savedStrokes} strokes</span>
              <span className="text-sm font-bold text-gray-50">{w.hypotheticalScore}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-xs text-gray-500">Actual score</span>
        <span className="text-sm font-bold text-gray-400">{actualScore}</span>
      </div>
    </div>
  );
}

// ── Course History Card ─────────────────────────────────────

function CourseHistoryCard({ history }: { history: CourseHistory }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-50 mb-3">Course History — {history.courseName}</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-gray-500">Your Average</div>
          <div className="text-lg font-bold text-gray-50">{history.avgScore}</div>
          <div className="text-[10px] text-gray-500">{history.roundCount} round{history.roundCount !== 1 ? 's' : ''}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Best Score</div>
          <div className="text-lg font-bold text-green-400">{history.bestScore}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Today</div>
          <div className="text-lg font-bold text-gray-50">{history.thisScore}</div>
          <div className={`text-xs ${history.vsAvg <= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {history.vsAvg >= 0 ? '+' : ''}{history.vsAvg} vs avg
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Round Tags ──────────────────────────────────────────────

function RoundTagEditor({ roundId }: { roundId: string }) {
  const [tags, setTags] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTags(getRoundTags(roundId));
  }, [roundId]);

  const toggle = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(next);
    saveRoundTags(roundId, next);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {AVAILABLE_TAGS.map(tag => (
        <button key={tag} onClick={() => toggle(tag)}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
            tags.includes(tag)
              ? 'bg-green-600/20 border-green-500/30 text-green-400'
              : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300'
          }`}>
          {tag}
        </button>
      ))}
    </div>
  );
}

// ── Reflection Prompts (saveable) ───────────────────────────

const REFLECTION_QUESTIONS = [
  'What was your best decision on the course today?',
  'Which shot would you want back?',
  'What will you focus on in your next practice session?',
  'Rate your mental game today (1-10). Why?',
];

function ReflectionSection({ roundId }: { roundId: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAnswers(getReflection(roundId));
  }, [roundId]);

  const update = (q: string, val: string) => {
    const next = { ...answers, [q]: val };
    setAnswers(next);
    saveReflection(roundId, next);
  };

  if (!mounted) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-50">Post-Round Reflection</h3>
      <p className="text-xs text-gray-500">Your answers are saved automatically and visible next time you revisit this round.</p>
      <div className="space-y-3">
        {REFLECTION_QUESTIONS.map((q) => (
          <div key={q}>
            <label className="text-xs text-gray-400 block mb-1">{q}</label>
            <textarea
              value={answers[q] ?? ''}
              onChange={e => update(q, e.target.value)}
              placeholder="Type your answer..."
              rows={2}
              className="w-full bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-green-500/40"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Coach Notes ─────────────────────────────────────────────

function CoachNotesSection({ roundId }: { roundId: string }) {
  const [notes, setNotes] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNotes(getCoachNotes(roundId));
  }, [roundId]);

  const update = (val: string) => {
    setNotes(val);
    saveCoachNotes(roundId, val);
  };

  if (!mounted) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
      <h3 className="text-sm font-semibold text-gray-50">Coach / Personal Notes</h3>
      <p className="text-xs text-gray-500">Lesson takeaways, swing thoughts, or course strategy notes.</p>
      <textarea
        value={notes}
        onChange={e => update(e.target.value)}
        placeholder="e.g., Coach said to focus on ball position with irons..."
        rows={4}
        className="w-full bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-green-500/40"
      />
    </div>
  );
}

// ── Round Selector ──────────────────────────────────────────

function RoundSelector({ rounds, holesCache, selectedId, onSelect }: {
  rounds: ReturnType<typeof useRounds>['rounds'];
  holesCache: Map<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const scored = rounds.filter(r => r.total_score != null);

  if (scored.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
        <div className="text-3xl mb-3">⛳</div>
        <h2 className="text-lg font-semibold text-gray-50 mb-2">No Rounds to Debrief Yet</h2>
        <p className="text-sm text-gray-400 mb-4">
          Complete a round with hole-by-hole scoring to unlock detailed insights, strokes gained analysis, and personalized action items.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/play"
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors">
            Score a Round
          </Link>
          <Link href="/rounds"
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
            Add Past Round
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-50">Select a Round to Debrief</h2>
      <p className="text-xs text-gray-500">Choose any scored round for auto-generated analysis and insights.</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {scored.map((r) => {
          const holePar = holesCache.get(r.id);
          const par = holePar ?? (r.holes_played === 18 ? 72 : 36);
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
    </div>
  );
}

// ── Tab Button ──────────────────────────────────────────────

function TabBar({ tab, setTab }: { tab: 'summary' | 'deep-dive' | 'notes'; setTab: (t: 'summary' | 'deep-dive' | 'notes') => void }) {
  const tabs = [
    { key: 'summary' as const, label: 'Summary' },
    { key: 'deep-dive' as const, label: 'Deep Dive' },
    { key: 'notes' as const, label: 'Notes' },
  ];
  return (
    <div className="flex gap-2">
      {tabs.map(t => (
        <button key={t.key} onClick={() => setTab(t.key)}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            tab === t.key ? 'bg-green-600 text-gray-50' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Debrief View ────────────────────────────────────────────

function DebriefView({ debrief, viewMode }: { debrief: RoundDebrief; viewMode: ViewMode }) {
  const [tab, setTab] = useState<'summary' | 'deep-dive' | 'notes'>('summary');
  const { round, analysis, overallVerdict, overallEmoji, insights, actionItems, holeHighlights, scoringPatterns, strengths, improvementAreas, whatIfs, courseHistory } = debrief;
  const score = round.total_score ?? 0;
  const par = analysis.holes.reduce((s, h) => s + h.par, 0) || 72;
  const toPar = score - par;
  const simple = viewMode === 'simple';

  return (
    <div className="space-y-5">
      {/* Overall verdict */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 text-center">
        <div className="text-3xl mb-2">{EMOJI_MAP[overallEmoji] ?? '⛳'}</div>
        <div className="text-2xl font-bold text-gray-50 mb-1">
          {score} <span className={`text-lg ${toPar <= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ({toPar >= 0 ? '+' : ''}{toPar})
          </span>
        </div>
        <div className="text-sm text-gray-300 mb-1">{round.course_name}</div>
        <p className="text-sm text-gray-400 mb-3">{overallVerdict}</p>
        <RoundTagEditor roundId={round.id} />
      </div>

      {/* Tabs */}
      <TabBar tab={tab} setTab={setTab} />

      {/* ── Summary Tab ─────────────────────────────────── */}
      {tab === 'summary' && (
        <div className="space-y-5">
          {/* Course history */}
          {courseHistory && <CourseHistoryCard history={courseHistory} />}

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

          {/* Insights — show top 3 in simple mode */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-50">Key Takeaways</h3>
            {(simple ? insights.slice(0, 3) : insights).map((ins, i) => (
              <InsightCard key={i} insight={ins} simple={simple} />
            ))}
            {insights.length === 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400 mb-1">Not enough data for insights.</p>
                <p className="text-xs text-gray-500">Track putts, fairways hit, and GIR on your scorecard to unlock detailed analysis.</p>
              </div>
            )}
            {simple && insights.length > 3 && (
              <button onClick={() => setTab('deep-dive')}
                className="text-xs text-green-400 hover:text-green-300">
                + {insights.length - 3} more insights in Deep Dive →
              </button>
            )}
          </div>

          {/* Strengths & Focus Areas */}
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
        </div>
      )}

      {/* ── Deep Dive Tab ───────────────────────────────── */}
      {tab === 'deep-dive' && (
        <div className="space-y-5">
          {/* SG breakdown */}
          <SGBarChart analysis={analysis} />

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

          {/* All insights */}
          {insights.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-50">All Insights</h3>
              {insights.map((ins, i) => (
                <InsightCard key={i} insight={ins} simple={false} />
              ))}
            </div>
          )}

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

          {/* What-If */}
          <WhatIfSection whatIfs={whatIfs} actualScore={score} />

          {/* Course history */}
          {courseHistory && <CourseHistoryCard history={courseHistory} />}
        </div>
      )}

      {/* ── Notes Tab ───────────────────────────────────── */}
      {tab === 'notes' && (
        <div className="space-y-5">
          <ReflectionSection roundId={round.id} />
          <CoachNotesSection roundId={round.id} />

          {/* Links to related features */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-50 mb-3">Related</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/rounds', label: 'All Rounds', desc: 'View full scorecard' },
                { href: '/practice/plans', label: 'Practice Plans', desc: 'Build a weekly plan' },
                { href: '/practice/timed', label: 'Timed Drills', desc: 'Quick focused practice' },
                { href: '/goals', label: 'Season Goals', desc: 'Track your targets' },
              ].map(link => (
                <Link key={link.href} href={link.href}
                  className="bg-gray-900 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-750 transition-colors block">
                  <div className="text-sm text-gray-50">{link.label}</div>
                  <div className="text-xs text-gray-500">{link.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function DebriefPage() {
  const { rounds, loading } = useRounds();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const { holes, loading: holesLoading } = useRoundHoles(selectedRoundId);
  const [debrief, setDebrief] = useState<RoundDebrief | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('simple');

  // Calculate actual handicap from all rounds
  const handicapResult = rounds.length > 0 ? calculateHandicap(rounds) : null;
  const handicap = handicapResult?.index ?? null;

  const selectedRound = rounds.find(r => r.id === selectedRoundId);

  const handleSelect = useCallback((id: string) => {
    setSelectedRoundId(id);
    setDebrief(null);
  }, []);

  // Generate debrief when holes load (useEffect, not useMemo)
  useEffect(() => {
    if (selectedRound && holes.length > 0 && !holesLoading) {
      const d = generateDebrief(selectedRound, holes, rounds, handicap);
      setDebrief(d);
    }
  }, [selectedRound, holes, holesLoading, rounds, handicap]);

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
          <p className="text-sm text-gray-400">
            {handicap != null ? `Handicap: ${handicap.toFixed(1)}` : 'Guided reflection with auto-generated insights'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {debrief && (
            <>
              {/* View mode toggle */}
              <button onClick={() => setViewMode(v => v === 'simple' ? 'detailed' : 'simple')}
                className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                title={viewMode === 'simple' ? 'Switch to detailed view with SG data' : 'Switch to simplified view'}>
                {viewMode === 'simple' ? 'Detailed' : 'Simple'}
              </button>
              <button onClick={() => { setSelectedRoundId(null); setDebrief(null); }}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                Change Round
              </button>
            </>
          )}
        </div>
      </div>

      {!debrief && (
        <RoundSelector rounds={rounds} holesCache={new Map()} selectedId={selectedRoundId} onSelect={handleSelect} />
      )}

      {selectedRoundId && holesLoading && (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400 text-sm">Loading hole data...</div>
        </div>
      )}

      {selectedRoundId && !holesLoading && holes.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <div className="text-2xl mb-2">📝</div>
          <h3 className="text-sm font-semibold text-gray-50 mb-1">No Hole-by-Hole Data</h3>
          <p className="text-sm text-gray-400 mb-3">
            This round doesn&apos;t have individual hole scores yet. Add hole data to unlock SG analysis, hole highlights, and what-if scenarios.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/rounds"
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors">
              Edit Round
            </Link>
            <Link href="/play"
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
              Score New Round
            </Link>
          </div>
        </div>
      )}

      {debrief && <DebriefView debrief={debrief} viewMode={viewMode} />}
    </div>
  );
}
