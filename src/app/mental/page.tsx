'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useMentalGameLogs, useRounds } from '@/lib/hooks';
import {
  MENTAL_LOG_TYPES,
  MENTAL_LOG_TYPE_LABELS,
  COMMON_MENTAL_TRIGGERS,
  COMMON_POSITIVE_MOMENTS,
} from '@/lib/types';
import type { MentalGameLog } from '@/lib/types';

export default function MentalGamePage() {
  return (
    <AuthGuard>
      <Nav />
      <MentalGameTracker />
    </AuthGuard>
  );
}

function RatingSelector({ value, onChange, label, color }: { value: number | null; onChange: (v: number) => void; label: string; color: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            onClick={() => onChange(r)}
            className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
              value != null && value >= r ? `${color} text-gray-50` : 'bg-gray-800 text-gray-500'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

function MentalGameTracker() {
  const { logs, loading, addLog, deleteLog } = useMentalGameLogs();
  const { rounds } = useRounds();
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'journal' | 'trends' | 'routine'>('journal');

  // Form state
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logType, setLogType] = useState('journal');
  const [moodRating, setMoodRating] = useState<number>(3);
  const [confidenceRating, setConfidenceRating] = useState<number>(3);
  const [focusRating, setFocusRating] = useState<number>(3);
  const [commitmentLevel, setCommitmentLevel] = useState<number>(3);
  const [preShotRoutine, setPreShotRoutine] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [positives, setPositives] = useState<string[]>([]);
  const [roundId, setRoundId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogType('journal');
    setMoodRating(3);
    setConfidenceRating(3);
    setFocusRating(3);
    setCommitmentLevel(3);
    setPreShotRoutine('');
    setTriggers([]);
    setPositives([]);
    setRoundId('');
    setNotes('');
  };

  const handleSubmit = async () => {
    await addLog({
      log_date: logDate,
      log_type: logType,
      mood_rating: moodRating,
      confidence_rating: confidenceRating,
      focus_rating: focusRating,
      commitment_level: commitmentLevel,
      pre_shot_routine: preShotRoutine || null,
      mental_triggers: triggers,
      positive_moments: positives,
      round_id: roundId || null,
      notes: notes || null,
    });
    resetForm();
    setShowForm(false);
  };

  const toggleTrigger = (t: string) => {
    setTriggers((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };
  const togglePositive = (p: string) => {
    setPositives((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  // Trend data
  const trends = useMemo(() => {
    if (logs.length < 2) return null;
    const recent = logs.slice(0, 20).reverse();
    const avgMood = recent.filter((l) => l.mood_rating).reduce((s, l) => s + l.mood_rating!, 0) / recent.filter((l) => l.mood_rating).length || 0;
    const avgConfidence = recent.filter((l) => l.confidence_rating).reduce((s, l) => s + l.confidence_rating!, 0) / recent.filter((l) => l.confidence_rating).length || 0;
    const avgFocus = recent.filter((l) => l.focus_rating).reduce((s, l) => s + l.focus_rating!, 0) / recent.filter((l) => l.focus_rating).length || 0;
    const avgCommitment = recent.filter((l) => l.commitment_level).reduce((s, l) => s + l.commitment_level!, 0) / recent.filter((l) => l.commitment_level).length || 0;

    // Common triggers
    const triggerCounts: Record<string, number> = {};
    const positiveCounts: Record<string, number> = {};
    for (const l of logs) {
      for (const t of l.mental_triggers) triggerCounts[t] = (triggerCounts[t] || 0) + 1;
      for (const p of l.positive_moments) positiveCounts[p] = (positiveCounts[p] || 0) + 1;
    }

    return {
      avgMood, avgConfidence, avgFocus, avgCommitment,
      topTriggers: Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topPositives: Object.entries(positiveCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      entries: recent,
    };
  }, [logs]);

  // Most recent pre-shot routine
  const latestRoutine = useMemo(() => {
    return logs.find((l) => l.pre_shot_routine)?.pre_shot_routine || null;
  }, [logs]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Mental Game</h1>
          <p className="text-sm text-gray-500">Journal, routines & mental performance tracking</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-gray-50 text-sm font-medium rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-6">
        {(['journal', 'trends', 'routine'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              view === v ? 'bg-gray-700 text-gray-50' : 'text-gray-400 hover:text-gray-50 hover:bg-gray-800'
            }`}
          >
            {v === 'journal' ? 'Journal' : v === 'trends' ? 'Trends' : 'My Routine'}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-50">Mental Game Check-In</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={logType}
                onChange={(e) => setLogType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
              >
                {MENTAL_LOG_TYPES.map((t) => (
                  <option key={t} value={t}>{MENTAL_LOG_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {(logType === 'post_round' || logType === 'pre_round') && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Linked Round</label>
                <select
                  value={roundId}
                  onChange={(e) => setRoundId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
                >
                  <option value="">None</option>
                  {rounds.slice(0, 10).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.round_date} - {r.course_name} ({r.total_score || '?'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Ratings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <RatingSelector value={moodRating} onChange={setMoodRating} label="Mood" color="bg-blue-600" />
            <RatingSelector value={confidenceRating} onChange={setConfidenceRating} label="Confidence" color="bg-green-600" />
            <RatingSelector value={focusRating} onChange={setFocusRating} label="Focus" color="bg-purple-600" />
            <RatingSelector value={commitmentLevel} onChange={setCommitmentLevel} label="Commitment" color="bg-orange-600" />
          </div>

          {/* Pre-shot routine */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Pre-Shot Routine</label>
            <textarea
              value={preShotRoutine}
              onChange={(e) => setPreShotRoutine(e.target.value)}
              rows={2}
              placeholder="Describe your pre-shot routine (e.g., deep breath, pick target, one practice swing, step in, go)"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
            />
          </div>

          {/* Mental triggers */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Mental Triggers (what caused lapses)</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MENTAL_TRIGGERS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTrigger(t)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    triggers.includes(t)
                      ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Positive moments */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Positive Moments (what went well)</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_POSITIVE_MOMENTS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePositive(p)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    positives.includes(p)
                      ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="How you felt, what you learned, what to work on..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-2 bg-green-600 hover:bg-green-500 text-gray-50 text-sm font-medium rounded-lg transition-colors"
          >
            Save Entry
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-600 py-12 text-sm">Loading...</div>
      ) : view === 'journal' ? (
        /* Journal entries */
        logs.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-sm">No mental game entries yet</p>
            <p className="text-xs mt-1">Start journaling to build mental toughness</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((l) => (
              <LogCard key={l.id} log={l} onDelete={() => deleteLog(l.id)} />
            ))}
          </div>
        )
      ) : view === 'trends' ? (
        /* Trends */
        !trends ? (
          <div className="text-center text-gray-600 py-12 text-sm">Log at least 2 entries to see trends</div>
        ) : (
          <div className="space-y-4">
            {/* Average ratings */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <TrendCard label="Avg Mood" value={trends.avgMood} color="text-blue-400" />
              <TrendCard label="Avg Confidence" value={trends.avgConfidence} color="text-green-400" />
              <TrendCard label="Avg Focus" value={trends.avgFocus} color="text-purple-400" />
              <TrendCard label="Avg Commitment" value={trends.avgCommitment} color="text-orange-400" />
            </div>

            {/* Mini chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-50 mb-3">Recent Confidence Trend</h3>
              <div className="flex items-end gap-1 h-20">
                {trends.entries.map((e, i) => {
                  const val = e.confidence_rating ?? 3;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-gray-500">{val}</span>
                      <div
                        className="w-full bg-green-500/40 rounded-t"
                        style={{ height: `${(val / 5) * 100}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Top triggers */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-50 mb-3">Most Common Triggers</h3>
                {trends.topTriggers.length === 0 ? (
                  <p className="text-xs text-gray-500">No triggers recorded</p>
                ) : (
                  <div className="space-y-1.5">
                    {trends.topTriggers.map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-xs text-red-400">{name}</span>
                        <span className="text-xs text-gray-500">{count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top positives */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-50 mb-3">Strengths</h3>
                {trends.topPositives.length === 0 ? (
                  <p className="text-xs text-gray-500">No positives recorded</p>
                ) : (
                  <div className="space-y-1.5">
                    {trends.topPositives.map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-xs text-green-400">{name}</span>
                        <span className="text-xs text-gray-500">{count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        /* My Routine view */
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-medium text-gray-50 mb-3">My Pre-Shot Routine</h3>
            {latestRoutine ? (
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-50 whitespace-pre-wrap">{latestRoutine}</p>
                <p className="text-[10px] text-gray-500 mt-2">From your most recent entry with a routine</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No pre-shot routine recorded yet. Add one in your next journal entry.</p>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-medium text-gray-50 mb-3">Mental Game Checklist</h3>
            <div className="space-y-2">
              {[
                'Accept that bad shots happen — respond, don\'t react',
                'Commit fully to every shot before stepping in',
                'Focus on the process, not the score',
                'Stay in the present — one shot at a time',
                'Deep breath before every shot',
                'Visualize the ball flight before swinging',
                'Play to your strengths, not hero shots',
                'Enjoy the walk between shots',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-green-400 mt-0.5">&#10003;</span>
                  <span className="text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogCard({ log, onDelete }: { log: MentalGameLog; onDelete: () => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-50">{log.log_date}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
            {MENTAL_LOG_TYPE_LABELS[log.log_type] || log.log_type}
          </span>
        </div>
        <button onClick={onDelete} className="text-xs text-gray-500 hover:text-red-400">Delete</button>
      </div>

      {/* Ratings row */}
      <div className="flex gap-4 mb-2">
        {log.mood_rating && <RatingBadge label="Mood" value={log.mood_rating} color="text-blue-400" />}
        {log.confidence_rating && <RatingBadge label="Confidence" value={log.confidence_rating} color="text-green-400" />}
        {log.focus_rating && <RatingBadge label="Focus" value={log.focus_rating} color="text-purple-400" />}
        {log.commitment_level && <RatingBadge label="Commitment" value={log.commitment_level} color="text-orange-400" />}
      </div>

      {/* Triggers */}
      {log.mental_triggers.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {log.mental_triggers.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{t}</span>
          ))}
        </div>
      )}

      {/* Positives */}
      {log.positive_moments.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {log.positive_moments.map((p) => (
            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">{p}</span>
          ))}
        </div>
      )}

      {log.notes && <p className="text-xs text-gray-500 mt-2">{log.notes}</p>}
    </div>
  );
}

function RatingBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-bold ${color}`}>{value}/5</div>
      <div className="text-[9px] text-gray-500">{label}</div>
    </div>
  );
}

function TrendCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold ${color} mt-1`}>{value.toFixed(1)}<span className="text-sm font-normal text-gray-500">/5</span></div>
    </div>
  );
}
