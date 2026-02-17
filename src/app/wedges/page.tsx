'use client';

import { useState, useMemo, useCallback } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useBagClubs, useWedgeMatrix } from '@/lib/hooks';
import {
  CLUB_ORDER,
  SWING_SYSTEM_LABELS,
  SWING_SYSTEM_PRESETS,
  WEDGE_CLUB_PRESETS,
  sortClubs,
} from '@/lib/types';
import type { BagClub, SwingSystem } from '@/lib/types';

export default function WedgesPage() {
  return (
    <AuthGuard>
      <Nav />
      <WedgesLab />
    </AuthGuard>
  );
}

// ============================================================
// Main component
// ============================================================
function WedgesLab() {
  const bagHook = useBagClubs();
  const matrixHook = useWedgeMatrix();
  const [tab, setTab] = useState<'bag' | 'matrix' | 'practice'>('bag');

  const loading = bagHook.loading || matrixHook.loading;

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Wedge Lab</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {([
          { key: 'bag', label: 'My Bag' },
          { key: 'matrix', label: 'Wedge Matrix' },
          { key: 'practice', label: 'Practice' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 sm:px-4 py-2 text-sm rounded-md font-medium ${
              tab === t.key ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bag' && (
        <BagManager
          clubs={bagHook.clubs}
          upsertClub={bagHook.upsertClub}
          deleteClub={bagHook.deleteClub}
        />
      )}

      {tab === 'matrix' && (
        <WedgeMatrixConfig
          matrix={matrixHook.matrix}
          saveMatrix={matrixHook.saveMatrix}
        />
      )}

      {tab === 'practice' && (
        <WedgePractice
          matrix={matrixHook.matrix}
        />
      )}
    </div>
  );
}

// ============================================================
// All club options for the bag
// ============================================================
const ALL_CLUB_OPTIONS = sortClubs(Object.keys(CLUB_ORDER).filter((c) => {
  // Remove short aliases, keep full names
  if (c === 'D') return false;
  if (/^\d+$/.test(c)) return false; // degree numbers like '46', '50'
  if (c.length <= 3 && c.endsWith('W') && c !== 'PW' && c !== 'GW' && c !== 'SW' && c !== 'LW' && c !== 'AW') return false;
  if (c.length <= 3 && c.endsWith('H')) return false;
  if (c.length <= 3 && c.endsWith('I')) return false;
  return true;
}));

// ============================================================
// Bag manager
// ============================================================
function BagManager({
  clubs,
  upsertClub,
  deleteClub,
}: {
  clubs: BagClub[];
  upsertClub: (c: Partial<BagClub> & { club_name: string }) => Promise<unknown>;
  deleteClub: (id: string) => Promise<unknown>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BagClub | null>(null);

  const sorted = useMemo(() => {
    return [...clubs].sort((a, b) => {
      const oa = CLUB_ORDER[a.club_name] ?? 50;
      const ob = CLUB_ORDER[b.club_name] ?? 50;
      if (oa !== ob) return oa - ob;
      return a.club_name.localeCompare(b.club_name);
    });
  }, [clubs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{clubs.length}/14 clubs</p>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
        >
          + Add Club
        </button>
      </div>

      {showForm && (
        <BagClubForm
          club={editing}
          existingClubs={clubs.map((c) => c.club_name)}
          onSave={async (c) => { await upsertClub(c); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {sorted.length === 0 ? (
        <p className="text-gray-500">No clubs in your bag yet. Add your 14 clubs to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="py-2 px-2">Club</th>
                <th className="py-2 px-2">Brand</th>
                <th className="py-2 px-2 hidden sm:table-cell">Model</th>
                <th className="py-2 px-2 hidden md:table-cell">Loft</th>
                <th className="py-2 px-2 hidden md:table-cell">Shaft</th>
                <th className="py-2 px-2 hidden lg:table-cell">Flex</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 text-gray-300">
                  <td className="py-1.5 px-2 font-medium text-white">{c.club_name}</td>
                  <td className="py-1.5 px-2">{c.brand ?? '—'}</td>
                  <td className="py-1.5 px-2 hidden sm:table-cell">{c.model ?? '—'}</td>
                  <td className="py-1.5 px-2 hidden md:table-cell">{c.loft_deg != null ? `${c.loft_deg}°` : '—'}</td>
                  <td className="py-1.5 px-2 hidden md:table-cell">{c.shaft ?? '—'}</td>
                  <td className="py-1.5 px-2 hidden lg:table-cell">{c.flex ?? '—'}</td>
                  <td className="py-1.5 px-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditing(c); setShowForm(true); }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remove ${c.club_name}?`)) deleteClub(c.id); }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Bag club form
// ============================================================
function BagClubForm({
  club,
  existingClubs,
  onSave,
  onCancel,
}: {
  club: BagClub | null;
  existingClubs: string[];
  onSave: (c: Partial<BagClub> & { club_name: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [clubName, setClubName] = useState(club?.club_name ?? '');
  const [brand, setBrand] = useState(club?.brand ?? '');
  const [model, setModel] = useState(club?.model ?? '');
  const [loft, setLoft] = useState(club?.loft_deg?.toString() ?? '');
  const [shaft, setShaft] = useState(club?.shaft ?? '');
  const [flex, setFlex] = useState(club?.flex ?? '');
  const [notes, setNotes] = useState(club?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const availableClubs = ALL_CLUB_OPTIONS.filter(
    (c) => c === club?.club_name || !existingClubs.includes(c)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName) return;
    setSaving(true);
    await onSave({
      ...(club?.id ? { id: club.id } : {}),
      club_name: clubName,
      brand: brand || null,
      model: model || null,
      loft_deg: loft ? parseFloat(loft) : null,
      shaft: shaft || null,
      flex: flex || null,
      notes: notes || null,
    });
    setSaving(false);
  };

  const inputCls = 'w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded-t-lg sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-2">{club ? 'Edit Club' : 'Add Club'}</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Club *</label>
          <select
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">Select club...</option>
            {availableClubs.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Brand (e.g., Titleist)" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <input className={inputCls} placeholder="Model (e.g., T200)" value={model} onChange={(e) => setModel(e.target.value)} />
          <input className={inputCls} placeholder="Loft (°)" type="number" step="0.5" value={loft} onChange={(e) => setLoft(e.target.value)} />
          <input className={inputCls} placeholder="Shaft" value={shaft} onChange={(e) => setShaft(e.target.value)} />
        </div>
        <input className={inputCls} placeholder="Flex (e.g., Stiff, Regular)" value={flex} onChange={(e) => setFlex(e.target.value)} />
        <textarea className={inputCls + ' h-16'} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
// Wedge matrix config
// ============================================================
function WedgeMatrixConfig({
  matrix,
  saveMatrix,
}: {
  matrix: ReturnType<typeof useWedgeMatrix>['matrix'];
  saveMatrix: ReturnType<typeof useWedgeMatrix>['saveMatrix'];
}) {
  const [system, setSystem] = useState<SwingSystem>(matrix?.swing_system ?? 'clock');
  const [swingLabels, setSwingLabels] = useState<string[]>(
    matrix?.swing_labels?.length ? matrix.swing_labels : SWING_SYSTEM_PRESETS['clock']
  );
  const [wedgeClubs, setWedgeClubs] = useState<string[]>(
    matrix?.wedge_clubs?.length ? matrix.wedge_clubs : [...WEDGE_CLUB_PRESETS]
  );
  const [distances, setDistances] = useState<Record<string, number>>(
    matrix?.distances ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customClub, setCustomClub] = useState('');

  const handleSystemChange = (newSystem: SwingSystem) => {
    setSystem(newSystem);
    if (newSystem !== 'custom') {
      setSwingLabels(SWING_SYSTEM_PRESETS[newSystem]);
    }
  };

  const setDistance = (club: string, label: string, value: string) => {
    const key = `${club}|${label}`;
    if (value === '') {
      const next = { ...distances };
      delete next[key];
      setDistances(next);
    } else {
      setDistances({ ...distances, [key]: parseFloat(value) });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await saveMatrix({
      swing_system: system,
      swing_labels: swingLabels,
      wedge_clubs: wedgeClubs,
      distances,
    });
    setSaving(false);
  };

  const addCustomLabel = () => {
    if (customLabel.trim() && !swingLabels.includes(customLabel.trim())) {
      setSwingLabels([...swingLabels, customLabel.trim()]);
      setCustomLabel('');
    }
  };

  const removeLabel = (label: string) => {
    setSwingLabels(swingLabels.filter((l) => l !== label));
  };

  const addCustomClub = () => {
    if (customClub.trim() && !wedgeClubs.includes(customClub.trim())) {
      setWedgeClubs([...wedgeClubs, customClub.trim()]);
      setCustomClub('');
    }
  };

  const removeClub = (club: string) => {
    setWedgeClubs(wedgeClubs.filter((c) => c !== club));
  };

  const inputCls = 'w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white text-center focus:outline-none focus:border-green-500';

  return (
    <div className="space-y-6">
      {/* System selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Swing System</label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(SWING_SYSTEM_LABELS) as [SwingSystem, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleSystemChange(key)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                system === key
                  ? 'border-green-500 bg-green-600/20 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {system === 'clock' && 'Dave Pelz-style: backswing positions at 7:30, 9:00, and 10:30 on a clock face.'}
          {system === 'percentage' && 'Swing effort as a percentage: 50%, 75%, and 100%.'}
          {system === 'body' && 'Reference body positions: hands to hips, chest, or full swing.'}
          {system === 'thirds' && 'Divide your swing into thirds: 1/3, 2/3, and full.'}
          {system === 'custom' && 'Define your own swing length labels below.'}
        </p>
      </div>

      {/* Swing labels editor */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Swing Lengths</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {swingLabels.map((label) => (
            <div key={label} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1">
              <span className="text-sm text-gray-300">{label}</span>
              <button
                onClick={() => removeLabel(label)}
                className="text-xs text-gray-500 hover:text-red-400 ml-1"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomLabel(); } }}
            placeholder="Add custom label..."
            className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 w-40"
          />
          <button onClick={addCustomLabel} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
            Add
          </button>
        </div>
      </div>

      {/* Wedge clubs editor */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Wedge Clubs</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {wedgeClubs.map((club) => (
            <div key={club} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1">
              <span className="text-sm text-gray-300">{club}</span>
              <button
                onClick={() => removeClub(club)}
                className="text-xs text-gray-500 hover:text-red-400 ml-1"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={customClub}
            onChange={(e) => setCustomClub(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomClub(); } }}
            placeholder="Add club (e.g., 52°)..."
            className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 w-40"
          />
          <button onClick={addCustomClub} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
            Add
          </button>
        </div>
      </div>

      {/* Distance matrix grid */}
      {swingLabels.length > 0 && wedgeClubs.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-2">Carry Distances (yards)</label>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="py-2 px-2 text-left text-gray-500 font-medium w-20">Swing</th>
                  {wedgeClubs.map((club) => (
                    <th key={club} className="py-2 px-2 text-center text-white font-medium min-w-[80px]">
                      {club}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {swingLabels.map((label) => (
                  <tr key={label} className="border-t border-gray-800/50">
                    <td className="py-2 px-2 text-gray-400 font-medium">{label}</td>
                    {wedgeClubs.map((club) => {
                      const key = `${club}|${label}`;
                      return (
                        <td key={club} className="py-2 px-2">
                          <input
                            type="number"
                            value={distances[key] ?? ''}
                            onChange={(e) => setDistance(club, label, e.target.value)}
                            placeholder="—"
                            className={inputCls + ' w-20'}
                          />
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

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-5 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Matrix'}
      </button>
    </div>
  );
}

// ============================================================
// Wedge practice (TheStack-inspired)
// ============================================================
function WedgePractice({
  matrix,
}: {
  matrix: ReturnType<typeof useWedgeMatrix>['matrix'];
}) {
  const [targetYards, setTargetYards] = useState<number | null>(null);
  const [resultYards, setResultYards] = useState('');
  const [results, setResults] = useState<{ target: number; actual: number; error: number }[]>([]);
  const [minRange, setMinRange] = useState(30);
  const [maxRange, setMaxRange] = useState(100);

  // Compute range from matrix if available
  const matrixDistances = useMemo(() => {
    if (!matrix?.distances) return [];
    return Object.values(matrix.distances).filter((d) => d > 0).sort((a, b) => a - b);
  }, [matrix]);

  const effectiveMin = matrixDistances.length > 0 ? Math.min(minRange, Math.floor(matrixDistances[0])) : minRange;
  const effectiveMax = matrixDistances.length > 0 ? Math.max(maxRange, Math.ceil(matrixDistances[matrixDistances.length - 1])) : maxRange;

  const generateTarget = useCallback(() => {
    const min = effectiveMin;
    const max = effectiveMax;
    const target = Math.round(min + Math.random() * (max - min));
    setTargetYards(target);
    setResultYards('');
  }, [effectiveMin, effectiveMax]);

  const logResult = () => {
    if (targetYards == null || !resultYards) return;
    const actual = parseFloat(resultYards);
    const error = actual - targetYards;
    setResults((prev) => [{ target: targetYards, actual, error }, ...prev]);
    // Auto-generate next target
    generateTarget();
  };

  // Scoring: closer = more points (out of 10)
  const score = useMemo(() => {
    if (results.length === 0) return null;
    const totalError = results.reduce((sum, r) => sum + Math.abs(r.error), 0);
    const avgError = totalError / results.length;
    // 0 yards error = 10 pts, 10+ yards error = 0 pts
    const pts = Math.max(0, 10 - avgError);
    return { avgError: avgError.toFixed(1), score: pts.toFixed(1), total: results.length };
  }, [results]);

  // Find the closest matrix entry to help the player
  const closestEntry = useMemo(() => {
    if (!matrix?.distances || targetYards == null) return null;
    let best: { club: string; label: string; distance: number; diff: number } | null = null;
    for (const [key, dist] of Object.entries(matrix.distances)) {
      const diff = Math.abs(dist - targetYards);
      if (!best || diff < best.diff) {
        const [club, label] = key.split('|');
        best = { club, label, distance: dist, diff };
      }
    }
    return best;
  }, [matrix, targetYards]);

  if (!matrix || Object.keys(matrix.distances).length === 0) {
    return (
      <div className="text-gray-500 space-y-2">
        <p>Set up your wedge matrix first to use practice mode.</p>
        <p className="text-xs">Go to the Wedge Matrix tab and enter your carry distances for each club/swing combination.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Range config */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min (yds)</label>
          <input
            type="number"
            value={minRange}
            onChange={(e) => setMinRange(parseInt(e.target.value) || 20)}
            className="w-20 px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max (yds)</label>
          <input
            type="number"
            value={maxRange}
            onChange={(e) => setMaxRange(parseInt(e.target.value) || 120)}
            className="w-20 px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white"
          />
        </div>
        <button
          onClick={() => { setResults([]); generateTarget(); }}
          className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-md"
        >
          {results.length > 0 ? 'Reset & New Session' : 'Start Session'}
        </button>
      </div>

      {/* Target display */}
      {targetYards != null && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Target Distance</p>
            <p className="text-6xl font-bold text-green-400">{targetYards}</p>
            <p className="text-sm text-gray-500">yards</p>
          </div>

          {closestEntry && (
            <div className="bg-gray-800/50 rounded-lg p-3 inline-block">
              <p className="text-xs text-gray-500 mb-1">Closest in your matrix</p>
              <p className="text-sm text-white">
                <span className="font-medium">{closestEntry.club}</span>
                {' at '}
                <span className="font-medium">{closestEntry.label}</span>
                {' = '}
                <span className="text-green-400">{closestEntry.distance} yds</span>
                <span className="text-gray-500 ml-1">({closestEntry.diff > 0 ? `${closestEntry.diff} off` : 'exact'})</span>
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 justify-center">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Actual carry (yds)</label>
              <input
                type="number"
                value={resultYards}
                onChange={(e) => setResultYards(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') logResult(); }}
                placeholder="Enter result..."
                className="w-32 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white text-center placeholder-gray-600"
                autoFocus
              />
            </div>
            <button
              onClick={logResult}
              disabled={!resultYards}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-md disabled:opacity-50 mt-5"
            >
              Log & Next
            </button>
            <button
              onClick={generateTarget}
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md border border-gray-600 mt-5"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Score & results */}
      {score && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{score.score}</div>
            <div className="text-[10px] text-gray-500">Score (out of 10)</div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{score.avgError} yds</div>
            <div className="text-[10px] text-gray-500">Avg Error</div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{score.total}</div>
            <div className="text-[10px] text-gray-500">Shots</div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Shot Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-left">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Target</th>
                  <th className="py-2 px-2">Actual</th>
                  <th className="py-2 px-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800/50 text-gray-300">
                    <td className="py-1.5 px-2 text-gray-500">{results.length - i}</td>
                    <td className="py-1.5 px-2">{r.target} yds</td>
                    <td className="py-1.5 px-2">{r.actual} yds</td>
                    <td className={`py-1.5 px-2 font-mono ${
                      Math.abs(r.error) <= 3 ? 'text-green-400' :
                      Math.abs(r.error) <= 7 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {r.error > 0 ? '+' : ''}{r.error} yds
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
