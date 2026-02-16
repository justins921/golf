'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { usePutters, usePutterTests } from '@/lib/hooks';
import { PUTTER_DRILLS, DRILL_INFO } from '@/lib/types';
import type { Putter, PutterTest, DrillInfo } from '@/lib/types';

export default function PuttersPage() {
  return (
    <AuthGuard>
      <Nav />
      <PutterLab />
    </AuthGuard>
  );
}

// ============================================================
// Colors for putters
// ============================================================
const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

function colorFor(i: number) {
  return COLORS[i % COLORS.length];
}

// ============================================================
// Main component
// ============================================================
function PutterLab() {
  const { putters, loading, upsertPutter, deletePutter } = usePutters();
  const putterIds = useMemo(() => putters.map((p) => p.id), [putters]);
  const { tests, addTest, deleteTest } = usePutterTests(putterIds);

  const [showForm, setShowForm] = useState(false);
  const [editingPutter, setEditingPutter] = useState<Putter | null>(null);
  const [showTestForm, setShowTestForm] = useState<string | null>(null); // putter_id
  const [tab, setTab] = useState<'specs' | 'test' | 'results'>('specs');

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Putter Lab</h1>
        <button
          onClick={() => { setEditingPutter(null); setShowForm(true); }}
          className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
        >
          + Add Putter
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {(['specs', 'test', 'results'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 sm:px-4 py-2 text-sm rounded-md font-medium ${
              tab === t ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {t === 'specs' ? 'Specs' : t === 'test' ? 'Log Drills' : 'Results'}
          </button>
        ))}
      </div>

      {/* Putter form modal */}
      {showForm && (
        <PutterForm
          putter={editingPutter}
          onSave={async (p) => { await upsertPutter(p); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {tab === 'specs' && (
        <SpecsComparison
          putters={putters}
          onEdit={(p) => { setEditingPutter(p); setShowForm(true); }}
          onDelete={deletePutter}
        />
      )}

      {tab === 'test' && (
        <DrillLogger
          putters={putters}
          tests={tests}
          showTestForm={showTestForm}
          setShowTestForm={setShowTestForm}
          addTest={addTest}
          deleteTest={deleteTest}
        />
      )}

      {tab === 'results' && (
        <ResultsDashboard putters={putters} tests={tests} />
      )}
    </div>
  );
}

// ============================================================
// Putter form (add/edit)
// ============================================================
function PutterForm({
  putter,
  onSave,
  onCancel,
}: {
  putter: Putter | null;
  onSave: (p: Partial<Putter> & { name: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(putter?.name ?? '');
  const [lengthIn, setLengthIn] = useState(putter?.length_in?.toString() ?? '');
  const [lieAngle, setLieAngle] = useState(putter?.lie_angle_deg?.toString() ?? '');
  const [loft, setLoft] = useState(putter?.loft_deg?.toString() ?? '');
  const [neckType, setNeckType] = useState(putter?.neck_type ?? '');
  const [grip, setGrip] = useState(putter?.grip ?? '');
  const [swingWeight, setSwingWeight] = useState(putter?.swing_weight ?? '');
  const [notes, setNotes] = useState(putter?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      ...(putter?.id ? { id: putter.id } : {}),
      name: name.trim(),
      length_in: lengthIn ? parseFloat(lengthIn) : null,
      lie_angle_deg: lieAngle ? parseFloat(lieAngle) : null,
      loft_deg: loft ? parseFloat(loft) : null,
      neck_type: neckType || null,
      grip: grip || null,
      swing_weight: swingWeight || null,
      notes: notes || null,
    });
    setSaving(false);
  };

  const inputCls = 'w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded-t-lg sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-2">{putter ? 'Edit Putter' : 'Add Putter'}</h2>
        <input className={inputCls} placeholder="Putter name *" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder='Length (in)' type="number" step="0.25" value={lengthIn} onChange={(e) => setLengthIn(e.target.value)} />
          <input className={inputCls} placeholder='Lie angle (°)' type="number" step="0.5" value={lieAngle} onChange={(e) => setLieAngle(e.target.value)} />
          <input className={inputCls} placeholder='Loft (°)' type="number" step="0.5" value={loft} onChange={(e) => setLoft(e.target.value)} />
          <input className={inputCls} placeholder='Swing weight' value={swingWeight} onChange={(e) => setSwingWeight(e.target.value)} />
        </div>
        <input className={inputCls} placeholder='Neck type (e.g. plumber, flow, slant)' value={neckType} onChange={(e) => setNeckType(e.target.value)} />
        <input className={inputCls} placeholder='Grip (e.g. SuperStroke S-Tech)' value={grip} onChange={(e) => setGrip(e.target.value)} />
        <textarea className={inputCls + ' h-20'} placeholder='Notes' value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-800 text-gray-400 rounded hover:bg-gray-700">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// Specs comparison table
// ============================================================
function SpecsComparison({
  putters,
  onEdit,
  onDelete,
}: {
  putters: Putter[];
  onEdit: (p: Putter) => void;
  onDelete: (id: string) => Promise<unknown>;
}) {
  if (putters.length === 0) {
    return <p className="text-gray-500">No putters added yet. Click &quot;+ Add Putter&quot; to get started.</p>;
  }

  const specs: { label: string; key: keyof Putter; unit?: string }[] = [
    { label: 'Length', key: 'length_in', unit: '"' },
    { label: 'Lie Angle', key: 'lie_angle_deg', unit: '°' },
    { label: 'Loft', key: 'loft_deg', unit: '°' },
    { label: 'Neck Type', key: 'neck_type' },
    { label: 'Grip', key: 'grip' },
    { label: 'Swing Weight', key: 'swing_weight' },
    { label: 'Notes', key: 'notes' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left text-gray-500 font-medium py-2 px-3 w-32">Spec</th>
            {putters.map((p, i) => (
              <th key={p.id} className="text-left py-2 px-3 min-w-[140px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: colorFor(i) }} />
                  <span className="text-white font-medium">{p.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => (
            <tr key={spec.key} className="border-b border-gray-800/50">
              <td className="text-gray-500 py-2 px-3 font-medium">{spec.label}</td>
              {putters.map((p) => {
                const val = p[spec.key];
                return (
                  <td key={p.id} className="text-gray-300 py-2 px-3">
                    {val != null ? `${val}${spec.unit ?? ''}` : <span className="text-gray-600">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="py-2 px-3" />
            {putters.map((p) => (
              <td key={p.id} className="py-2 px-3">
                <div className="flex gap-2">
                  <button onClick={() => onEdit(p)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                  <button
                    onClick={() => { if (confirm(`Delete ${p.name}?`)) onDelete(p.id); }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Drill logger
// ============================================================
function DrillLogger({
  putters,
  tests,
  showTestForm,
  setShowTestForm,
  addTest,
  deleteTest,
}: {
  putters: Putter[];
  tests: PutterTest[];
  showTestForm: string | null;
  setShowTestForm: (id: string | null) => void;
  addTest: (t: Omit<PutterTest, 'id' | 'created_at'>) => Promise<unknown>;
  deleteTest: (id: string) => Promise<unknown>;
}) {
  const [drill, setDrill] = useState<string>(PUTTER_DRILLS[0]);
  const [distanceFt, setDistanceFt] = useState('');
  const [made, setMade] = useState('');
  const [attempted, setAttempted] = useState('10');
  const [testNotes, setTestNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [randomDrill, setRandomDrill] = useState<DrillInfo | null>(null);
  const [drillApplied, setDrillApplied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Exclude 'Other' from random picks
  const randomizableDrills = PUTTER_DRILLS.filter((d) => d !== 'Other');

  const generateRandomDrill = useCallback((excludeName?: string) => {
    const pool = excludeName
      ? randomizableDrills.filter((d) => d !== excludeName)
      : randomizableDrills;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const info = DRILL_INFO[pick];
    if (info) {
      setRandomDrill(info);
      setDrillApplied(false);
    }
  }, [randomizableDrills]);

  const useRandomDrill = useCallback(() => {
    if (!randomDrill) return;
    // Auto-select first putter if none selected
    if (!showTestForm && putters.length > 0) {
      setShowTestForm(putters[0].id);
    }
    setDrill(randomDrill.name);
    if (randomDrill.defaultDistanceFt != null) {
      setDistanceFt(randomDrill.defaultDistanceFt.toString());
    } else {
      setDistanceFt('');
    }
    setAttempted(randomDrill.defaultAttempts.toString());
    setDrillApplied(true);
    // Scroll to form after React renders it
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [randomDrill, showTestForm, putters, setShowTestForm]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTestForm || !made || !attempted) return;
    setSaving(true);
    await addTest({
      putter_id: showTestForm,
      test_date: new Date().toISOString().split('T')[0],
      drill,
      distance_ft: distanceFt ? parseInt(distanceFt) : null,
      made: parseInt(made),
      attempted: parseInt(attempted),
      notes: testNotes || null,
    });
    setMade('');
    setTestNotes('');
    setSaving(false);
  };

  if (putters.length === 0) {
    return <p className="text-gray-500">Add some putters first to start logging drills.</p>;
  }

  // Recent tests grouped by date
  const recentTests = tests.slice(0, 50);

  return (
    <div className="space-y-6">
      {/* Pick a putter to log for */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Select putter to log drill</label>
        <div className="flex flex-wrap gap-2">
          {putters.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setShowTestForm(showTestForm === p.id ? null : p.id)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                showTestForm === p.id
                  ? 'border-green-500 bg-green-600/20 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colorFor(i) }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Random drill generator */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <h3 className="text-sm font-medium text-white">Random Drill</h3>
          <div className="flex gap-2">
            <button
              onClick={() => generateRandomDrill()}
              className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-md"
            >
              Generate
            </button>
            {randomDrill && (
              <button
                onClick={() => generateRandomDrill(randomDrill.name)}
                className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md border border-gray-600"
              >
                Reroll
              </button>
            )}
          </div>
        </div>

        {randomDrill ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-semibold text-green-400">{randomDrill.name}</h4>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    randomDrill.spaceNeeded === 'small' ? 'bg-green-900/50 text-green-400' :
                    randomDrill.spaceNeeded === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>
                    {randomDrill.spaceNeeded} space
                  </span>
                </div>
                <p className="text-sm text-gray-300">{randomDrill.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <span className="text-xs text-gray-500 block mb-1">Setup</span>
                <p className="text-gray-300">{randomDrill.setup}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <span className="text-xs text-gray-500 block mb-1">Focus</span>
                <p className="text-gray-300">{randomDrill.focus}</p>
              </div>
            </div>

            {drillApplied ? (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Drill loaded into form below
              </div>
            ) : (
              <button
                onClick={useRandomDrill}
                className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-md"
              >
                Use this drill {!showTestForm && putters.length > 0 ? `with ${putters[0].name}` : ''}
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Tap Generate to get a random drill with instructions.</p>
        )}
      </div>

      {/* Log form */}
      {showTestForm && (
        <form ref={formRef} onSubmit={handleAdd} className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-white">
            Log drill for {putters.find((p) => p.id === showTestForm)?.name}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Drill</label>
              <select
                value={drill}
                onChange={(e) => setDrill(e.target.value)}
                className="w-full px-2 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white"
              >
                {PUTTER_DRILLS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Distance (ft)</label>
              <input
                type="number"
                value={distanceFt}
                onChange={(e) => setDistanceFt(e.target.value)}
                placeholder="opt."
                className="w-full px-2 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Made</label>
              <input
                type="number"
                min={0}
                value={made}
                onChange={(e) => setMade(e.target.value)}
                required
                className="w-full px-2 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Attempted</label>
              <input
                type="number"
                min={1}
                value={attempted}
                onChange={(e) => setAttempted(e.target.value)}
                required
                className="w-full px-2 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
          </div>
          {DRILL_INFO[drill] && drill !== 'Other' && (
            <p className="text-xs text-gray-500 -mt-1">{DRILL_INFO[drill].description}</p>
          )}
          <input
            value={testNotes}
            onChange={(e) => setTestNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Log Result'}
          </button>
        </form>
      )}

      {/* Recent test log */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Drill Results</h3>
        {recentTests.length === 0 ? (
          <p className="text-gray-600 text-sm">No drills logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-left">
                  <th className="py-2 px-2 hidden sm:table-cell">Date</th>
                  <th className="py-2 px-2">Putter</th>
                  <th className="py-2 px-2">Drill</th>
                  <th className="py-2 px-2 hidden md:table-cell">Dist</th>
                  <th className="py-2 px-2">Result</th>
                  <th className="py-2 px-2">%</th>
                  <th className="py-2 px-2 hidden md:table-cell">Notes</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {recentTests.map((t) => {
                  const p = putters.find((p) => p.id === t.putter_id);
                  const pi = putters.findIndex((p) => p.id === t.putter_id);
                  const pct = t.attempted > 0 ? ((t.made / t.attempted) * 100).toFixed(0) : '—';
                  return (
                    <tr key={t.id} className="border-b border-gray-800/50 text-gray-300">
                      <td className="py-1.5 px-2 text-gray-500 hidden sm:table-cell">{t.test_date}</td>
                      <td className="py-1.5 px-2">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: colorFor(pi) }} />
                        {p?.name ?? '?'}
                      </td>
                      <td className="py-1.5 px-2">{t.drill}</td>
                      <td className="py-1.5 px-2 text-gray-500 hidden md:table-cell">{t.distance_ft ? `${t.distance_ft}ft` : '—'}</td>
                      <td className="py-1.5 px-2">{t.made}/{t.attempted}</td>
                      <td className="py-1.5 px-2 font-mono">{pct}%</td>
                      <td className="py-1.5 px-2 text-gray-500 text-xs truncate max-w-[150px] hidden md:table-cell">{t.notes ?? ''}</td>
                      <td className="py-1.5 px-2">
                        <button onClick={() => deleteTest(t.id)} className="text-xs text-red-400 hover:text-red-300">x</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Results dashboard
// ============================================================
function ResultsDashboard({ putters, tests }: { putters: Putter[]; tests: PutterTest[] }) {
  const [drillFilter, setDrillFilter] = useState<string>('all');

  // Get unique drills from logged tests
  const drillsUsed = useMemo(() => {
    const set = new Set(tests.map((t) => t.drill));
    return Array.from(set).sort();
  }, [tests]);

  // Compute per-putter, per-drill aggregate stats
  const summary = useMemo(() => {
    const filtered = drillFilter === 'all' ? tests : tests.filter((t) => t.drill === drillFilter);

    return putters.map((p, i) => {
      const pTests = filtered.filter((t) => t.putter_id === p.id);
      const totalMade = pTests.reduce((s, t) => s + t.made, 0);
      const totalAtt = pTests.reduce((s, t) => s + t.attempted, 0);
      const pct = totalAtt > 0 ? (totalMade / totalAtt) * 100 : null;

      // Per-drill breakdown
      const byDrill: Record<string, { made: number; attempted: number; sessions: number }> = {};
      for (const t of pTests) {
        if (!byDrill[t.drill]) byDrill[t.drill] = { made: 0, attempted: 0, sessions: 0 };
        byDrill[t.drill].made += t.made;
        byDrill[t.drill].attempted += t.attempted;
        byDrill[t.drill].sessions++;
      }

      // Trend: last 3 sessions vs first 3 sessions make %
      const sorted = [...pTests].sort((a, b) => a.test_date.localeCompare(b.test_date));
      let trend: number | null = null;
      if (sorted.length >= 6) {
        const first3 = sorted.slice(0, 3);
        const last3 = sorted.slice(-3);
        const firstPct = first3.reduce((s, t) => s + t.made, 0) / Math.max(first3.reduce((s, t) => s + t.attempted, 0), 1);
        const lastPct = last3.reduce((s, t) => s + t.made, 0) / Math.max(last3.reduce((s, t) => s + t.attempted, 0), 1);
        trend = (lastPct - firstPct) * 100;
      }

      return {
        putter: p,
        colorIdx: i,
        totalMade,
        totalAtt,
        pct,
        sessions: pTests.length,
        byDrill,
        trend,
      };
    });
  }, [putters, tests, drillFilter]);

  if (tests.length === 0) {
    return <p className="text-gray-500">Log some drill results first to see comparisons.</p>;
  }

  // All drills across all putters for the breakdown table
  const allDrills = useMemo(() => {
    const set = new Set<string>();
    for (const s of summary) {
      for (const d of Object.keys(s.byDrill)) set.add(d);
    }
    return Array.from(set).sort();
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Drill filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500">Filter by drill:</label>
        <select
          value={drillFilter}
          onChange={(e) => setDrillFilter(e.target.value)}
          className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white"
        >
          <option value="all">All Drills</option>
          {drillsUsed.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Overall comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((s) => (
          <div key={s.putter.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colorFor(s.colorIdx) }} />
              <h3 className="text-white font-medium">{s.putter.name}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{s.pct != null ? `${s.pct.toFixed(0)}%` : '—'}</div>
                <div className="text-[10px] text-gray-500">Make Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{s.totalMade}/{s.totalAtt}</div>
                <div className="text-[10px] text-gray-500">Made/Att</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{s.sessions}</div>
                <div className="text-[10px] text-gray-500">Drills</div>
              </div>
            </div>
            {s.trend != null && (
              <div className={`mt-2 text-xs text-center ${s.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {s.trend >= 0 ? '+' : ''}{s.trend.toFixed(1)}% trend (last 3 vs first 3)
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Per-drill breakdown */}
      {drillFilter === 'all' && allDrills.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Breakdown by Drill</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-left">
                  <th className="py-2 px-2">Drill</th>
                  {summary.map((s) => (
                    <th key={s.putter.id} className="py-2 px-2">
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: colorFor(s.colorIdx) }} />
                      {s.putter.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allDrills.map((drill) => (
                  <tr key={drill} className="border-b border-gray-800/50">
                    <td className="py-1.5 px-2 text-gray-400">{drill}</td>
                    {summary.map((s) => {
                      const d = s.byDrill[drill];
                      if (!d) return <td key={s.putter.id} className="py-1.5 px-2 text-gray-600">—</td>;
                      const pct = d.attempted > 0 ? ((d.made / d.attempted) * 100).toFixed(0) : '0';
                      return (
                        <td key={s.putter.id} className="py-1.5 px-2 text-gray-300">
                          <span className="font-mono">{pct}%</span>
                          <span className="text-gray-600 ml-1 text-xs">({d.made}/{d.attempted})</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bar chart visualization */}
      {summary.some((s) => s.pct != null) && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            {drillFilter === 'all' ? 'Overall' : drillFilter} Make Rate
          </h3>
          <div className="space-y-2">
            {summary
              .filter((s) => s.pct != null)
              .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
              .map((s) => (
                <div key={s.putter.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-20 sm:w-32 truncate shrink-0">{s.putter.name}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.pct ?? 0}%`, backgroundColor: colorFor(s.colorIdx) }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-mono">
                      {s.pct!.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{s.totalMade}/{s.totalAtt}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
