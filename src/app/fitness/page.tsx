'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useWorkoutLogs } from '@/lib/hooks';
import { WORKOUT_TYPES, WORKOUT_PROGRAMS, GOLF_EXERCISES } from '@/lib/types';
import type { WorkoutLog, WorkoutExercise } from '@/lib/types';

export default function FitnessPage() {
  return (
    <AuthGuard>
      <Nav />
      <FitnessTracker />
    </AuthGuard>
  );
}

function FitnessTracker() {
  const { logs, loading, addLog, deleteLog } = useWorkoutLogs();
  const [view, setView] = useState<'log' | 'library' | 'stats'>('log');
  const [showNewWorkout, setShowNewWorkout] = useState(false);

  // Stats
  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    const last30 = logs.filter((l) => {
      const d = new Date(l.workout_date);
      const now = new Date();
      return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 30;
    });
    const last7 = logs.filter((l) => {
      const d = new Date(l.workout_date);
      const now = new Date();
      return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    });
    const totalMin = last30.reduce((a, l) => a + (l.duration_min ?? 0), 0);
    const byType: Record<string, number> = {};
    for (const l of last30) {
      byType[l.workout_type] = (byType[l.workout_type] ?? 0) + 1;
    }
    const streak = computeStreak(logs);
    return { last30: last30.length, last7: last7.length, totalMin, byType, streak, total: logs.length };
  }, [logs]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-50">Golf Fitness</h1>
        <div className="flex gap-2">
          {(['log', 'library', 'stats'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded capitalize ${view === v ? 'bg-green-600 text-gray-50' : 'bg-gray-800 text-gray-400'}`}
            >
              {v === 'log' ? 'Workout Log' : v === 'library' ? 'Exercises' : 'Stats'}
            </button>
          ))}
        </div>
      </div>

      {view === 'stats' && <StatsView stats={stats} />}
      {view === 'library' && <ExerciseLibrary />}
      {view === 'log' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowNewWorkout(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-gray-50 text-sm rounded-lg"
          >
            + Log Workout
          </button>

          {showNewWorkout && (
            <WorkoutForm
              onSave={async (log) => {
                await addLog(log);
                setShowNewWorkout(false);
              }}
              onCancel={() => setShowNewWorkout(false)}
            />
          )}

          {logs.length === 0 && !showNewWorkout && (
            <div className="text-center text-gray-600 py-16 text-sm">
              No workouts logged yet. Start by logging your first workout above.
            </div>
          )}

          {/* Workout history */}
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-gray-50">{log.workout_name}</span>
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-400 capitalize">{log.workout_type}</span>
                    {log.program && <span className="ml-2 text-xs text-gray-500">{log.program}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{log.workout_date}</span>
                    {log.duration_min && <span className="text-xs text-gray-500">{log.duration_min}min</span>}
                    {log.rating && (
                      <span className="text-xs text-yellow-400">
                        {'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}
                      </span>
                    )}
                    <button onClick={() => deleteLog(log.id)} className="text-xs text-gray-600 hover:text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
                {log.exercises.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 mt-2">
                    {log.exercises.map((ex, i) => (
                      <div key={i} className="text-xs text-gray-400">
                        <span className="text-gray-300">{ex.name}</span>
                        {ex.sets && ex.reps && <span className="ml-1">{ex.sets}x{ex.reps}</span>}
                        {ex.weight && <span className="ml-1 text-gray-500">@ {ex.weight}</span>}
                        {ex.duration_sec && <span className="ml-1">{ex.duration_sec}s</span>}
                      </div>
                    ))}
                  </div>
                )}
                {log.notes && <div className="text-xs text-gray-500 mt-2">{log.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkoutForm({
  onSave,
  onCancel,
}: {
  onSave: (log: Omit<WorkoutLog, 'id' | 'user_id' | 'created_at'>) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('strength');
  const [program, setProgram] = useState('');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  // Quick add exercise
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('3');
  const [exReps, setExReps] = useState('10');
  const [exWeight, setExWeight] = useState('');
  const [exDuration, setExDuration] = useState('');

  const addExercise = () => {
    if (!exName) return;
    exercises.push({
      name: exName,
      sets: exSets ? parseInt(exSets) : undefined,
      reps: exReps ? parseInt(exReps) : undefined,
      weight: exWeight || undefined,
      duration_sec: exDuration ? parseInt(exDuration) : undefined,
    });
    setExercises([...exercises]);
    setExName('');
    setExWeight('');
    setExDuration('');
  };

  const removeExercise = (idx: number) => {
    setExercises(exercises.filter((_, i) => i !== idx));
  };

  const pickExercise = (name: string) => {
    setExName(name);
    setShowExercisePicker(false);
  };

  const handleSave = () => {
    if (!name) return;
    onSave({
      workout_date: date,
      workout_type: type,
      program: program || null,
      workout_name: name,
      duration_min: duration ? parseInt(duration) : null,
      exercises,
      rating: rating || null,
      notes: notes || null,
    });
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-medium text-gray-50">Log Workout</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50">
            {WORKOUT_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Program</label>
          <select value={program} onChange={(e) => setProgram(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50">
            <option value="">—</option>
            {WORKOUT_PROGRAMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Duration (min)</label>
          <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45"
            className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Workout Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Upper Body Push, Pre-Round Warmup, Mobility Flow"
          className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50" />
      </div>

      {/* Exercise builder */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500">Exercises ({exercises.length})</label>
          <button onClick={() => setShowExercisePicker(!showExercisePicker)}
            className="text-xs text-green-400 hover:text-green-300">
            {showExercisePicker ? 'Close Library' : 'Browse Library'}
          </button>
        </div>

        {showExercisePicker && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-3 max-h-48 overflow-y-auto">
            {Object.entries(GOLF_EXERCISES).map(([category, exs]) => (
              <div key={category} className="mb-2">
                <div className="text-xs font-medium text-gray-400 mb-1">{category}</div>
                <div className="flex flex-wrap gap-1">
                  {exs.map((ex) => (
                    <button key={ex} onClick={() => pickExercise(ex)}
                      className="px-2 py-0.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-6 gap-2 items-end mb-2">
          <div className="col-span-2">
            <input type="text" value={exName} onChange={(e) => setExName(e.target.value)}
              placeholder="Exercise name"
              className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-600">Sets</label>
            <input type="number" value={exSets} onChange={(e) => setExSets(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-600">Reps</label>
            <input type="number" value={exReps} onChange={(e) => setExReps(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-600">Weight</label>
            <input type="text" value={exWeight} onChange={(e) => setExWeight(e.target.value)} placeholder="25lb"
              className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50" />
          </div>
          <button onClick={addExercise} disabled={!exName}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-gray-50 rounded">
            Add
          </button>
        </div>

        {exercises.length > 0 && (
          <div className="space-y-1">
            {exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-900 rounded px-3 py-1.5">
                <div className="text-xs text-gray-300">
                  <span className="font-medium">{ex.name}</span>
                  {ex.sets && ex.reps && <span className="ml-2 text-gray-500">{ex.sets}x{ex.reps}</span>}
                  {ex.weight && <span className="ml-2 text-gray-500">@ {ex.weight}</span>}
                  {ex.duration_sec && <span className="ml-2 text-gray-500">{ex.duration_sec}s</span>}
                </div>
                <button onClick={() => removeExercise(i)} className="text-xs text-gray-600 hover:text-red-400">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rating + notes */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Difficulty (1-5)</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(rating === n ? 0 : n)}
                className={`w-8 h-8 rounded text-sm ${n <= rating ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-500'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it feel?"
            className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!name}
          className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-gray-50 rounded">
          Save Workout
        </button>
        <button onClick={onCancel}
          className="px-4 py-1.5 text-sm bg-gray-700 text-gray-300 rounded">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ExerciseLibrary() {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return GOLF_EXERCISES;
    const q = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [cat, exs] of Object.entries(GOLF_EXERCISES)) {
      const matches = exs.filter((e) => e.toLowerCase().includes(q) || cat.toLowerCase().includes(q));
      if (matches.length > 0) result[cat] = matches;
    }
    return result;
  }, [search]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search exercises..."
        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-50"
      />
      {Object.entries(filtered).map(([category, exs]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-green-400 mb-2">{category}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {exs.map((ex) => (
              <div key={ex} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-200">{ex}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsView({ stats }: { stats: { last30: number; last7: number; totalMin: number; byType: Record<string, number>; streak: number; total: number } | null }) {
  if (!stats) {
    return (
      <div className="text-center text-gray-600 py-16 text-sm">
        No workouts logged yet. Start logging to see your fitness stats.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">This Week</div>
          <div className="text-2xl font-bold text-green-400">{stats.last7}</div>
          <div className="text-xs text-gray-500">workouts</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">Last 30 Days</div>
          <div className="text-2xl font-bold text-gray-50">{stats.last30}</div>
          <div className="text-xs text-gray-500">workouts</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">Time (30d)</div>
          <div className="text-2xl font-bold text-gray-50">{Math.round(stats.totalMin / 60)}h {stats.totalMin % 60}m</div>
          <div className="text-xs text-gray-500">total</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">Current Streak</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.streak}</div>
          <div className="text-xs text-gray-500">days</div>
        </div>
      </div>

      {/* Type breakdown */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-50 mb-3">Workout Type Breakdown (30 days)</h3>
        <div className="space-y-2">
          {Object.entries(stats.byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const pct = stats.last30 > 0 ? (count / stats.last30) * 100 : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 capitalize">{type}</span>
                  <div className="flex-1 h-4 bg-gray-900 rounded overflow-hidden">
                    <div className="h-full bg-green-600 rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                </div>
              );
            })}
        </div>
      </div>

      <div className="text-center text-gray-600 text-xs">
        {stats.total} total workouts logged
      </div>
    </div>
  );
}

function computeStreak(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0;
  const dates = new Set(logs.map((l) => l.workout_date));
  let streak = 0;
  const d = new Date();
  // Check if today or yesterday has a workout (allow for current day not yet logged)
  const todayStr = d.toISOString().split('T')[0];
  d.setDate(d.getDate() - 1);
  const yesterdayStr = d.toISOString().split('T')[0];
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0;
  // Start from today and count backwards
  const check = new Date();
  if (!dates.has(todayStr)) check.setDate(check.getDate() - 1);
  while (dates.has(check.toISOString().split('T')[0])) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}
