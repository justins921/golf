'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useLessons, useSeasonGoals } from '@/lib/hooks';
import {
  LESSON_TYPES,
  LESSON_TYPE_LABELS,
  LESSON_FOCUS_AREAS,
  GOAL_METRIC_LABELS,
} from '@/lib/types';
import type { Lesson, DrillAssignment, GoalMetric } from '@/lib/types';

// Map goal metrics to suggested lesson focus areas
const GOAL_FOCUS_MAP: Partial<Record<GoalMetric, string[]>> = {
  gir_pct: ['Alignment', 'Ball Position', 'Impact', 'Trajectory Control'],
  fir_pct: ['Takeaway', 'Backswing', 'Tempo', 'Alignment'],
  putts_per_round: ['Putting Stroke', 'Green Reading'],
  scoring_avg: ['Course Management', 'Chipping', 'Pitching'],
  best_score: ['Course Management', 'Chipping', 'Pitching'],
  handicap_index: ['Impact', 'Weight Transfer', 'Course Management'],
  speed_max: ['Hip Rotation', 'Shoulder Turn', 'Weight Transfer', 'Transition'],
};

export default function LessonsPage() {
  return (
    <AuthGuard>
      <Nav />
      <LessonsTracker />
    </AuthGuard>
  );
}

function LessonsTracker() {
  const { lessons, loading, addLesson, updateLesson, deleteLesson } = useLessons();
  const { goals } = useSeasonGoals();
  const activeGoals = useMemo(() => goals.filter(g => !g.achieved_at), [goals]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'feels' | 'stats'>('list');

  // Form state
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [coachName, setCoachName] = useState('');
  const [lessonType, setLessonType] = useState('full_swing');
  const [durationMin, setDurationMin] = useState('60');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [drills, setDrills] = useState<DrillAssignment[]>([]);
  const [swingFeels, setSwingFeels] = useState<string[]>([]);
  const [newFeel, setNewFeel] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(3);
  const [nextGoals, setNextGoals] = useState('');

  // Drill form
  const [drillName, setDrillName] = useState('');
  const [drillDesc, setDrillDesc] = useState('');
  const [drillReps, setDrillReps] = useState('');

  const resetForm = () => {
    setLessonDate(new Date().toISOString().split('T')[0]);
    setCoachName('');
    setLessonType('full_swing');
    setDurationMin('60');
    setFocusAreas([]);
    setDrills([]);
    setSwingFeels([]);
    setNewFeel('');
    setNotes('');
    setRating(3);
    setNextGoals('');
    setEditingId(null);
  };

  const loadForEdit = (l: Lesson) => {
    setLessonDate(l.lesson_date);
    setCoachName(l.coach_name ?? '');
    setLessonType(l.lesson_type);
    setDurationMin(l.duration_min?.toString() ?? '60');
    setFocusAreas(l.focus_areas);
    setDrills(l.drills_assigned);
    setSwingFeels(l.swing_feels);
    setNotes(l.notes ?? '');
    setRating(l.rating ?? 3);
    setNextGoals(l.next_lesson_goals ?? '');
    setEditingId(l.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const payload = {
      lesson_date: lessonDate,
      coach_name: coachName || null,
      lesson_type: lessonType,
      duration_min: durationMin ? parseInt(durationMin) : null,
      focus_areas: focusAreas,
      drills_assigned: drills,
      swing_feels: swingFeels,
      notes: notes || null,
      rating,
      next_lesson_goals: nextGoals || null,
    };

    if (editingId) {
      await updateLesson(editingId, payload);
    } else {
      await addLesson(payload);
    }
    resetForm();
    setShowForm(false);
  };

  const addDrill = () => {
    if (!drillName.trim()) return;
    setDrills([...drills, { name: drillName, description: drillDesc, reps: drillReps }]);
    setDrillName('');
    setDrillDesc('');
    setDrillReps('');
  };

  const addFeel = () => {
    if (!newFeel.trim()) return;
    setSwingFeels([...swingFeels, newFeel.trim()]);
    setNewFeel('');
  };

  const toggleFocus = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };

  // All swing feels across all lessons (most recent first)
  const allFeels = useMemo(() => {
    const feels: { feel: string; date: string; coach: string | null; type: string }[] = [];
    for (const l of lessons) {
      for (const f of l.swing_feels) {
        feels.push({ feel: f, date: l.lesson_date, coach: l.coach_name, type: l.lesson_type });
      }
    }
    return feels;
  }, [lessons]);

  // Stats
  const stats = useMemo(() => {
    if (lessons.length === 0) return null;
    const coaches = new Set(lessons.map((l) => l.coach_name).filter(Boolean));
    const totalLessons = lessons.length;
    const avgRating = lessons.filter((l) => l.rating).reduce((s, l) => s + l.rating!, 0) / lessons.filter((l) => l.rating).length || 0;
    const focusCounts: Record<string, number> = {};
    for (const l of lessons) {
      for (const f of l.focus_areas) {
        focusCounts[f] = (focusCounts[f] || 0) + 1;
      }
    }
    const topFocus = Object.entries(focusCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { coaches: Array.from(coaches), totalLessons, avgRating, topFocus };
  }, [lessons]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Lessons</h1>
          <p className="text-sm text-gray-500">Track coaching sessions, drills & swing feels</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-gray-50 text-sm font-medium rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Log Lesson'}
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-6">
        {(['list', 'feels', 'stats'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              view === v ? 'bg-gray-700 text-gray-50' : 'text-gray-400 hover:text-gray-50 hover:bg-gray-800'
            }`}
          >
            {v === 'list' ? 'Lessons' : v === 'feels' ? 'Swing Feels' : 'Stats'}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-50">
            {editingId ? 'Edit Lesson' : 'Log New Lesson'}
          </h2>

          {/* Row 1: date, coach, type, duration */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Coach</label>
              <input
                type="text"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                placeholder="Coach name"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={lessonType}
                onChange={(e) => setLessonType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
              >
                {LESSON_TYPES.map((t) => (
                  <option key={t} value={t}>{LESSON_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Duration (min)</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
              />
            </div>
          </div>

          {/* Goal-suggested focus areas */}
          {activeGoals.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
              <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                Based on your goals
              </div>
              <div className="space-y-1.5">
                {activeGoals.map((g) => {
                  const suggested = GOAL_FOCUS_MAP[g.metric as GoalMetric] ?? [];
                  if (suggested.length === 0) return null;
                  return (
                    <div key={g.id} className="flex items-start gap-2">
                      <span className="text-xs text-green-400 shrink-0">{g.title}:</span>
                      <div className="flex flex-wrap gap-1">
                        {suggested.map((area) => (
                          <button
                            key={area}
                            onClick={() => { if (!focusAreas.includes(area)) setFocusAreas([...focusAreas, area]); }}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              focusAreas.includes(area)
                                ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                                : 'bg-gray-700 text-gray-400 hover:text-gray-50 cursor-pointer'
                            }`}
                          >
                            {area}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Focus areas */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Focus Areas</label>
            <div className="flex flex-wrap gap-1.5">
              {LESSON_FOCUS_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleFocus(area)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    focusAreas.includes(area)
                      ? 'bg-green-600 text-gray-50'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-50'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Swing Feels */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Swing Feels / Cues</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newFeel}
                onChange={(e) => setNewFeel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFeel()}
                placeholder='e.g. "Feel left hip clear first"'
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
              />
              <button onClick={addFeel} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-50 text-sm rounded">
                Add
              </button>
            </div>
            {swingFeels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {swingFeels.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-xs">
                    {f}
                    <button onClick={() => setSwingFeels(swingFeels.filter((_, j) => j !== i))} className="text-yellow-400/60 hover:text-yellow-400">x</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Drills Assigned */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Drills Assigned</label>
            {drills.length > 0 && (
              <div className="space-y-1 mb-2">
                {drills.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2 text-sm">
                    <span className="text-gray-50 font-medium">{d.name}</span>
                    {d.reps && <span className="text-gray-500">({d.reps})</span>}
                    {d.description && <span className="text-gray-500 text-xs truncate">{d.description}</span>}
                    <button onClick={() => setDrills(drills.filter((_, j) => j !== i))} className="ml-auto text-gray-500 hover:text-red-400 text-xs">remove</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={drillName}
                onChange={(e) => setDrillName(e.target.value)}
                placeholder="Drill name"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
              />
              <input
                type="text"
                value={drillReps}
                onChange={(e) => setDrillReps(e.target.value)}
                placeholder="Reps/sets"
                className="w-24 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
              />
              <button onClick={addDrill} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-50 text-sm rounded">
                Add
              </button>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Productivity Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                    rating >= r ? 'bg-green-600 text-gray-50' : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {r}
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
              placeholder="What was covered, key takeaways..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
            />
          </div>

          {/* Next lesson goals */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Goals for Next Lesson</label>
            <input
              type="text"
              value={nextGoals}
              onChange={(e) => setNextGoals(e.target.value)}
              placeholder="What to work on next time"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-50"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-2 bg-green-600 hover:bg-green-500 text-gray-50 text-sm font-medium rounded-lg transition-colors"
          >
            {editingId ? 'Update Lesson' : 'Save Lesson'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-600 py-12 text-sm">Loading lessons...</div>
      ) : view === 'list' ? (
        /* Lesson list */
        lessons.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-sm">No lessons logged yet</p>
            <p className="text-xs mt-1">Log your first coaching session to start tracking progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((l) => (
              <div key={l.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-50">{l.lesson_date}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                        {LESSON_TYPE_LABELS[l.lesson_type] || l.lesson_type}
                      </span>
                      {l.rating && (
                        <span className="text-xs text-yellow-400">{l.rating}/5</span>
                      )}
                    </div>
                    {l.coach_name && (
                      <span className="text-xs text-gray-500">with {l.coach_name}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadForEdit(l)} className="text-xs text-gray-500 hover:text-gray-300">Edit</button>
                    <button onClick={() => deleteLesson(l.id)} className="text-xs text-gray-500 hover:text-red-400">Delete</button>
                  </div>
                </div>

                {/* Focus areas */}
                {l.focus_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {l.focus_areas.map((a) => (
                      <span key={a} className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                {/* Swing feels */}
                {l.swing_feels.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Feels</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {l.swing_feels.map((f, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drills */}
                {l.drills_assigned.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Drills</span>
                    <div className="space-y-0.5 mt-1">
                      {l.drills_assigned.map((d, i) => (
                        <div key={i} className="text-xs text-gray-400">
                          <span className="text-gray-50">{d.name}</span>
                          {d.reps && <span className="text-gray-500"> ({d.reps})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {l.notes && <p className="text-xs text-gray-500 mt-2">{l.notes}</p>}
                {l.next_lesson_goals && (
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="text-gray-600">Next time: </span>{l.next_lesson_goals}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      ) : view === 'feels' ? (
        /* Swing Feels view */
        allFeels.length === 0 ? (
          <div className="text-center text-gray-600 py-12 text-sm">No swing feels recorded yet</div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-4">
              All swing feels and cues from your lessons, newest first. Refer to these before practice.
            </p>
            {allFeels.map((f, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                <span className="text-yellow-400 mt-0.5 text-lg leading-none">&bull;</span>
                <div className="flex-1">
                  <span className="text-sm text-gray-50">{f.feel}</span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {f.date}{f.coach ? ` with ${f.coach}` : ''} &middot; {LESSON_TYPE_LABELS[f.type] || f.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Stats view */
        !stats ? (
          <div className="text-center text-gray-600 py-12 text-sm">Log some lessons to see stats</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total Lessons</div>
              <div className="text-2xl font-bold text-green-400 mt-1">{stats.totalLessons}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Rating</div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.avgRating.toFixed(1)}/5</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Coaches</div>
              <div className="text-sm text-gray-50 mt-2">
                {stats.coaches.length > 0 ? stats.coaches.join(', ') : 'None recorded'}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:col-span-2 lg:col-span-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Top Focus Areas</div>
              <div className="space-y-1.5">
                {stats.topFocus.map(([area, count]) => (
                  <div key={area} className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-green-500 rounded-full h-2"
                        style={{ width: `${(count / stats.totalLessons) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-50 w-32 truncate">{area}</span>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
