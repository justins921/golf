'use client';

import { useState, useMemo } from 'react';
import {
  generatePracticePlan,
  type PracticePlan,
  type PracticePlanConfig,
  type WeeklyHours,
  type PlanLength,
  type SkillLevel,
  type SGWeakness,
  type PracticePlanDay,
  type PracticePlanBlock,
} from '@/lib/practicePlan';
import { useRounds, useSeasonGoals } from '@/lib/hooks';
import type { Round, SeasonGoal, GoalMetric } from '@/lib/types';
import { GOAL_METRIC_LABELS } from '@/lib/types';

// ── Weakness Detection from Round Stats ─────────────────────

function extractWeaknesses(rounds: Round[]): SGWeakness[] {
  const recent = rounds.filter(r => r.total_score != null).slice(0, 10);
  if (recent.length === 0) return [];

  // Compute averages
  const avgPutts = recent.filter(r => r.total_putts != null)
    .reduce((s, r) => s + r.total_putts!, 0) / (recent.filter(r => r.total_putts != null).length || 1);
  const avgGirPct = recent.filter(r => r.total_gir != null)
    .reduce((s, r) => s + (r.total_gir! / r.holes_played), 0) / (recent.filter(r => r.total_gir != null).length || 1);
  const avgFirPct = recent.filter(r => r.total_fairways_hit != null && r.total_fairways != null && r.total_fairways > 0)
    .reduce((s, r) => s + (r.total_fairways_hit! / r.total_fairways!), 0) / (recent.filter(r => r.total_fairways_hit != null && r.total_fairways != null && r.total_fairways > 0).length || 1);
  const avgPenalties = recent.reduce((s, r) => s + r.total_penalties, 0) / recent.length;

  // Estimate SG-like values (negative = losing strokes vs bogey golfer baseline)
  // Baselines for ~15 HI: 34.5 putts, 25% GIR, 38% FIR, 1.5 penalties
  const weaknesses: SGWeakness[] = [];

  if (recent.some(r => r.total_putts != null)) {
    const puttingSG = (34.5 - avgPutts) * 0.8; // positive if fewer putts than baseline
    weaknesses.push({ category: 'putting', sgPerRound: puttingSG });
  }

  if (recent.some(r => r.total_gir != null)) {
    const approachSG = (avgGirPct - 0.25) * 8; // GIR% strongly correlates to approach SG
    weaknesses.push({ category: 'approach', sgPerRound: approachSG });
  }

  if (recent.some(r => r.total_fairways_hit != null)) {
    const ottSG = (avgFirPct - 0.38) * 4 - avgPenalties * 0.5;
    weaknesses.push({ category: 'off_the_tee', sgPerRound: ottSG });
  }

  // Short game: estimate from scoring gaps (score minus expected from putting + approach)
  const avgScore = recent.reduce((s, r) => s + (r.total_score ?? 0), 0) / recent.length;
  const shortGameSG = -(avgScore - 90) * 0.15; // rough proxy
  weaknesses.push({ category: 'short_game', sgPerRound: shortGameSG });

  weaknesses.sort((a, b) => a.sgPerRound - b.sgPerRound);
  return weaknesses;
}

// ── Category Icons ──────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    putting: 'bg-green-500/10 text-green-400 border-green-500/20',
    short_game: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    wedges: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    full_swing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    warmup: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    cooldown: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    random: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  };
  const labels: Record<string, string> = {
    putting: 'Putting',
    short_game: 'Short Game',
    wedges: 'Wedges',
    full_swing: 'Full Swing',
    warmup: 'Warmup',
    cooldown: 'Cooldown',
    random: 'Random',
  };

  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${colors[category] ?? colors.random}`}>
      {labels[category] ?? category}
    </span>
  );
}

function IntensityDot({ intensity }: { intensity: string }) {
  const color = intensity === 'high' ? 'bg-red-400' : intensity === 'medium' ? 'bg-amber-400' : 'bg-green-400';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

// ── Block Card ──────────────────────────────────────────────

function BlockCard({ block }: { block: PracticePlanBlock }) {
  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-3 flex gap-3">
      <div className="text-center min-w-[40px]">
        <div className="text-lg font-bold text-gray-50">{block.minutes}</div>
        <div className="text-[10px] text-gray-500">min</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-50">{block.name}</span>
          <IntensityDot intensity={block.intensity} />
          <CategoryBadge category={block.category} />
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{block.description}</p>
        {block.reps && (
          <p className="text-xs text-blue-400 mt-1">{block.reps}</p>
        )}
      </div>
    </div>
  );
}

// ── Day Card ────────────────────────────────────────────────

function DayCard({ day, dayIndex }: { day: PracticePlanDay; dayIndex: number }) {
  const [expanded, setExpanded] = useState(dayIndex === 0);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold">
            {day.day.slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-50">{day.day}</div>
            <div className="text-xs text-gray-400">{day.focus}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300 font-medium">{day.totalMinutes} min</span>
          <svg className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {day.blocks.map((block, i) => (
            <BlockCard key={i} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Config Form ─────────────────────────────────────────────

// Map goal metrics to practice categories for relevance
const GOAL_PRACTICE_MAP: Partial<Record<GoalMetric, string[]>> = {
  gir_pct: ['approach', 'full_swing', 'wedges'],
  fir_pct: ['off_the_tee', 'full_swing'],
  putts_per_round: ['putting'],
  scoring_avg: ['short_game', 'putting', 'wedges'],
  best_score: ['short_game', 'putting', 'wedges'],
  handicap_index: ['short_game', 'putting', 'wedges', 'full_swing'],
  speed_max: ['full_swing'],
};

function ConfigForm({ onGenerate, weaknesses, goals }: {
  onGenerate: (config: PracticePlanConfig) => void;
  weaknesses: SGWeakness[];
  goals: SeasonGoal[];
}) {
  const [hours, setHours] = useState<WeeklyHours>(3);
  const [length, setLength] = useState<PlanLength>(2);
  const [level, setLevel] = useState<SkillLevel>('intermediate');
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(
    () => goals.filter(g => !g.achieved_at).slice(0, 3).map(g => g.id)
  );

  const toggleGoal = (id: string) => {
    setSelectedGoalIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const facilities: PracticePlanConfig['availableFacilities'] = ['range', 'putting_green', 'short_game_area'];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 space-y-5">
      <h2 className="text-base font-semibold text-gray-50">Generate Your Plan</h2>

      {/* Weekly hours */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Weekly Practice Time</label>
        <div className="flex flex-wrap gap-2">
          {([2, 3, 5, 7, 10] as WeeklyHours[]).map((h) => (
            <button key={h} onClick={() => setHours(h)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                hours === h ? 'bg-green-600 text-gray-50' : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}>
              {h}h/week
            </button>
          ))}
        </div>
      </div>

      {/* Plan length */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Plan Duration</label>
        <div className="flex gap-2">
          {([1, 2, 4] as PlanLength[]).map((l) => (
            <button key={l} onClick={() => setLength(l)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                length === l ? 'bg-blue-600 text-gray-50' : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}>
              {l} week{l > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Skill level */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Skill Level</label>
        <div className="flex gap-2">
          {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((l) => (
            <button key={l} onClick={() => setLevel(l)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                level === l ? 'bg-purple-600 text-gray-50' : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Season Goals */}
      {goals.filter(g => !g.achieved_at).length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-2">Your Goals (select to prioritize)</label>
          <div className="flex flex-wrap gap-2">
            {goals.filter(g => !g.achieved_at).map((g) => (
              <button
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  selectedGoalIds.includes(g.id)
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                    : 'bg-gray-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                {g.title}
                <span className="text-gray-500 ml-1">({GOAL_METRIC_LABELS[g.metric as GoalMetric] || g.metric})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SG insights */}
      {weaknesses.length > 0 && (
        <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2">Detected from your rounds (auto-applied)</div>
          <div className="flex flex-wrap gap-2">
            {weaknesses.map((w) => (
              <div key={w.category} className={`text-xs px-2 py-1 rounded ${
                w.sgPerRound < -1 ? 'bg-red-500/10 text-red-400' :
                w.sgPerRound < 0 ? 'bg-amber-500/10 text-amber-400' :
                'bg-green-500/10 text-green-400'
              }`}>
                {w.category.replace('_', ' ')} {w.sgPerRound >= 0 ? '+' : ''}{w.sgPerRound.toFixed(1)}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => {
          const selectedGoals = goals.filter(g => selectedGoalIds.includes(g.id));
          const goalTitles = selectedGoals.map(g => g.title);

          // Boost weaknesses based on selected goals
          const boostedWeaknesses = [...weaknesses];
          for (const goal of selectedGoals) {
            const relatedCategories = GOAL_PRACTICE_MAP[goal.metric as GoalMetric] ?? [];
            for (const cat of relatedCategories) {
              const existing = boostedWeaknesses.find(w => w.category === cat);
              if (existing) {
                // Boost priority of goal-related categories
                existing.sgPerRound -= 0.5;
              } else {
                boostedWeaknesses.push({ category: cat as SGWeakness['category'], sgPerRound: -0.5 });
              }
            }
          }
          boostedWeaknesses.sort((a, b) => a.sgPerRound - b.sgPerRound);

          onGenerate({
            weeklyHours: hours, planLength: length, level,
            weaknesses: boostedWeaknesses,
            availableFacilities: facilities,
            goals: goalTitles,
          });
        }}
        className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 text-gray-50 text-sm font-medium rounded-lg transition-colors"
      >
        Generate Practice Plan
      </button>
    </div>
  );
}

// ── Plan View ───────────────────────────────────────────────

function PlanView({ plan, onReset }: { plan: PracticePlan; onReset: () => void }) {
  const [activeWeek, setActiveWeek] = useState(0);
  const week = plan.weeks[activeWeek];

  // Compute category breakdown for the visual bar
  const catColors: Record<string, string> = {
    putting: '#22c55e',
    short_game: '#f59e0b',
    wedges: '#3b82f6',
    full_swing: '#8b5cf6',
    warmup: '#6b7280',
    cooldown: '#6b7280',
  };

  const weekBreakdown = Object.entries(week.focusBreakdown)
    .filter(([cat]) => cat !== 'warmup' && cat !== 'cooldown')
    .sort((a, b) => b[1] - a[1]);
  const weekPracticeMinutes = weekBreakdown.reduce((s, [, m]) => s + m, 0);

  return (
    <div className="space-y-6">
      {/* Plan header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-50">{plan.title}</h2>
          <p className="text-sm text-gray-400">
            {plan.config.weeklyHours}h/week &middot; {plan.config.level} &middot; {plan.totalMinutes} min total
          </p>
        </div>
        <button onClick={onReset}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
          New Plan
        </button>
      </div>

      {/* Insights */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
        {plan.insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="text-green-400 mt-0.5">
              {i === 0 ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </span>
            <span className="text-gray-300">{insight}</span>
          </div>
        ))}
      </div>

      {/* Week tabs */}
      {plan.weeks.length > 1 && (
        <div className="flex gap-2">
          {plan.weeks.map((w, i) => (
            <button key={i} onClick={() => setActiveWeek(i)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeWeek === i ? 'bg-green-600 text-gray-50' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}>
              Week {w.weekNumber}
            </button>
          ))}
        </div>
      )}

      {/* Week header */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-50">
              Week {week.weekNumber}: {week.theme}
            </h3>
            <p className="text-xs text-gray-400">{week.weeklyMinutes} min across {week.days.length} sessions</p>
          </div>
        </div>

        {/* Category breakdown bar */}
        <div className="h-3 bg-gray-900 rounded-full overflow-hidden flex">
          {weekBreakdown.map(([cat, mins]) => (
            <div
              key={cat}
              className="h-full"
              style={{
                width: `${(mins / weekPracticeMinutes) * 100}%`,
                backgroundColor: catColors[cat] ?? '#6b7280',
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {weekBreakdown.map(([cat, mins]) => (
            <div key={cat} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColors[cat] ?? '#6b7280' }} />
              <span className="text-gray-400">{cat.replace('_', ' ')}</span>
              <span className="text-gray-300 font-medium">{mins}m</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day cards */}
      <div className="space-y-3">
        {week.days.map((day, i) => (
          <DayCard key={`${activeWeek}-${i}`} day={day} dayIndex={i} />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function PracticePlansPage() {
  const { rounds, loading } = useRounds();
  const { goals, loading: goalsLoading } = useSeasonGoals();
  const [plan, setPlan] = useState<PracticePlan | null>(null);

  const weaknesses = useMemo(() => {
    if (loading || rounds.length === 0) return [];
    return extractWeaknesses(rounds);
  }, [rounds, loading]);

  const handleGenerate = (config: PracticePlanConfig) => {
    const generated = generatePracticePlan(config);

    // Add goal-specific insights
    if (config.goals.length > 0) {
      generated.insights.unshift(`Plan tailored for: ${config.goals.join(', ')}`);
    }

    setPlan(generated);
  };

  if (loading || goalsLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-500 text-sm">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-50">Practice Plan Generator</h1>
        <p className="text-sm text-gray-400">
          Weekly plans based on your goals, SG data, skill level, and available time
        </p>
      </div>

      {plan ? (
        <PlanView plan={plan} onReset={() => setPlan(null)} />
      ) : (
        <ConfigForm onGenerate={handleGenerate} weaknesses={weaknesses} goals={goals} />
      )}
    </div>
  );
}
