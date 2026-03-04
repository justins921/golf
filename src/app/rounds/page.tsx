'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useRounds, useRoundHoles } from '@/lib/hooks';
import type { Round, RoundHole } from '@/lib/types';
import { CLUB_ORDER, sortClubs } from '@/lib/types';
import RoundAnalysis from '@/components/RoundAnalysis';

export default function RoundsPage() {
  return (
    <AuthGuard>
      <Nav />
      <RoundTracker />
    </AuthGuard>
  );
}

function RoundTracker() {
  const { rounds, loading, addRound, updateRound, deleteRound } = useRounds();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [showNewRound, setShowNewRound] = useState(false);
  const [view, setView] = useState<'rounds' | 'stats' | 'analysis'>('rounds');

  // New round form
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCourse, setNewCourse] = useState('');
  const [newTees, setNewTees] = useState('');
  const [newHoles, setNewHoles] = useState(18);
  const [newNotes, setNewNotes] = useState('');

  const createRound = async () => {
    if (!newCourse) return;
    const { data } = await addRound({
      round_date: newDate,
      course_name: newCourse,
      tees: newTees || null,
      holes_played: newHoles,
      total_score: null,
      total_putts: null,
      total_fairways_hit: null,
      total_fairways: null,
      total_gir: null,
      total_penalties: 0,
      notes: newNotes || null,
    });
    if (data) {
      setSelectedRoundId(data.id);
      setShowNewRound(false);
      setNewCourse('');
      setNewTees('');
      setNewNotes('');
    }
  };

  // Stats
  const stats = useMemo(() => {
    if (rounds.length === 0) return null;
    const scored = rounds.filter((r) => r.total_score != null);
    if (scored.length === 0) return null;
    const scores = scored.map((r) => r.total_score!);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const best = Math.min(...scores);
    const last5 = scored.slice(0, 5).map((r) => r.total_score!);
    const last5Avg = last5.reduce((a, b) => a + b, 0) / last5.length;

    // Putting avg
    const withPutts = scored.filter((r) => r.total_putts != null);
    const avgPutts = withPutts.length > 0
      ? withPutts.reduce((a, r) => a + r.total_putts!, 0) / withPutts.length
      : null;

    // FIR
    const withFir = scored.filter((r) => r.total_fairways_hit != null && r.total_fairways != null && r.total_fairways! > 0);
    const avgFir = withFir.length > 0
      ? withFir.reduce((a, r) => a + (r.total_fairways_hit! / r.total_fairways!) * 100, 0) / withFir.length
      : null;

    // GIR
    const withGir = scored.filter((r) => r.total_gir != null);
    const avgGir = withGir.length > 0
      ? withGir.reduce((a, r) => a + r.total_gir!, 0) / withGir.length
      : null;

    return { total: rounds.length, scored: scored.length, avg, best, last5Avg, avgPutts, avgFir, avgGir };
  }, [rounds]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Rounds</h1>
        <div className="flex gap-2">
          {(['rounds', 'stats', 'analysis'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded ${view === v ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {v === 'rounds' ? 'Scorecards' : v === 'stats' ? 'Stats' : 'Analysis'}
            </button>
          ))}
        </div>
      </div>

      {view === 'stats' && <RoundStats stats={stats} rounds={rounds} />}

      {view === 'analysis' && (
        <RoundAnalysisView
          rounds={rounds}
          selectedRoundId={selectedRoundId}
          setSelectedRoundId={setSelectedRoundId}
        />
      )}

      {view === 'rounds' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Round list */}
          <div className="space-y-3">
            <button onClick={() => setShowNewRound(true)}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg">
              + New Round
            </button>

            {showNewRound && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-white">New Round</h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Course</label>
                  <input type="text" value={newCourse} onChange={(e) => setNewCourse(e.target.value)}
                    placeholder="Course name"
                    className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tees</label>
                    <input type="text" value={newTees} onChange={(e) => setNewTees(e.target.value)}
                      placeholder="Blue, White..."
                      className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Holes</label>
                    <div className="flex gap-1">
                      {[9, 18].map((n) => (
                        <button key={n} onClick={() => setNewHoles(n)}
                          className={`px-3 py-1 text-xs rounded ${newHoles === n ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2}
                    className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-white" />
                </div>
                <div className="flex gap-2">
                  <button onClick={createRound} disabled={!newCourse}
                    className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded">
                    Create
                  </button>
                  <button onClick={() => setShowNewRound(false)}
                    className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded">Cancel</button>
                </div>
              </div>
            )}

            {rounds.length === 0 && !showNewRound && (
              <div className="text-center text-gray-600 py-8 text-sm">
                No rounds recorded yet.
              </div>
            )}

            {rounds.map((r) => (
              <button key={r.id} onClick={() => setSelectedRoundId(r.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedRoundId === r.id
                    ? 'bg-gray-800 border-green-600/50 text-white'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.course_name}</span>
                  {r.total_score != null && (
                    <span className="text-lg font-bold text-green-400">{r.total_score}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{r.round_date}</span>
                  {r.tees && <span>{r.tees}</span>}
                  <span>{r.holes_played}H</span>
                  {r.total_putts != null && <span>{r.total_putts} putts</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Scorecard */}
          <div className="lg:col-span-2">
            {selectedRoundId ? (
              <Scorecard
                round={rounds.find((r) => r.id === selectedRoundId)!}
                onUpdate={updateRound}
                onDelete={async () => {
                  await deleteRound(selectedRoundId);
                  setSelectedRoundId(null);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-600 text-sm">
                Select a round to view or edit its scorecard
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Scorecard({
  round,
  onUpdate,
  onDelete,
}: {
  round: Round;
  onUpdate: (id: string, updates: Partial<Round>) => void;
  onDelete: () => void;
}) {
  const { holes, loading, upsertHoles } = useRoundHoles(round.id);
  const numHoles = round.holes_played;

  // Local state for editing
  const [localHoles, setLocalHoles] = useState<Partial<RoundHole>[]>(() =>
    Array.from({ length: numHoles }, (_, i) => ({
      hole_number: i + 1,
      par: 4,
      score: null,
      putts: null,
      fairway_hit: null,
      gir: null,
      up_and_down: null,
      sand_save: null,
      penalty_strokes: 0,
      club_off_tee: null,
      approach_distance_yd: null,
      notes: null,
    }))
  );
  const [saving, setSaving] = useState(false);

  // Load from DB when holes change
  useMemo(() => {
    if (holes.length > 0) {
      setLocalHoles(
        Array.from({ length: numHoles }, (_, i) => {
          const existing = holes.find((h) => h.hole_number === i + 1);
          return existing ?? {
            hole_number: i + 1,
            par: 4,
            score: null,
            putts: null,
            fairway_hit: null,
            gir: null,
            up_and_down: null,
            sand_save: null,
            penalty_strokes: 0,
            club_off_tee: null,
            approach_distance_yd: null,
            notes: null,
          };
        })
      );
    }
  }, [holes, numHoles]);

  const updateHole = (idx: number, field: string, value: unknown) => {
    const updated = [...localHoles];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalHoles(updated);
  };

  const saveScorecard = async () => {
    setSaving(true);
    const holeData = localHoles.map((h) => ({
      round_id: round.id,
      hole_number: h.hole_number!,
      par: h.par ?? 4,
      score: (h.score as number | null) ?? null,
      putts: (h.putts as number | null) ?? null,
      fairway_hit: (h.fairway_hit as boolean | null) ?? null,
      gir: (h.gir as boolean | null) ?? null,
      up_and_down: (h.up_and_down as boolean | null) ?? null,
      sand_save: (h.sand_save as boolean | null) ?? null,
      penalty_strokes: (h.penalty_strokes as number) ?? 0,
      club_off_tee: (h.club_off_tee as string | null) ?? null,
      approach_distance_yd: (h.approach_distance_yd as number | null) ?? null,
      notes: (h.notes as string | null) ?? null,
    }));
    await upsertHoles(round.id, holeData);

    // Update round totals
    const totalScore = holeData.reduce((a, h) => a + (h.score ?? 0), 0);
    const totalPutts = holeData.reduce((a, h) => a + (h.putts ?? 0), 0);
    const totalPar = holeData.reduce((a, h) => a + h.par, 0);
    const fairwayHoles = holeData.filter((h) => h.par >= 4);
    const firCount = fairwayHoles.filter((h) => h.fairway_hit === true).length;
    const girCount = holeData.filter((h) => h.gir === true).length;
    const penalties = holeData.reduce((a, h) => a + h.penalty_strokes, 0);

    const hasScores = holeData.some((h) => h.score != null && h.score > 0);
    await onUpdate(round.id, {
      total_score: hasScores ? totalScore : null,
      total_putts: hasScores ? totalPutts : null,
      total_fairways_hit: firCount,
      total_fairways: fairwayHoles.length,
      total_gir: girCount,
      total_penalties: penalties,
    });
    setSaving(false);
  };

  // Computed totals
  const totalPar = localHoles.reduce((a, h) => a + (h.par ?? 4), 0);
  const totalScore = localHoles.reduce((a, h) => a + ((h.score as number) ?? 0), 0);
  const totalPutts = localHoles.reduce((a, h) => a + ((h.putts as number) ?? 0), 0);
  const scoreToPar = totalScore - totalPar;

  if (loading) return <div className="text-gray-500 text-sm">Loading scorecard...</div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Score</div>
          <div className="text-xl font-bold text-white">{totalScore || '—'}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">To Par</div>
          <div className={`text-xl font-bold ${scoreToPar < 0 ? 'text-red-400' : scoreToPar > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {totalScore > 0 ? `${scoreToPar >= 0 ? '+' : ''}${scoreToPar}` : '—'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Putts</div>
          <div className="text-xl font-bold text-white">{totalPutts || '—'}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Par</div>
          <div className="text-xl font-bold text-gray-400">{totalPar}</div>
        </div>
      </div>

      {/* Hole-by-hole */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
              <th className="p-1.5 text-center w-10">Hole</th>
              <th className="p-1.5 text-center w-14">Par</th>
              <th className="p-1.5 text-center w-14">Score</th>
              <th className="p-1.5 text-center w-14">Putts</th>
              <th className="p-1.5 text-center w-14">FIR</th>
              <th className="p-1.5 text-center w-14">GIR</th>
              <th className="p-1.5 text-center w-14">Pen</th>
            </tr>
          </thead>
          <tbody>
            {localHoles.map((hole, idx) => {
              const score = hole.score as number | null;
              const par = hole.par ?? 4;
              let scoreColor = 'text-gray-300';
              if (score != null && score > 0) {
                const diff = score - par;
                if (diff <= -2) scoreColor = 'text-yellow-300 font-bold';
                else if (diff === -1) scoreColor = 'text-red-400';
                else if (diff === 0) scoreColor = 'text-gray-300';
                else if (diff === 1) scoreColor = 'text-blue-400';
                else scoreColor = 'text-blue-600';
              }

              return (
                <tr key={idx} className="border-b border-gray-800/50">
                  <td className="p-1.5 text-center text-gray-400 font-medium">{idx + 1}</td>
                  <td className="p-1.5 text-center">
                    <select value={hole.par ?? 4} onChange={(e) => updateHole(idx, 'par', parseInt(e.target.value))}
                      className="w-12 px-1 py-0.5 text-sm text-center bg-gray-900 border border-gray-700 rounded text-gray-300">
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="number" min={1} max={15}
                      value={(hole.score as number) ?? ''}
                      onChange={(e) => updateHole(idx, 'score', e.target.value ? parseInt(e.target.value) : null)}
                      className={`w-12 px-1 py-0.5 text-sm text-center bg-gray-900 border border-gray-700 rounded ${scoreColor}`} />
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="number" min={0} max={10}
                      value={(hole.putts as number) ?? ''}
                      onChange={(e) => updateHole(idx, 'putts', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-12 px-1 py-0.5 text-sm text-center bg-gray-900 border border-gray-700 rounded text-gray-300" />
                  </td>
                  <td className="p-1.5 text-center">
                    {par >= 4 ? (
                      <button onClick={() => updateHole(idx, 'fairway_hit', hole.fairway_hit === true ? false : hole.fairway_hit === false ? null : true)}
                        className={`w-8 h-6 text-xs rounded ${
                          hole.fairway_hit === true ? 'bg-green-600 text-white' :
                          hole.fairway_hit === false ? 'bg-red-600/50 text-red-300' :
                          'bg-gray-800 text-gray-600'
                        }`}>
                        {hole.fairway_hit === true ? 'Y' : hole.fairway_hit === false ? 'N' : '—'}
                      </button>
                    ) : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="p-1.5 text-center">
                    <button onClick={() => updateHole(idx, 'gir', hole.gir === true ? false : hole.gir === false ? null : true)}
                      className={`w-8 h-6 text-xs rounded ${
                        hole.gir === true ? 'bg-green-600 text-white' :
                        hole.gir === false ? 'bg-red-600/50 text-red-300' :
                        'bg-gray-800 text-gray-600'
                      }`}>
                      {hole.gir === true ? 'Y' : hole.gir === false ? 'N' : '—'}
                    </button>
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="number" min={0} max={5}
                      value={(hole.penalty_strokes as number) ?? 0}
                      onChange={(e) => updateHole(idx, 'penalty_strokes', parseInt(e.target.value) || 0)}
                      className="w-10 px-1 py-0.5 text-sm text-center bg-gray-900 border border-gray-700 rounded text-gray-300" />
                  </td>
                </tr>
              );
            })}
            {/* Front/back/total rows for 18 */}
            {numHoles === 18 && (
              <>
                <tr className="border-t-2 border-gray-700 bg-gray-800/50">
                  <td className="p-1.5 text-center text-xs text-gray-500 font-medium">OUT</td>
                  <td className="p-1.5 text-center text-xs text-gray-400">{localHoles.slice(0, 9).reduce((a, h) => a + (h.par as number ?? 4), 0)}</td>
                  <td className="p-1.5 text-center text-xs text-white font-medium">{localHoles.slice(0, 9).reduce((a, h) => a + ((h.score as number) ?? 0), 0) || '—'}</td>
                  <td className="p-1.5 text-center text-xs text-gray-400">{localHoles.slice(0, 9).reduce((a, h) => a + ((h.putts as number) ?? 0), 0) || '—'}</td>
                  <td colSpan={3} />
                </tr>
                <tr className="bg-gray-800/50">
                  <td className="p-1.5 text-center text-xs text-gray-500 font-medium">IN</td>
                  <td className="p-1.5 text-center text-xs text-gray-400">{localHoles.slice(9, 18).reduce((a, h) => a + (h.par as number ?? 4), 0)}</td>
                  <td className="p-1.5 text-center text-xs text-white font-medium">{localHoles.slice(9, 18).reduce((a, h) => a + ((h.score as number) ?? 0), 0) || '—'}</td>
                  <td className="p-1.5 text-center text-xs text-gray-400">{localHoles.slice(9, 18).reduce((a, h) => a + ((h.putts as number) ?? 0), 0) || '—'}</td>
                  <td colSpan={3} />
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={saveScorecard} disabled={saving}
          className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg">
          {saving ? 'Saving...' : 'Save Scorecard'}
        </button>
        <button onClick={onDelete} className="text-xs text-gray-600 hover:text-red-400">
          Delete Round
        </button>
      </div>

      {/* Score legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span><span className="text-yellow-300">Eagle+</span></span>
        <span><span className="text-red-400">Birdie</span></span>
        <span><span className="text-gray-300">Par</span></span>
        <span><span className="text-blue-400">Bogey</span></span>
        <span><span className="text-blue-600">Dbl+</span></span>
        <span>FIR/GIR: tap to cycle Y/N/—</span>
      </div>
    </div>
  );
}

function RoundStats({ stats, rounds }: {
  stats: { total: number; scored: number; avg: number; best: number; last5Avg: number; avgPutts: number | null; avgFir: number | null; avgGir: number | null } | null;
  rounds: Round[];
}) {
  if (!stats) {
    return (
      <div className="text-center text-gray-600 py-16 text-sm">
        No scored rounds yet. Enter a scorecard to see your stats.
      </div>
    );
  }

  const scored = rounds.filter((r) => r.total_score != null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">Scoring Avg</div>
          <div className="text-2xl font-bold text-white">{stats.avg.toFixed(1)}</div>
          <div className="text-xs text-gray-500">{stats.scored} rounds</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">Best Round</div>
          <div className="text-2xl font-bold text-green-400">{stats.best}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">Last 5 Avg</div>
          <div className="text-2xl font-bold text-white">{stats.last5Avg.toFixed(1)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">Avg Putts</div>
          <div className="text-2xl font-bold text-white">{stats.avgPutts?.toFixed(1) ?? '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">Avg Fairways Hit</div>
          <div className="text-2xl font-bold text-white">{stats.avgFir != null ? `${stats.avgFir.toFixed(0)}%` : '—'}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">Avg GIR</div>
          <div className="text-2xl font-bold text-white">{stats.avgGir != null ? `${((stats.avgGir / 18) * 100).toFixed(0)}%` : '—'}</div>
        </div>
      </div>

      {/* Scoring trend */}
      {scored.length > 1 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-4">Scoring Trend</h3>
          <div className="flex items-end gap-1 h-32">
            {[...scored].reverse().map((r, i) => {
              const score = r.total_score!;
              const min = stats.best - 2;
              const max = stats.avg + 10;
              const pct = Math.max(5, Math.min(100, ((score - min) / (max - min)) * 100));
              const isBest = score === stats.best;
              return (
                <div key={r.id} className="flex-1 flex flex-col items-center group relative">
                  <div className="flex-1" />
                  <div
                    className={`w-full rounded-t ${isBest ? 'bg-green-500' : 'bg-blue-600'}`}
                    style={{ height: `${pct}%`, minHeight: '4px' }}
                  />
                  <div className="hidden group-hover:block absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                    <div className="text-white">{r.round_date}</div>
                    <div className="text-green-400">{score} ({r.course_name})</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-500">
            <span>{scored[scored.length - 1]?.round_date}</span>
            <span>{scored[0]?.round_date}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundAnalysisView({
  rounds,
  selectedRoundId,
  setSelectedRoundId,
}: {
  rounds: Round[];
  selectedRoundId: string | null;
  setSelectedRoundId: (id: string | null) => void;
}) {
  const scoredRounds = rounds.filter((r) => r.total_score != null);
  const { holes, loading } = useRoundHoles(selectedRoundId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Round selector */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Select a round to analyze</h3>
        {scoredRounds.length === 0 && (
          <div className="text-center text-gray-600 py-8 text-sm">
            No scored rounds yet. Enter a scorecard first.
          </div>
        )}
        {scoredRounds.map((r) => (
          <button key={r.id} onClick={() => setSelectedRoundId(r.id)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
              selectedRoundId === r.id
                ? 'bg-gray-800 border-green-600/50 text-white'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{r.course_name}</span>
              <span className="text-lg font-bold text-green-400">{r.total_score}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{r.round_date}</span>
              {r.tees && <span>{r.tees}</span>}
              <span>{r.holes_played}H</span>
              {r.total_putts != null && <span>{r.total_putts} putts</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Analysis panel */}
      <div className="lg:col-span-2">
        {selectedRoundId && !loading ? (
          <RoundAnalysis
            round={scoredRounds.find((r) => r.id === selectedRoundId)!}
            holes={holes}
          />
        ) : loading ? (
          <div className="flex items-center justify-center h-64 text-gray-600 text-sm">
            Loading analysis...
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-600 text-sm">
            Select a round to see Strokes Gained analysis
          </div>
        )}
      </div>
    </div>
  );
}
