'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useCourseStrategies, useCourses } from '@/lib/hooks';
import { MISS_ZONES, CLUB_ORDER } from '@/lib/types';
import type { CourseStrategy, HoleStrategy } from '@/lib/types';

export default function StrategyPage() {
  return (
    <AuthGuard>
      <Nav />
      <CourseStrategyManager />
    </AuthGuard>
  );
}

const CLUB_OPTIONS = [
  'Driver', '3 Wood', '5 Wood', '3 Hybrid', '4 Hybrid',
  '4 Iron', '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron',
  'PW', 'GW', 'SW', 'LW',
];

function emptyHoleStrategy(hole: number): HoleStrategy {
  return { hole, par: 4, yardage: null, strategy: '', club_off_tee: 'Driver', target: '', miss_zone: 'Center', notes: '' };
}

function CourseStrategyManager() {
  const { strategies, loading, addStrategy, updateStrategy, deleteStrategy } = useCourseStrategies();
  const { courses } = useCourses();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // New strategy form
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseId, setNewCourseId] = useState<string>('');
  const [newTeeSet, setNewTeeSet] = useState('');
  const [newScoringTarget, setNewScoringTarget] = useState('');

  const selected = useMemo(() => strategies.find((s) => s.id === selectedId) ?? null, [strategies, selectedId]);

  const createNewStrategy = async () => {
    if (!newCourseName.trim()) return;
    const holes = Array.from({ length: 18 }, (_, i) => emptyHoleStrategy(i + 1));
    await addStrategy({
      course_id: newCourseId || null,
      course_name: newCourseName,
      tee_set: newTeeSet || null,
      hole_strategies: holes,
      general_notes: null,
      weather_adjustments: null,
      scoring_target: newScoringTarget ? parseInt(newScoringTarget) : null,
    });
    setNewCourseName('');
    setNewCourseId('');
    setNewTeeSet('');
    setNewScoringTarget('');
    setShowNew(false);
  };

  const handleCourseSelect = (courseId: string) => {
    setNewCourseId(courseId);
    const course = courses.find((c) => c.id === courseId);
    if (course) setNewCourseName(course.name);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-gray-50 tracking-tight">Course Strategy</h1>
          <p className="text-sm text-gray-500">Plan every hole before you play</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-4 py-2 bg-green-500 hover:bg-green-400 text-gray-50 text-sm font-medium rounded-2xl active:scale-[0.98] transition-colors"
        >
          {showNew ? 'Cancel' : '+ New Strategy'}
        </button>
      </div>

      {/* New strategy form */}
      {showNew && (
        <div className="bg-gray-900 rounded-2xl p-5 mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-50">Create Course Strategy</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Course</label>
              {courses.length > 0 ? (
                <select
                  value={newCourseId}
                  onChange={(e) => handleCourseSelect(e.target.value)}
                  className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                >
                  <option value="">Select or type below</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="Course name"
                  className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                />
              )}
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Tees</label>
              <input
                type="text"
                value={newTeeSet}
                onChange={(e) => setNewTeeSet(e.target.value)}
                placeholder="Blue, White..."
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Target Score</label>
              <input
                type="number"
                value={newScoringTarget}
                onChange={(e) => setNewScoringTarget(e.target.value)}
                placeholder="e.g. 85"
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
          </div>
          {courses.length > 0 && !newCourseId && (
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Or enter name</label>
              <input
                type="text"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Course name"
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
          )}
          <button
            onClick={createNewStrategy}
            disabled={!newCourseName.trim()}
            className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-50 text-sm font-medium rounded-2xl active:scale-[0.98] transition-colors"
          >
            Create Strategy
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-600 py-12 text-sm">Loading...</div>
      ) : strategies.length === 0 && !showNew ? (
        <div className="text-center text-gray-600 py-12">
          <p className="text-sm">No course strategies yet</p>
          <p className="text-xs mt-1">Create a game plan for your home course</p>
        </div>
      ) : !selected ? (
        /* Strategy list */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {strategies.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className="text-left bg-gray-900 rounded-2xl p-4 hover:bg-gray-800/60 transition-colors"
            >
              <div className="text-sm font-medium text-gray-50">{s.course_name}</div>
              {s.tee_set && <span className="text-xs text-gray-500">{s.tee_set} tees</span>}
              <div className="flex items-center gap-3 mt-2">
                {s.scoring_target && (
                  <span className="text-xs text-green-400">Target: {s.scoring_target}</span>
                )}
                <span className="text-xs text-gray-500">
                  {s.hole_strategies.filter((h) => h.strategy).length}/18 holes planned
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Strategy detail */
        <StrategyDetail
          strategy={selected}
          onUpdate={(updates) => updateStrategy(selected.id, updates)}
          onDelete={() => { deleteStrategy(selected.id); setSelectedId(null); }}
          onBack={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function StrategyDetail({
  strategy,
  onUpdate,
  onDelete,
  onBack,
}: {
  strategy: CourseStrategy;
  onUpdate: (updates: Partial<CourseStrategy>) => Promise<unknown>;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [holes, setHoles] = useState<HoleStrategy[]>(strategy.hole_strategies);
  const [generalNotes, setGeneralNotes] = useState(strategy.general_notes ?? '');
  const [weatherAdj, setWeatherAdj] = useState(strategy.weather_adjustments ?? '');
  const [editingHole, setEditingHole] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const updateHole = (holeNum: number, updates: Partial<HoleStrategy>) => {
    setHoles((prev) => prev.map((h) => h.hole === holeNum ? { ...h, ...updates } : h));
    setDirty(true);
  };

  const save = async () => {
    await onUpdate({
      hole_strategies: holes,
      general_notes: generalNotes || null,
      weather_adjustments: weatherAdj || null,
    });
    setDirty(false);
  };

  // Summary stats
  const plannedHoles = holes.filter((h) => h.strategy).length;
  const totalPar = holes.reduce((s, h) => s + h.par, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-50 mb-2">&larr; Back</button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-50">{strategy.course_name}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
              {strategy.tee_set && <span>{strategy.tee_set} tees</span>}
              <span>Par {totalPar}</span>
              <span>{plannedHoles}/18 planned</span>
              {strategy.scoring_target && <span className="text-green-400">Target: {strategy.scoring_target}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {dirty && (
              <button
                onClick={save}
                className="px-4 py-2 bg-green-500 hover:bg-green-400 text-gray-50 text-sm font-medium rounded-2xl active:scale-[0.98] transition-colors"
              >
                Save
              </button>
            )}
            <button onClick={onDelete} className="px-3 py-2 text-xs text-gray-500 hover:text-red-400">Delete</button>
          </div>
        </div>
      </div>

      {/* General notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">General Strategy Notes</label>
          <textarea
            value={generalNotes}
            onChange={(e) => { setGeneralNotes(e.target.value); setDirty(true); }}
            rows={2}
            placeholder="Overall game plan, key things to remember..."
            className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Weather Adjustments</label>
          <textarea
            value={weatherAdj}
            onChange={(e) => { setWeatherAdj(e.target.value); setDirty(true); }}
            rows={2}
            placeholder="Wind notes, firmness, elevation effects..."
            className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
          />
        </div>
      </div>

      {/* Hole-by-hole */}
      <div className="space-y-2">
        {/* Front nine */}
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Front Nine</h3>
        {holes.filter((h) => h.hole <= 9).map((h) => (
          <HoleRow
            key={h.hole}
            hole={h}
            editing={editingHole === h.hole}
            onToggleEdit={() => setEditingHole(editingHole === h.hole ? null : h.hole)}
            onChange={(updates) => updateHole(h.hole, updates)}
          />
        ))}

        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1 pt-3">Back Nine</h3>
        {holes.filter((h) => h.hole > 9).map((h) => (
          <HoleRow
            key={h.hole}
            hole={h}
            editing={editingHole === h.hole}
            onToggleEdit={() => setEditingHole(editingHole === h.hole ? null : h.hole)}
            onChange={(updates) => updateHole(h.hole, updates)}
          />
        ))}
      </div>
    </div>
  );
}

function HoleRow({
  hole,
  editing,
  onToggleEdit,
  onChange,
}: {
  hole: HoleStrategy;
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (updates: Partial<HoleStrategy>) => void;
}) {
  const parColor = hole.par === 3 ? 'text-red-400' : hole.par === 5 ? 'text-blue-400' : 'text-gray-50';

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Summary row */}
      <button
        onClick={onToggleEdit}
        className="w-full px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-50 shrink-0">#{hole.hole}</span>
          <span className={`text-xs font-medium shrink-0 ${parColor}`}>Par {hole.par}</span>
          {hole.yardage && <span className="text-xs text-gray-500 shrink-0">{hole.yardage} yd</span>}
          <span className="text-xs text-gray-400 shrink-0">{hole.club_off_tee || '—'}</span>
          {hole.miss_zone && hole.miss_zone !== 'Center' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 shrink-0 hidden sm:inline">
              Miss {hole.miss_zone}
            </span>
          )}
          <svg className={`w-4 h-4 text-gray-500 shrink-0 ml-auto transition-transform ${editing ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {hole.strategy && (
          <div className="text-xs text-gray-300 mt-1 truncate">{hole.strategy}</div>
        )}
      </button>

      {/* Edit form */}
      {editing && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-800/60 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Par</label>
              <select
                value={hole.par}
                onChange={(e) => onChange({ par: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              >
                {[3, 4, 5].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Yardage</label>
              <input
                type="number"
                value={hole.yardage ?? ''}
                onChange={(e) => onChange({ yardage: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Club Off Tee</label>
              <select
                value={hole.club_off_tee}
                onChange={(e) => onChange({ club_off_tee: e.target.value })}
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              >
                <option value="">—</option>
                {CLUB_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Preferred Miss</label>
              <select
                value={hole.miss_zone}
                onChange={(e) => onChange({ miss_zone: e.target.value })}
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              >
                {MISS_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Strategy</label>
            <input
              type="text"
              value={hole.strategy}
              onChange={(e) => onChange({ strategy: e.target.value })}
              placeholder="e.g. Aim left center, avoid bunker right. Layup to 100yd wedge."
              className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Target</label>
            <input
              type="text"
              value={hole.target}
              onChange={(e) => onChange({ target: e.target.value })}
              placeholder="e.g. Left edge of fairway, front-left of green"
              className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Notes</label>
            <input
              type="text"
              value={hole.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Wind considerations, pin positions, danger zones..."
              className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
        </div>
      )}
    </div>
  );
}
