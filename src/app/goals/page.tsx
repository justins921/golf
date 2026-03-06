'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useRounds, useSeasonGoals, useAllSpeedReadings, useLessons } from '@/lib/hooks';
import { usePracticeSessions } from '@/lib/practice/hooks';
import { calculateHandicap } from '@/lib/handicap';
import type { SeasonGoal, GoalMetric, Round, Lesson } from '@/lib/types';
import { GOAL_METRIC_LABELS, GOAL_METRIC_DIRECTION, LESSON_TYPE_LABELS } from '@/lib/types';

// Map goal metrics to relevant lesson focus areas for matching
const GOAL_LESSON_RELEVANCE: Partial<Record<GoalMetric, string[]>> = {
  gir_pct: ['Alignment', 'Ball Position', 'Impact', 'Trajectory Control', 'Shot Shaping'],
  fir_pct: ['Takeaway', 'Backswing', 'Tempo', 'Alignment', 'Hip Rotation'],
  putts_per_round: ['Putting Stroke', 'Green Reading'],
  scoring_avg: ['Course Management', 'Chipping', 'Pitching', 'Bunker Play'],
  best_score: ['Course Management', 'Chipping', 'Pitching', 'Bunker Play'],
  handicap_index: ['Impact', 'Weight Transfer', 'Course Management', 'Tempo'],
  speed_max: ['Hip Rotation', 'Shoulder Turn', 'Weight Transfer', 'Transition', 'Downswing'],
};

export default function GoalsPage() {
  return (
    <AuthGuard>
      <Nav />
      <SeasonGoals />
    </AuthGuard>
  );
}

// ============================================================
// Compute current values from round/practice/speed data
// ============================================================

function useCurrentValues(rounds: Round[]) {
  const { readings } = useAllSpeedReadings();
  const { sessions: practiceSessions } = usePracticeSessions();

  return useMemo(() => {
    const scored = rounds.filter((r) => r.total_score != null && r.holes_played >= 18);
    const values: Record<GoalMetric, number | null> = {
      scoring_avg: scored.length > 0
        ? scored.reduce((s, r) => s + r.total_score!, 0) / scored.length
        : null,
      best_score: scored.length > 0
        ? Math.min(...scored.map((r) => r.total_score!))
        : null,
      handicap_index: calculateHandicap(rounds).index,
      gir_pct: (() => {
        const withGir = scored.filter((r) => r.total_gir != null);
        if (withGir.length === 0) return null;
        return withGir.reduce((s, r) => s + (r.total_gir! / r.holes_played) * 100, 0) / withGir.length;
      })(),
      fir_pct: (() => {
        const withFir = scored.filter((r) => r.total_fairways_hit != null && r.total_fairways != null && r.total_fairways! > 0);
        if (withFir.length === 0) return null;
        return withFir.reduce((s, r) => s + (r.total_fairways_hit! / r.total_fairways!) * 100, 0) / withFir.length;
      })(),
      putts_per_round: (() => {
        const withPutts = scored.filter((r) => r.total_putts != null);
        if (withPutts.length === 0) return null;
        return withPutts.reduce((s, r) => s + r.total_putts!, 0) / withPutts.length;
      })(),
      rounds_played: scored.length,
      practice_sessions: practiceSessions.length,
      speed_max: readings.length > 0
        ? Math.max(...readings.filter((r) => r.clubhead_speed_mph != null).map((r) => r.clubhead_speed_mph!))
        : null,
      custom: null,
    };
    return values;
  }, [rounds, readings, practiceSessions]);
}

// ============================================================
// Main component
// ============================================================

function SeasonGoals() {
  const { rounds, loading: roundsLoading } = useRounds();
  const { goals, loading: goalsLoading, addGoal, updateGoal, deleteGoal } = useSeasonGoals();
  const { lessons } = useLessons();
  const currentValues = useCurrentValues(rounds);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [season, setSeason] = useState('2026');

  // New goal form
  const [newTitle, setNewTitle] = useState('');
  const [newMetric, setNewMetric] = useState<GoalMetric>('scoring_avg');
  const [newTarget, setNewTarget] = useState('');
  const [newStartValue, setNewStartValue] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const loading = roundsLoading || goalsLoading;

  const filteredGoals = useMemo(
    () => goals.filter((g) => g.season === season),
    [goals, season]
  );

  const achievedCount = filteredGoals.filter((g) => g.achieved_at != null).length;

  const handleCreateGoal = async () => {
    if (!newTitle || !newTarget) return;
    const startVal = newStartValue ? parseFloat(newStartValue) : currentValues[newMetric];
    await addGoal({
      title: newTitle,
      metric: newMetric,
      target_value: parseFloat(newTarget),
      start_value: startVal,
      season,
      notes: newNotes || null,
    });
    setShowNewGoal(false);
    setNewTitle('');
    setNewMetric('scoring_avg');
    setNewTarget('');
    setNewStartValue('');
    setNewNotes('');
  };

  const handleToggleAchieved = async (goal: SeasonGoal) => {
    if (goal.achieved_at) {
      await updateGoal(goal.id, { achieved_at: null });
    } else {
      await updateGoal(goal.id, { achieved_at: new Date().toISOString() });
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-gray-50 tracking-tight">Season Goals</h1>
          <p className="text-sm text-gray-500 mt-1">
            {achievedCount}/{filteredGoals.length} achieved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="px-4 py-3 text-[15px] bg-gray-800 border-0 rounded-xl text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <button
            onClick={() => setShowNewGoal(true)}
            className="px-4 py-1.5 text-sm bg-green-500 hover:bg-green-400 text-white rounded-xl"
          >
            + New Goal
          </button>
        </div>
      </div>

      {/* Overall progress */}
      {filteredGoals.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Season Progress</span>
            <span className="text-sm font-medium text-gray-50">
              {filteredGoals.length > 0 ? Math.round((achievedCount / filteredGoals.length) * 100) : 0}%
            </span>
          </div>
          <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${filteredGoals.length > 0 ? (achievedCount / filteredGoals.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* New goal form */}
      {showNewGoal && (
        <div className="bg-gray-900 rounded-2xl p-5 mb-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">New Goal</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Goal Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Break 90"
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Metric</label>
              <select
                value={newMetric}
                onChange={(e) => {
                  const m = e.target.value as GoalMetric;
                  setNewMetric(m);
                  // Auto-fill current value as start
                  const cv = currentValues[m];
                  if (cv != null) setNewStartValue(cv.toFixed(1));
                }}
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              >
                {(Object.keys(GOAL_METRIC_LABELS) as GoalMetric[]).map((m) => (
                  <option key={m} value={m}>{GOAL_METRIC_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Target {GOAL_METRIC_DIRECTION[newMetric] === 'lower' ? '(lower is better)' : '(higher is better)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder={GOAL_METRIC_DIRECTION[newMetric] === 'lower' ? '89' : '50'}
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Starting Value</label>
              <input
                type="number"
                step="0.1"
                value={newStartValue}
                onChange={(e) => setNewStartValue(e.target.value)}
                placeholder="Current"
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
          </div>

          {currentValues[newMetric] != null && (
            <div className="text-xs text-gray-500">
              Current value: <span className="text-blue-400">{formatValue(newMetric, currentValues[newMetric]!)}</span>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes (optional)</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateGoal}
              disabled={!newTitle || !newTarget}
              className="px-4 py-1.5 text-sm bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-xl"
            >
              Create Goal
            </button>
            <button
              onClick={() => setShowNewGoal(false)}
              className="px-4 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-xl"
            >
              Cancel
            </button>
          </div>

          {/* Preset suggestions */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick presets</div>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.title}
                  onClick={() => {
                    setNewTitle(p.title);
                    setNewMetric(p.metric);
                    setNewTarget(String(p.target));
                    const cv = currentValues[p.metric];
                    if (cv != null) setNewStartValue(cv.toFixed(1));
                  }}
                  className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals list */}
      {filteredGoals.length === 0 && !showNewGoal && (
        <div className="text-center py-16">
          <div className="text-[15px] text-gray-400 mb-4">No goals set for {season} yet.</div>
          <button
            onClick={() => setShowNewGoal(true)}
            className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 text-white rounded-xl"
          >
            Set Your First Goal
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filteredGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            currentValue={currentValues[goal.metric]}
            lessons={lessons}
            onToggleAchieved={() => handleToggleAchieved(goal)}
            onDelete={() => deleteGoal(goal.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Goal Card
// ============================================================

function GoalCard({
  goal,
  currentValue,
  lessons,
  onToggleAchieved,
  onDelete,
}: {
  goal: SeasonGoal;
  currentValue: number | null;
  lessons: Lesson[];
  onToggleAchieved: () => void;
  onDelete: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const direction = GOAL_METRIC_DIRECTION[goal.metric as GoalMetric] ?? 'higher';
  const achieved = goal.achieved_at != null;

  // Find lessons relevant to this goal
  const relevantFocusAreas = GOAL_LESSON_RELEVANCE[goal.metric as GoalMetric] ?? [];
  const relatedLessons = useMemo(() => {
    if (relevantFocusAreas.length === 0) return [];
    return lessons
      .filter(l => l.focus_areas.some(f => relevantFocusAreas.includes(f)))
      .slice(0, 3);
  }, [lessons, relevantFocusAreas]);

  // Calculate progress
  const startVal = goal.start_value ?? currentValue ?? 0;
  const progress = computeProgress(startVal, goal.target_value, currentValue, direction);
  const autoAchieved = currentValue != null && (
    direction === 'lower' ? currentValue <= goal.target_value : currentValue >= goal.target_value
  );

  // Status color
  let statusColor = 'text-gray-400';
  let barColor = 'bg-blue-500';
  if (achieved || autoAchieved) {
    statusColor = 'text-green-400';
    barColor = 'bg-green-500';
  } else if (progress >= 75) {
    statusColor = 'text-yellow-400';
    barColor = 'bg-yellow-500';
  } else if (progress >= 50) {
    barColor = 'bg-blue-500';
  }

  return (
    <div
      className={`bg-gray-900 rounded-2xl overflow-hidden transition-colors ${
        achieved || autoAchieved
          ? 'bg-green-500/5'
          : ''
      }`}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => setShowDetail(!showDetail)}
      >
        <div className="flex items-center gap-3">
          {/* Achievement checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAchieved(); }}
            className={`w-6 h-6 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
              achieved || autoAchieved
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            {(achieved || autoAchieved) && (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-medium ${achieved || autoAchieved ? 'text-green-400' : 'text-gray-50'}`}>
                {goal.title}
              </h3>
              <div className="flex items-center gap-2 ml-2">
                {currentValue != null && (
                  <span className={`text-sm font-mono ${statusColor}`}>
                    {formatValue(goal.metric as GoalMetric, currentValue)}
                  </span>
                )}
                <span className="text-xs text-gray-600">/</span>
                <span className="text-sm font-mono text-gray-400">
                  {formatValue(goal.metric as GoalMetric, goal.target_value)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`${barColor} h-full rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">
                {GOAL_METRIC_LABELS[goal.metric as GoalMetric] ?? goal.metric}
              </span>
              <span className="text-xs text-gray-500">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {showDetail && (
        <div className="border-t border-gray-800 p-4 space-y-2">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-gray-500 uppercase">Start</div>
              <div className="text-sm font-mono text-gray-400">
                {goal.start_value != null ? formatValue(goal.metric as GoalMetric, goal.start_value) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Current</div>
              <div className={`text-sm font-mono ${statusColor}`}>
                {currentValue != null ? formatValue(goal.metric as GoalMetric, currentValue) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Target</div>
              <div className="text-sm font-mono text-gray-50">
                {formatValue(goal.metric as GoalMetric, goal.target_value)}
              </div>
            </div>
          </div>

          {goal.notes && (
            <p className="text-xs text-gray-500">{goal.notes}</p>
          )}

          {achieved && goal.achieved_at && (
            <div className="text-xs text-green-400">
              Achieved on {new Date(goal.achieved_at).toLocaleDateString()}
            </div>
          )}

          {/* Related lessons */}
          {relatedLessons.length > 0 && (
            <div className="border-t border-gray-800 pt-2 mt-2">
              <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
                Related Lessons
              </div>
              <div className="space-y-1">
                {relatedLessons.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="text-gray-500">{l.lesson_date}</span>
                    <span className="text-gray-300">
                      {LESSON_TYPE_LABELS[l.lesson_type] || l.lesson_type}
                    </span>
                    {l.coach_name && <span className="text-gray-500">w/ {l.coach_name}</span>}
                    {l.focus_areas.filter(f => relevantFocusAreas.includes(f)).map(f => (
                      <span key={f} className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">
                        {f}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested focus areas for next lesson */}
          {!achieved && relevantFocusAreas.length > 0 && (
            <div className="border-t border-gray-800 pt-2 mt-2">
              <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                Suggested lesson focus
              </div>
              <div className="flex flex-wrap gap-1">
                {relevantFocusAreas.map(f => (
                  <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onDelete}
              className="text-xs text-gray-600 hover:text-red-400"
            >
              Delete goal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function computeProgress(
  start: number,
  target: number,
  current: number | null,
  direction: 'lower' | 'higher',
): number {
  if (current == null) return 0;
  const totalRange = Math.abs(target - start);
  if (totalRange === 0) return current === target ? 100 : 0;

  if (direction === 'lower') {
    // Lower is better: start=96, current=92, target=89
    const improved = start - current;
    const needed = start - target;
    return (improved / needed) * 100;
  } else {
    // Higher is better: start=30, current=40, target=50
    const improved = current - start;
    const needed = target - start;
    return (improved / needed) * 100;
  }
}

function formatValue(metric: GoalMetric, value: number): string {
  switch (metric) {
    case 'scoring_avg':
    case 'handicap_index':
    case 'putts_per_round':
      return value.toFixed(1);
    case 'best_score':
    case 'rounds_played':
    case 'practice_sessions':
      return Math.round(value).toString();
    case 'gir_pct':
    case 'fir_pct':
      return `${value.toFixed(0)}%`;
    case 'speed_max':
      return `${value.toFixed(1)}`;
    case 'custom':
      return value.toFixed(1);
    default:
      return value.toFixed(1);
  }
}

const PRESETS: { title: string; metric: GoalMetric; target: number }[] = [
  { title: 'Break 90', metric: 'best_score', target: 89 },
  { title: 'Break 80', metric: 'best_score', target: 79 },
  { title: 'Scoring Average Under 90', metric: 'scoring_avg', target: 89.9 },
  { title: 'Single-Digit Handicap', metric: 'handicap_index', target: 9.9 },
  { title: 'Hit 50% GIR', metric: 'gir_pct', target: 50 },
  { title: 'Hit 60% Fairways', metric: 'fir_pct', target: 60 },
  { title: 'Under 32 Putts', metric: 'putts_per_round', target: 32 },
  { title: 'Play 20 Rounds', metric: 'rounds_played', target: 20 },
  { title: '30 Practice Sessions', metric: 'practice_sessions', target: 30 },
  { title: '110+ MPH CHS', metric: 'speed_max', target: 110 },
];
