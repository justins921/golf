'use client';

import { useState, useMemo, useCallback } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useBagClubs, useWedgeMatrix, useWedgeSessions, useWedgeSessionShots, useAllWedgeSessionShots } from '@/lib/hooks';
import {
  CLUB_ORDER,
  SWING_SYSTEM_LABELS,
  SWING_SYSTEM_PRESETS,
  WEDGE_CLUB_PRESETS,
  sortClubs,
} from '@/lib/types';
import type { BagClub, SwingSystem, WedgeSession, WedgeSessionShot } from '@/lib/types';

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
  const wedgeSessionsHook = useWedgeSessions();
  const [tab, setTab] = useState<'bag' | 'matrix' | 'calibrate' | 'practice'>('bag');

  const loading = bagHook.loading || matrixHook.loading;

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-[28px] font-bold text-gray-50 tracking-tight">Wedge Lab</h1>

        {/* Tabs */}
        <div className="segmented-control overflow-x-auto">
          {([
            { key: 'bag', label: 'My Bag' },
            { key: 'matrix', label: 'Wedge Matrix' },
            { key: 'calibrate', label: 'Calibrate' },
            { key: 'practice', label: 'Practice' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-active={tab === t.key ? "true" : "false"}
            >
              {t.label}
            </button>
          ))}
        </div>
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

      {tab === 'calibrate' && (
        <WedgeCalibrate
          matrix={matrixHook.matrix}
          saveMatrix={matrixHook.saveMatrix}
          sessionsHook={wedgeSessionsHook}
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
          className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 text-white rounded-2xl active:scale-[0.98] transition-colors"
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
        <div className="overflow-x-auto rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
                <th className="py-2 px-2">Club</th>
                <th className="py-2 px-2">Brand</th>
                <th className="py-2 px-2 hidden sm:table-cell">Model</th>
                <th className="py-2 px-2 hidden md:table-cell">Loft</th>
                <th className="py-2 px-2 hidden md:table-cell">Shaft</th>
                <th className="py-2 px-2 hidden lg:table-cell">Flex</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {sorted.map((c) => (
                <tr key={c.id} className="text-gray-300">
                  <td className="py-1.5 px-2 font-medium text-gray-50">{c.club_name}</td>
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

  const inputCls = 'w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/30';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="w-9 h-1 rounded-full bg-gray-700 mx-auto mb-3 sm:hidden" />
        <h2 className="text-lg font-semibold text-gray-50 mb-2">{club ? 'Edit Club' : 'Add Club'}</h2>
        <div>
          <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Club *</label>
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
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-800 text-gray-400 rounded-2xl hover:bg-gray-700 transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 text-white rounded-2xl active:scale-[0.98] disabled:opacity-50 transition-colors">
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

  const inputCls = 'w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 text-center focus:outline-none focus:ring-2 focus:ring-green-500/30';

  return (
    <div className="space-y-6">
      {/* System selector */}
      <div>
        <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Swing System</label>
        <div className="segmented-control">
          {(Object.entries(SWING_SYSTEM_LABELS) as [SwingSystem, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleSystemChange(key)}
              data-active={system === key ? "true" : "false"}
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
        <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Swing Lengths</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {swingLabels.map((label) => (
            <div key={label} className="flex items-center gap-1 bg-gray-800 rounded-full px-3 py-1">
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
            className="bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 w-40 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
          <button onClick={addCustomLabel} className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition-colors">
            Add
          </button>
        </div>
      </div>

      {/* Wedge clubs editor */}
      <div>
        <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Wedge Clubs</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {wedgeClubs.map((club) => (
            <div key={club} className="flex items-center gap-1 bg-gray-800 rounded-full px-3 py-1">
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
            className="bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 w-40 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
          <button onClick={addCustomClub} className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition-colors">
            Add
          </button>
        </div>
      </div>

      {/* Distance matrix grid */}
      {swingLabels.length > 0 && wedgeClubs.length > 0 && (
        <div>
          <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Carry Distances (yards)</label>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="py-2 px-2 text-left text-gray-500 font-medium w-20">Swing</th>
                  {wedgeClubs.map((club) => (
                    <th key={club} className="py-2 px-2 text-center text-gray-50 font-medium min-w-[80px]">
                      {club}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {swingLabels.map((label) => (
                  <tr key={label} className="border-t border-gray-800/60">
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
        className="px-5 py-2 text-sm bg-green-500 hover:bg-green-400 text-white rounded-2xl active:scale-[0.98] disabled:opacity-50 transition-colors"
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
          <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Min (yds)</label>
          <input
            type="number"
            value={minRange}
            onChange={(e) => setMinRange(parseInt(e.target.value) || 20)}
            className="w-20 bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Max (yds)</label>
          <input
            type="number"
            value={maxRange}
            onChange={(e) => setMaxRange(parseInt(e.target.value) || 120)}
            className="w-20 bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
        <button
          onClick={() => { setResults([]); generateTarget(); }}
          className="px-4 py-1.5 text-sm bg-green-500 hover:bg-green-400 text-white rounded-2xl active:scale-[0.98] transition-colors"
        >
          {results.length > 0 ? 'Reset & New Session' : 'Start Session'}
        </button>
      </div>

      {/* Target display */}
      {targetYards != null && (
        <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Target Distance</p>
            <p className="text-6xl font-bold text-green-400">{targetYards}</p>
            <p className="text-sm text-gray-500">yards</p>
          </div>

          {closestEntry && (
            <div className="bg-gray-800/50 rounded-2xl p-3 inline-block">
              <p className="text-xs text-gray-500 mb-1">Closest in your matrix</p>
              <p className="text-sm text-gray-50">
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
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Actual carry (yds)</label>
              <input
                type="number"
                value={resultYards}
                onChange={(e) => setResultYards(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') logResult(); }}
                placeholder="Enter result..."
                className="w-32 bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 text-center placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                autoFocus
              />
            </div>
            <button
              onClick={logResult}
              disabled={!resultYards}
              className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 text-white rounded-2xl active:scale-[0.98] disabled:opacity-50 mt-5 transition-colors"
            >
              Log & Next
            </button>
            <button
              onClick={generateTarget}
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl mt-5 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Score & results */}
      {score && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="text-2xl font-bold text-gray-50">{score.score}</div>
            <div className="text-[10px] text-gray-500">Score (out of 10)</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="text-2xl font-bold text-gray-50">{score.avgError} yds</div>
            <div className="text-[10px] text-gray-500">Avg Error</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="text-2xl font-bold text-gray-50">{score.total}</div>
            <div className="text-[10px] text-gray-500">Shots</div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Shot Log</h3>
          <div className="overflow-x-auto rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Target</th>
                  <th className="py-2 px-2">Actual</th>
                  <th className="py-2 px-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {results.map((r, i) => (
                  <tr key={i} className="text-gray-300">
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

// ============================================================
// Wedge calibration session
// ============================================================
function WedgeCalibrate({
  matrix,
  saveMatrix,
  sessionsHook,
}: {
  matrix: ReturnType<typeof useWedgeMatrix>['matrix'];
  saveMatrix: ReturnType<typeof useWedgeMatrix>['saveMatrix'];
  sessionsHook: ReturnType<typeof useWedgeSessions>;
}) {
  const { sessions, addSession, deleteSession } = sessionsHook;
  const { shots: allShots, loading: allShotsLoading } = useAllWedgeSessionShots();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [view, setView] = useState<'sessions' | 'averages'>('sessions');

  // New session form — default from matrix config if available
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newClubs, setNewClubs] = useState<string[]>(
    matrix?.wedge_clubs?.length ? [...matrix.wedge_clubs] : [...WEDGE_CLUB_PRESETS]
  );
  const [newLabels, setNewLabels] = useState<string[]>(
    matrix?.swing_labels?.length ? [...matrix.swing_labels] : ['7:30', '9:00', '10:30']
  );
  const [newNotes, setNewNotes] = useState('');

  const createSession = async () => {
    if (newClubs.length === 0 || newLabels.length === 0) return;
    const { data } = await addSession({
      session_date: newDate,
      clubs: newClubs,
      swing_labels: newLabels,
      notes: newNotes || null,
    });
    if (data) {
      setSelectedId(data.id);
      setShowNewSession(false);
      setNewNotes('');
    }
  };

  // Compute averages across ALL sessions
  const averages = useMemo(() => {
    if (allShots.length === 0) return null;
    const byCombo = new Map<string, number[]>();
    for (const s of allShots) {
      if (s.excluded) continue;
      const key = `${s.club}|${s.swing_label}`;
      if (!byCombo.has(key)) byCombo.set(key, []);
      byCombo.get(key)!.push(s.carry_yards);
    }
    const result: Record<string, { avg: number; count: number; stdDev: number }> = {};
    for (const [key, vals] of byCombo) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((sum, v) => sum + (v - avg) ** 2, 0) / vals.length;
      result[key] = { avg: Math.round(avg * 10) / 10, count: vals.length, stdDev: Math.round(Math.sqrt(variance) * 10) / 10 };
    }
    return result;
  }, [allShots]);

  // All unique clubs and labels across all sessions
  const allClubs = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => s.clubs.forEach((c) => set.add(c)));
    return Array.from(set);
  }, [sessions]);

  const allLabels = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => s.swing_labels.forEach((l) => set.add(l)));
    return Array.from(set);
  }, [sessions]);

  const applyToMatrix = async () => {
    if (!averages) return;
    const distances: Record<string, number> = { ...(matrix?.distances ?? {}) };
    for (const [key, { avg }] of Object.entries(averages)) {
      distances[key] = Math.round(avg);
    }
    await saveMatrix({
      swing_system: matrix?.swing_system ?? 'clock',
      swing_labels: allLabels.length > 0 ? allLabels : (matrix?.swing_labels ?? []),
      wedge_clubs: allClubs.length > 0 ? allClubs : (matrix?.wedge_clubs ?? []),
      distances,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Hit shots with each club/swing combo and record carry distances. Averages auto-update your wedge matrix.
        </p>
        <div className="segmented-control">
          <button onClick={() => setView('sessions')}
            data-active={view === 'sessions' ? "true" : "false"}>
            Sessions
          </button>
          <button onClick={() => setView('averages')}
            data-active={view === 'averages' ? "true" : "false"}>
            Averages
          </button>
        </div>
      </div>

      {view === 'averages' && (
        <AveragesView
          averages={averages}
          allClubs={allClubs}
          allLabels={allLabels}
          matrix={matrix}
          onApply={applyToMatrix}
        />
      )}

      {view === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session list */}
          <div className="space-y-3">
            <button onClick={() => setShowNewSession(true)}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-400 text-white text-sm rounded-2xl active:scale-[0.98] transition-colors">
              + New Calibration Session
            </button>

            {showNewSession && (
              <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-50">New Calibration Session</h3>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Wedge Clubs</label>
                  <div className="segmented-control">
                    {[...WEDGE_CLUB_PRESETS, '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°'].filter((c, i, arr) => arr.indexOf(c) === i).map((c) => (
                      <button key={c}
                        onClick={() => setNewClubs(newClubs.includes(c) ? newClubs.filter((x) => x !== c) : [...newClubs, c])}
                        data-active={newClubs.includes(c) ? "true" : "false"}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Swing Lengths</label>
                  <div className="segmented-control">
                    {(matrix?.swing_labels?.length ? matrix.swing_labels : ['7:30', '9:00', '10:30', 'Full']).map((l) => (
                      <button key={l}
                        onClick={() => setNewLabels(newLabels.includes(l) ? newLabels.filter((x) => x !== l) : [...newLabels, l])}
                        data-active={newLabels.includes(l) ? "true" : "false"}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
                  <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2}
                    className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                </div>
                <div className="flex gap-2">
                  <button onClick={createSession} disabled={newClubs.length === 0 || newLabels.length === 0}
                    className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-2xl active:scale-[0.98] transition-colors">Create</button>
                  <button onClick={() => setShowNewSession(false)}
                    className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-2xl transition-colors">Cancel</button>
                </div>
              </div>
            )}

            {sessions.length === 0 && !showNewSession && (
              <div className="text-center text-gray-600 py-8 text-sm">
                No calibration sessions yet. Start one to dial in your wedge distances.
              </div>
            )}

            {sessions.map((s) => (
              <button key={s.id} onClick={() => setSelectedId(s.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-colors ${
                  selectedId === s.id
                    ? 'bg-gray-800 ring-1 ring-green-500/30 text-gray-50'
                    : 'bg-gray-900 text-gray-400'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.session_date}</span>
                  <span className="text-xs text-gray-500">{s.clubs.length} clubs</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {s.clubs.join(', ')} — {s.swing_labels.join(', ')}
                </div>
              </button>
            ))}
          </div>

          {/* Session detail */}
          <div className="lg:col-span-2">
            {selectedId ? (
              <CalibrationDetail
                session={sessions.find((s) => s.id === selectedId)!}
                onDelete={async () => {
                  await deleteSession(selectedId);
                  setSelectedId(null);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-600 text-sm">
                Select a session to enter shot data
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Calibration session detail — enter shots per combo
// ============================================================
function CalibrationDetail({
  session,
  onDelete,
}: {
  session: WedgeSession;
  onDelete: () => void;
}) {
  const { shots, loading, addShot, deleteShot, toggleExcluded } = useWedgeSessionShots(session.id);
  const [activeClub, setActiveClub] = useState(session.clubs[0] ?? '');
  const [activeLabel, setActiveLabel] = useState(session.swing_labels[0] ?? '');
  const [carryInput, setCarryInput] = useState('');
  const [lateralInput, setLateralInput] = useState('');

  const handleAdd = async () => {
    if (!carryInput) return;
    const comboShots = shots.filter((s) => s.club === activeClub && s.swing_label === activeLabel);
    await addShot({
      session_id: session.id,
      club: activeClub,
      swing_label: activeLabel,
      carry_yards: parseFloat(carryInput),
      lateral_yards: lateralInput ? parseFloat(lateralInput) : null,
      shot_number: comboShots.length + 1,
      excluded: false,
      notes: null,
    });
    setCarryInput('');
    setLateralInput('');
  };

  // Shots for active combo
  const comboShots = shots.filter((s) => s.club === activeClub && s.swing_label === activeLabel);
  const includedShots = comboShots.filter((s) => !s.excluded);
  const comboAvg = includedShots.length > 0
    ? Math.round((includedShots.reduce((a, s) => a + s.carry_yards, 0) / includedShots.length) * 10) / 10
    : null;

  // Shot counts per combo for the grid
  const shotCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of shots) {
      if (s.excluded) continue;
      const key = `${s.club}|${s.swing_label}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [shots]);

  // Averages per combo for the grid
  const comboAverages = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const s of shots) {
      if (s.excluded) continue;
      const key = `${s.club}|${s.swing_label}`;
      if (!map[key]) map[key] = [];
      map[key].push(s.carry_yards);
    }
    const result: Record<string, number> = {};
    for (const [key, vals] of Object.entries(map)) {
      result[key] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    }
    return result;
  }, [shots]);

  if (loading) return <div className="text-gray-500 text-sm">Loading shots...</div>;

  return (
    <div className="space-y-4">
      {/* Combo selector grid */}
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="p-1.5 text-left text-gray-500 text-xs">Swing</th>
              {session.clubs.map((club) => (
                <th key={club} className="p-1.5 text-center text-gray-50 text-xs font-medium min-w-[70px]">{club}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {session.swing_labels.map((label) => (
              <tr key={label} className="border-t border-gray-800/60">
                <td className="p-1.5 text-gray-400 text-xs font-medium">{label}</td>
                {session.clubs.map((club) => {
                  const key = `${club}|${label}`;
                  const count = shotCounts[key] ?? 0;
                  const avg = comboAverages[key];
                  const isActive = activeClub === club && activeLabel === label;
                  return (
                    <td key={club} className="p-1.5">
                      <button
                        onClick={() => { setActiveClub(club); setActiveLabel(label); }}
                        className={`w-full px-2 py-1.5 text-xs rounded-xl transition-colors ${
                          isActive
                            ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                            : count > 0
                              ? 'bg-gray-800 text-green-400'
                              : 'bg-gray-900 text-gray-600'
                        }`}
                      >
                        {avg != null ? `${avg}` : '—'}
                        <span className="block text-[10px] text-gray-500">{count} shots</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Active combo entry */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-medium text-gray-50">{activeClub}</span>
          <span className="text-sm text-gray-500">@</span>
          <span className="text-sm font-medium text-gray-50">{activeLabel}</span>
          {comboAvg != null && (
            <span className="ml-auto text-sm text-green-400 font-medium">Avg: {comboAvg} yds</span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Carry (yds)</label>
            <input
              type="number"
              step="0.5"
              value={carryInput}
              onChange={(e) => setCarryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="85"
              autoFocus
              className="w-24 bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Offline (yds)</label>
            <input
              type="number"
              step="0.5"
              value={lateralInput}
              onChange={(e) => setLateralInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="+R / -L"
              className="w-24 bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
          <button onClick={handleAdd} disabled={!carryInput}
            className="px-4 py-1.5 text-sm bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-2xl active:scale-[0.98] transition-colors">
            Add Shot
          </button>
        </div>

        {/* Shots for this combo */}
        {comboShots.length > 0 && (
          <div className="mt-3 space-y-1">
            {comboShots.map((s, i) => (
              <div key={s.id}
                className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs ${s.excluded ? 'bg-gray-900/50 line-through text-gray-600' : 'bg-gray-800/50 text-gray-300'}`}>
                <span>
                  #{s.shot_number}: <span className="font-medium text-gray-50">{s.carry_yards} yds</span>
                  {s.lateral_yards != null && (
                    <span className="ml-2 text-gray-500">
                      {s.lateral_yards > 0 ? '+' : ''}{s.lateral_yards} offline
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => toggleExcluded(s.id, !s.excluded)}
                    className={`${s.excluded ? 'text-green-600 hover:text-green-400' : 'text-yellow-600 hover:text-yellow-400'}`}>
                    {s.excluded ? 'Include' : 'Exclude'}
                  </button>
                  <button onClick={() => deleteShot(s.id)} className="text-gray-600 hover:text-red-400">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress summary */}
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>
          {Object.keys(shotCounts).length} / {session.clubs.length * session.swing_labels.length} combos filled
          {' · '}
          {shots.filter((s) => !s.excluded).length} total shots
        </span>
        <button onClick={onDelete} className="text-gray-600 hover:text-red-400">Delete Session</button>
      </div>
    </div>
  );
}

// ============================================================
// Averages view — cross-session averages + apply to matrix
// ============================================================
function AveragesView({
  averages,
  allClubs,
  allLabels,
  matrix,
  onApply,
}: {
  averages: Record<string, { avg: number; count: number; stdDev: number }> | null;
  allClubs: string[];
  allLabels: string[];
  matrix: ReturnType<typeof useWedgeMatrix>['matrix'];
  onApply: () => Promise<void>;
}) {
  const [applying, setApplying] = useState(false);

  if (!averages || Object.keys(averages).length === 0) {
    return (
      <div className="text-center text-gray-600 py-12 text-sm">
        No calibration data yet. Complete a calibration session to see your averages.
      </div>
    );
  }

  const handleApply = async () => {
    setApplying(true);
    await onApply();
    setApplying(false);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-gray-500 font-medium">Swing</th>
              {allClubs.map((club) => (
                <th key={club} className="p-2 text-center text-gray-50 font-medium min-w-[100px]">{club}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allLabels.map((label) => (
              <tr key={label} className="border-t border-gray-800/60">
                <td className="p-2 text-gray-400 font-medium">{label}</td>
                {allClubs.map((club) => {
                  const key = `${club}|${label}`;
                  const data = averages[key];
                  const matrixVal = matrix?.distances?.[key];
                  const diff = data && matrixVal ? Math.round(data.avg) - matrixVal : null;
                  return (
                    <td key={club} className="p-2 text-center">
                      {data ? (
                        <div>
                          <div className="text-green-400 font-medium">{data.avg} yds</div>
                          <div className="text-[10px] text-gray-500">
                            {data.count} shots · ±{data.stdDev}
                          </div>
                          {diff != null && diff !== 0 && (
                            <div className={`text-[10px] ${diff > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                              {diff > 0 ? '+' : ''}{diff} vs matrix
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleApply} disabled={applying}
          className="px-5 py-2 text-sm bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-2xl active:scale-[0.98] transition-colors">
          {applying ? 'Updating...' : 'Apply Averages to Wedge Matrix'}
        </button>
        <p className="text-xs text-gray-500">
          This will update your wedge matrix distances with the calibrated averages. Existing matrix values for combos not tested will be preserved.
        </p>
      </div>
    </div>
  );
}
