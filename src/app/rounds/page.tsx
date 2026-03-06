'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useRounds, useRoundHoles } from '@/lib/hooks';
import type { Round, RoundHole } from '@/lib/types';
import { CLUB_ORDER, sortClubs } from '@/lib/types';
import RoundAnalysis from '@/components/RoundAnalysis';
import CourseSelector from '@/components/CourseSelector';
import { calculateHandicap } from '@/lib/handicap';
import type { ScoreDifferential } from '@/lib/handicap';
import { copyToClipboard, nativeShare, formatRoundSummary } from '@/lib/shareImage';

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
  const [view, setView] = useState<'rounds' | 'stats' | 'analysis' | 'handicap'>('rounds');

  // New round form
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCourse, setNewCourse] = useState('');
  const [newTees, setNewTees] = useState('');
  const [newHoles, setNewHoles] = useState(18);
  const [newNotes, setNewNotes] = useState('');
  const [newCourseRating, setNewCourseRating] = useState('');
  const [newSlopeRating, setNewSlopeRating] = useState('');

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
      course_rating: newCourseRating ? parseFloat(newCourseRating) : null,
      slope_rating: newSlopeRating ? parseInt(newSlopeRating) : null,
      notes: newNotes || null,
    });
    if (data) {
      setSelectedRoundId(data.id);
      setShowNewRound(false);
      setNewCourse('');
      setNewTees('');
      setNewCourseRating('');
      setNewSlopeRating('');
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
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-32 bg-gray-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="h-10 bg-gray-800 rounded-2xl animate-pulse" />
            <div className="h-20 bg-gray-900 rounded-2xl animate-pulse" />
            <div className="h-20 bg-gray-900 rounded-2xl animate-pulse" />
            <div className="h-20 bg-gray-900 rounded-2xl animate-pulse" />
          </div>
          <div className="lg:col-span-2">
            <div className="h-64 bg-gray-900 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-gray-50 tracking-tight">Rounds</h1>
        <div className="flex gap-2">
          {(['rounds', 'stats', 'analysis', 'handicap'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 text-sm ${view === v ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30 rounded-full' : 'bg-gray-800 text-gray-400 rounded-full'}`}>
              {v === 'rounds' ? 'Scorecards' : v === 'stats' ? 'Stats' : v === 'analysis' ? 'Analysis' : 'Handicap'}
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

      {view === 'handicap' && <HandicapView rounds={rounds} />}

      {view === 'rounds' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Round list */}
          <div className="space-y-3">
            <button onClick={() => setShowNewRound(true)}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-400 text-gray-50 text-sm rounded-2xl active:scale-[0.98]">
              + New Round
            </button>

            {showNewRound && (
              <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-medium text-gray-50">New Round</h3>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Date</label>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-4 py-3 text-[15px] bg-gray-800 border-0 rounded-xl text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40" />
                </div>
                <CourseSelector
                  compact
                  initialCourse={newCourse}
                  initialTees={newTees}
                  onSelect={({ courseName, tees, courseRating, slopeRating }) => {
                    setNewCourse(courseName);
                    setNewTees(tees);
                    setNewCourseRating(courseRating != null ? String(courseRating) : '');
                    setNewSlopeRating(slopeRating != null ? String(slopeRating) : '');
                  }}
                />
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Holes</label>
                  <div className="flex gap-1">
                    {[9, 18].map((n) => (
                      <button key={n} onClick={() => setNewHoles(n)}
                        className={`px-4 py-2 text-xs rounded-full ${newHoles === n ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
                  <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2}
                    className="w-full px-4 py-3 text-[15px] bg-gray-800 border-0 rounded-xl text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40" />
                </div>
                <div className="flex gap-2">
                  <button onClick={createRound} disabled={!newCourse}
                    className="px-3 py-1 text-sm bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-50 rounded-xl">
                    Create
                  </button>
                  <button onClick={() => setShowNewRound(false)}
                    className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded-xl">Cancel</button>
                </div>
              </div>
            )}

            {rounds.length === 0 && !showNewRound && (
              <div className="text-center py-16 text-[15px] text-gray-400">
                No rounds recorded yet.
              </div>
            )}

            <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800/60">
              {rounds.map((r) => (
                <button key={r.id} onClick={() => setSelectedRoundId(r.id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${
                    selectedRoundId === r.id
                      ? 'bg-gray-800 text-gray-50'
                      : 'text-gray-400 hover:bg-gray-800/50'
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
                    {r.course_rating != null && r.slope_rating != null && (
                      <span className="text-blue-400">{r.course_rating}/{r.slope_rating}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
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
              <div className="text-center py-16 text-[15px] text-gray-400">
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
      tee_miss_direction: null,
      approach_miss_direction: null,
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
      tee_miss_direction: (h.tee_miss_direction as string | null) ?? null,
      approach_miss_direction: (h.approach_miss_direction as string | null) ?? null,
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

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-2xl p-3 h-16 animate-pulse" />
        ))}
      </div>
      <div className="bg-gray-900 rounded-2xl h-64 animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-900 rounded-2xl p-3 text-center">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Score</div>
          <div className="text-xl font-bold text-gray-50">{totalScore || '—'}</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-3 text-center">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">To Par</div>
          <div className={`text-xl font-bold ${scoreToPar < 0 ? 'text-red-400' : scoreToPar > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {totalScore > 0 ? `${scoreToPar >= 0 ? '+' : ''}${scoreToPar}` : '—'}
          </div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-3 text-center">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Putts</div>
          <div className="text-xl font-bold text-gray-50">{totalPutts || '—'}</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-3 text-center">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Par</div>
          <div className="text-xl font-bold text-gray-400">{totalPar}</div>
        </div>
      </div>

      {/* Hole-by-hole */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/60 text-gray-500 text-xs uppercase">
                <th className="p-1.5 text-center w-10">Hole</th>
                <th className="p-1.5 text-center w-14">Par</th>
                <th className="p-1.5 text-center w-14">Score</th>
                <th className="p-1.5 text-center w-14">Putts</th>
                <th className="p-1.5 text-center w-14">FIR</th>
                <th className="p-1.5 text-center w-14">GIR</th>
                <th className="p-1.5 text-center w-16">Miss</th>
                <th className="p-1.5 text-center w-14">Pen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
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
                  <tr key={idx}>
                    <td className="p-1.5 text-center text-gray-400 font-medium">{idx + 1}</td>
                    <td className="p-1.5 text-center">
                      <select value={hole.par ?? 4} onChange={(e) => updateHole(idx, 'par', parseInt(e.target.value))}
                        className="w-12 px-1 py-0.5 text-sm text-center bg-gray-800 border-0 rounded-xl text-gray-300">
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </td>
                    <td className="p-1.5 text-center">
                      <input type="number" min={1} max={15}
                        value={(hole.score as number) ?? ''}
                        onChange={(e) => updateHole(idx, 'score', e.target.value ? parseInt(e.target.value) : null)}
                        className={`w-12 px-1 py-0.5 text-sm text-center bg-gray-800 border-0 rounded-xl ${scoreColor}`} />
                    </td>
                    <td className="p-1.5 text-center">
                      <input type="number" min={0} max={10}
                        value={(hole.putts as number) ?? ''}
                        onChange={(e) => updateHole(idx, 'putts', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-12 px-1 py-0.5 text-sm text-center bg-gray-800 border-0 rounded-xl text-gray-300" />
                    </td>
                    <td className="p-1.5 text-center">
                      {par >= 4 ? (
                        <button onClick={() => updateHole(idx, 'fairway_hit', hole.fairway_hit === true ? false : hole.fairway_hit === false ? null : true)}
                          className={`w-8 h-6 text-xs rounded-xl ${
                            hole.fairway_hit === true ? 'bg-green-500 text-gray-50' :
                            hole.fairway_hit === false ? 'bg-red-600/50 text-red-300' :
                            'bg-gray-800 text-gray-600'
                          }`}>
                          {hole.fairway_hit === true ? 'Y' : hole.fairway_hit === false ? 'N' : '—'}
                        </button>
                      ) : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="p-1.5 text-center">
                      <button onClick={() => updateHole(idx, 'gir', hole.gir === true ? false : hole.gir === false ? null : true)}
                        className={`w-8 h-6 text-xs rounded-xl ${
                          hole.gir === true ? 'bg-green-500 text-gray-50' :
                          hole.gir === false ? 'bg-red-600/50 text-red-300' :
                          'bg-gray-800 text-gray-600'
                        }`}>
                        {hole.gir === true ? 'Y' : hole.gir === false ? 'N' : '—'}
                      </button>
                    </td>
                    <td className="p-1.5 text-center">
                      {(hole.fairway_hit === false || hole.gir === false) ? (
                        <select
                          value={(hole.fairway_hit === false ? hole.tee_miss_direction : hole.approach_miss_direction) as string ?? ''}
                          onChange={(e) => {
                            const field = hole.fairway_hit === false ? 'tee_miss_direction' : 'approach_miss_direction';
                            updateHole(idx, field, e.target.value || null);
                          }}
                          className="w-14 px-0.5 py-0.5 text-xs bg-gray-800 border-0 rounded-xl text-gray-300">
                          <option value="">—</option>
                          <option value="left">L</option>
                          <option value="right">R</option>
                          <option value="short">Short</option>
                          <option value="long">Long</option>
                        </select>
                      ) : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="p-1.5 text-center">
                      <input type="number" min={0} max={5}
                        value={(hole.penalty_strokes as number) ?? 0}
                        onChange={(e) => updateHole(idx, 'penalty_strokes', parseInt(e.target.value) || 0)}
                        className="w-10 px-1 py-0.5 text-sm text-center bg-gray-800 border-0 rounded-xl text-gray-300" />
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
                    <td className="p-1.5 text-center text-xs text-gray-50 font-medium">{localHoles.slice(0, 9).reduce((a, h) => a + ((h.score as number) ?? 0), 0) || '—'}</td>
                    <td className="p-1.5 text-center text-xs text-gray-400">{localHoles.slice(0, 9).reduce((a, h) => a + ((h.putts as number) ?? 0), 0) || '—'}</td>
                    <td colSpan={4} />
                  </tr>
                  <tr className="bg-gray-800/50">
                    <td className="p-1.5 text-center text-xs text-gray-500 font-medium">IN</td>
                    <td className="p-1.5 text-center text-xs text-gray-400">{localHoles.slice(9, 18).reduce((a, h) => a + (h.par as number ?? 4), 0)}</td>
                    <td className="p-1.5 text-center text-xs text-gray-50 font-medium">{localHoles.slice(9, 18).reduce((a, h) => a + ((h.score as number) ?? 0), 0) || '—'}</td>
                    <td className="p-1.5 text-center text-xs text-gray-400">{localHoles.slice(9, 18).reduce((a, h) => a + ((h.putts as number) ?? 0), 0) || '—'}</td>
                    <td colSpan={4} />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={saveScorecard} disabled={saving}
            className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-50 rounded-xl">
            {saving ? 'Saving...' : 'Save Scorecard'}
          </button>
          <ShareRoundButton round={round} />
        </div>
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
      <div className="text-center py-16 text-[15px] text-gray-400">
        No scored rounds yet. Enter a scorecard to see your stats.
      </div>
    );
  }

  const scored = rounds.filter((r) => r.total_score != null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Scoring Avg</div>
          <div className="text-2xl font-bold text-gray-50">{stats.avg.toFixed(1)}</div>
          <div className="text-xs text-gray-500">{stats.scored} rounds</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Best Round</div>
          <div className="text-2xl font-bold text-green-400">{stats.best}</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Last 5 Avg</div>
          <div className="text-2xl font-bold text-gray-50">{stats.last5Avg.toFixed(1)}</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Avg Putts</div>
          <div className="text-2xl font-bold text-gray-50">{stats.avgPutts?.toFixed(1) ?? '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Avg Fairways Hit</div>
          <div className="text-2xl font-bold text-gray-50">{stats.avgFir != null ? `${stats.avgFir.toFixed(0)}%` : '—'}</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Avg GIR</div>
          <div className="text-2xl font-bold text-gray-50">{stats.avgGir != null ? `${((stats.avgGir / 18) * 100).toFixed(0)}%` : '—'}</div>
        </div>
      </div>

      {/* Scoring trend */}
      {scored.length > 1 && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <h3 className="text-sm font-medium text-gray-50 mb-4">Scoring Trend</h3>
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
                    className={`w-full rounded-t-xl ${isBest ? 'bg-green-500' : 'bg-blue-600'}`}
                    style={{ height: `${pct}%`, minHeight: '4px' }}
                  />
                  <div className="hidden group-hover:block absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 rounded-xl px-2 py-1 text-xs whitespace-nowrap z-10">
                    <div className="text-gray-50">{r.round_date}</div>
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

// ============================================================
// Handicap View
// ============================================================

function HandicapView({ rounds }: { rounds: Round[] }) {
  const result = useMemo(() => calculateHandicap(rounds), [rounds]);

  const trendData = useMemo(() => {
    // Build rolling handicap over time using all rounds with ratings
    const scored = rounds
      .filter((r) => r.total_score != null && r.holes_played >= 18)
      .sort((a, b) => a.round_date.localeCompare(b.round_date));

    const points: { date: string; index: number; course: string }[] = [];
    for (let i = 2; i < scored.length; i++) {
      const subset = scored.slice(0, i + 1);
      const hi = calculateHandicap(subset);
      if (hi.index != null) {
        points.push({
          date: scored[i].round_date,
          index: hi.index,
          course: scored[i].course_name,
        });
      }
    }
    return points;
  }, [rounds]);

  return (
    <div className="space-y-6">
      {/* Handicap Index card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-2xl p-6 text-center">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Handicap Index</div>
          <div className="text-4xl font-bold text-green-400 mt-2">
            {result.index != null ? result.index.toFixed(1) : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {result.roundsWithRating >= 3
              ? `Best ${result.numUsed} of ${result.differentials.length} differentials`
              : result.roundsWithRating > 0
              ? `Need ${3 - result.roundsWithRating} more rated rounds for WHS`
              : 'Estimated from scores (add course ratings for WHS)'}
          </div>
          {result.adjustment > 0 && (
            <div className="text-[10px] text-gray-600 mt-1">
              WHS adjustment: -{result.adjustment.toFixed(1)}
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 text-center">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Scored Rounds</div>
          <div className="text-4xl font-bold text-gray-50 mt-2">{result.totalScoredRounds}</div>
          <div className="text-xs text-gray-500 mt-2">
            {result.roundsWithRating} with course rating
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 text-center">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Low Differential</div>
          <div className="text-4xl font-bold text-gray-50 mt-2">
            {result.differentials.length > 0
              ? Math.min(...result.differentials.map((d) => d.differential)).toFixed(1)
              : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {result.differentials.length > 0
              ? result.differentials.reduce((best, d) => d.differential < best.differential ? d : best).courseName
              : 'No differentials yet'}
          </div>
        </div>
      </div>

      {/* Trend chart */}
      {trendData.length > 1 && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <h2 className="text-sm font-medium text-gray-50 mb-4">Handicap Trend</h2>
          <HandicapTrendChart data={trendData} />
        </div>
      )}

      {/* Differentials table */}
      {result.differentials.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <h2 className="text-sm font-medium text-gray-50 mb-3">Score Differentials (Last 20)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800/60 text-gray-500 text-xs uppercase">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Course</th>
                  <th className="p-2 text-center">Score</th>
                  <th className="p-2 text-center">Rating</th>
                  <th className="p-2 text-center">Slope</th>
                  <th className="p-2 text-center">Differential</th>
                  <th className="p-2 text-center">Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {result.differentials.map((d) => (
                  <tr key={d.roundId} className={`${d.used ? 'bg-green-500/5' : ''}`}>
                    <td className="p-2 text-gray-400 text-xs">{d.roundDate}</td>
                    <td className="p-2 text-gray-50 font-medium">{d.courseName}</td>
                    <td className="p-2 text-center text-gray-50 font-mono">{d.score}</td>
                    <td className="p-2 text-center text-gray-400">{d.courseRating.toFixed(1)}</td>
                    <td className="p-2 text-center text-gray-400">{d.slopeRating}</td>
                    <td className={`p-2 text-center font-mono ${d.used ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                      {d.differential.toFixed(1)}
                    </td>
                    <td className="p-2 text-center">
                      {d.used && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">
                          Used
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-gray-900 rounded-2xl p-4 text-xs text-gray-500">
        <h3 className="text-sm font-medium text-gray-400 mb-2">How WHS Handicap Works</h3>
        <ul className="space-y-1">
          <li><span className="text-gray-300 font-medium">Score Differential</span> = (113 / Slope) x (Score - Course Rating)</li>
          <li><span className="text-gray-300 font-medium">Handicap Index</span> = Average of best differentials from your last 20 rounds</li>
          <li>With 3-5 rounds: best 1 differential is used. With 20 rounds: best 8 are averaged.</li>
          <li>Add <span className="text-green-400">Course Rating</span> and <span className="text-green-400">Slope Rating</span> when creating rounds for accurate WHS calculation.</li>
          <li>Without course ratings, an estimated handicap is calculated using score - 72.</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// Handicap Trend Chart
// ============================================================

function HandicapTrendChart({ data }: { data: { date: string; index: number; course: string }[] }) {
  const maxHI = Math.max(...data.map((d) => d.index));
  const minHI = Math.min(...data.map((d) => d.index));
  const padding = Math.max(1, (maxHI - minHI) * 0.15);
  const yMax = maxHI + padding;
  const yMin = Math.max(0, minHI - padding);
  const yRange = yMax - yMin || 1;

  return (
    <div>
      <div className="flex items-end gap-1 h-40 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] text-gray-600">
          <span>{yMax.toFixed(0)}</span>
          <span>{((yMax + yMin) / 2).toFixed(0)}</span>
          <span>{yMin.toFixed(0)}</span>
        </div>
        {/* Chart area */}
        <div className="ml-10 flex-1 relative h-full">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-b border-gray-800/60" />
            <div className="border-b border-gray-800/60" />
            <div className="border-b border-gray-800/60" />
          </div>
          {/* Line chart using SVG */}
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${data.length - 1} 100`}>
            {/* Line */}
            <polyline
              fill="none"
              stroke="var(--color-green-400)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              points={data
                .map((d, i) => `${i},${100 - ((d.index - yMin) / yRange) * 100}`)
                .join(' ')}
            />
            {/* Points */}
            {data.map((d, i) => (
              <circle
                key={i}
                cx={i}
                cy={100 - ((d.index - yMin) / yRange) * 100}
                r="3"
                vectorEffect="non-scaling-stroke"
                fill="var(--color-green-400)"
                className="opacity-60"
              />
            ))}
          </svg>
          {/* Hover tooltips */}
          <div className="absolute inset-0 flex">
            {data.map((d, i) => (
              <div key={i} className="flex-1 group relative">
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 rounded-xl px-2 py-1 text-xs whitespace-nowrap z-10">
                  <div className="text-gray-50 font-medium">{d.index.toFixed(1)} HI</div>
                  <div className="text-gray-400">{d.date}</div>
                  <div className="text-gray-500">{d.course}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* X-axis */}
      <div className="ml-10 flex justify-between mt-2 text-[10px] text-gray-600">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
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
          <div className="text-center py-16 text-[15px] text-gray-400">
            No scored rounds yet. Enter a scorecard first.
          </div>
        )}
        <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800/60">
          {scoredRounds.map((r) => (
            <button key={r.id} onClick={() => setSelectedRoundId(r.id)}
              className={`w-full text-left px-4 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${
                selectedRoundId === r.id
                  ? 'bg-gray-800 text-gray-50'
                  : 'text-gray-400 hover:bg-gray-800/50'
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
      </div>

      {/* Analysis panel */}
      <div className="lg:col-span-2">
        {selectedRoundId && !loading ? (
          <RoundAnalysis
            round={scoredRounds.find((r) => r.id === selectedRoundId)!}
            holes={holes}
          />
        ) : loading ? (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl h-32 animate-pulse" />
            <div className="bg-gray-900 rounded-2xl h-48 animate-pulse" />
          </div>
        ) : (
          <div className="text-center py-16 text-[15px] text-gray-400">
            Select a round to see Strokes Gained analysis
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Share Round Button
// ============================================================

function ShareRoundButton({ round }: { round: Round }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = formatRoundSummary(round);
    const shared = await nativeShare({ title: `${round.course_name} — ${round.round_date}`, text });
    if (!shared) {
      const ok = await copyToClipboard(text);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl transition-colors"
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
