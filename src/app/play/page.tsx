'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useRounds, useRoundHoles } from '@/lib/hooks';
import type { Round, RoundHole } from '@/lib/types';
import CourseSelector from '@/components/CourseSelector';

export default function PlayPage() {
  return (
    <AuthGuard>
      <PlayMode />
    </AuthGuard>
  );
}

// ============================================================
// Hole data (local state before saving)
// ============================================================

interface HoleEntry {
  hole_number: number;
  par: number;
  score: number | null;
  putts: number | null;
  fairway_hit: boolean | null;
  gir: boolean | null;
  penalty_strokes: number;
}

function emptyHoles(n: number): HoleEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    score: null,
    putts: null,
    fairway_hit: null,
    gir: null,
    penalty_strokes: 0,
  }));
}

// ============================================================
// Main
// ============================================================

function PlayMode() {
  const { rounds, addRound, updateRound } = useRounds();
  const [phase, setPhase] = useState<'setup' | 'playing' | 'summary'>('setup');
  const [roundId, setRoundId] = useState<string | null>(null);
  const { upsertHoles } = useRoundHoles(roundId);

  // Setup form
  const [course, setCourse] = useState('');
  const [tees, setTees] = useState('');
  const [holesCount, setHolesCount] = useState(18);
  const [courseRating, setCourseRating] = useState('');
  const [slopeRating, setSlopeRating] = useState('');

  // Playing state
  const [currentHole, setCurrentHole] = useState(0); // 0-indexed
  const [holes, setHoles] = useState<HoleEntry[]>(emptyHoles(18));
  const [saving, setSaving] = useState(false);

  // Suggest recent courses
  const recentCourses = useMemo(() => {
    const seen = new Set<string>();
    return rounds
      .filter((r) => {
        if (seen.has(r.course_name)) return false;
        seen.add(r.course_name);
        return true;
      })
      .slice(0, 5);
  }, [rounds]);

  // Start round
  const handleStart = async () => {
    if (!course) return;
    const { data } = await addRound({
      round_date: new Date().toISOString().split('T')[0],
      course_name: course,
      tees: tees || null,
      holes_played: holesCount,
      total_score: null,
      total_putts: null,
      total_fairways_hit: null,
      total_fairways: null,
      total_gir: null,
      total_penalties: 0,
      course_rating: courseRating ? parseFloat(courseRating) : null,
      slope_rating: slopeRating ? parseInt(slopeRating) : null,
      notes: null,
    });
    if (data) {
      setRoundId(data.id);
      setHoles(emptyHoles(holesCount));
      setCurrentHole(0);
      setPhase('playing');
    }
  };

  // Resume in-progress round
  const handleResume = (r: Round) => {
    setRoundId(r.id);
    setCourse(r.course_name);
    setHolesCount(r.holes_played);
    setHoles(emptyHoles(r.holes_played));
    setCurrentHole(0);
    setPhase('playing');
  };

  // Update hole locally
  const updateHole = useCallback((idx: number, field: keyof HoleEntry, value: unknown) => {
    setHoles((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  // Save all holes to DB
  const saveRound = useCallback(async () => {
    if (!roundId) return;
    setSaving(true);

    const holeData = holes.map((h) => ({
      round_id: roundId,
      hole_number: h.hole_number,
      par: h.par,
      score: h.score,
      putts: h.putts,
      fairway_hit: h.fairway_hit,
      gir: h.gir,
      up_and_down: null as boolean | null,
      sand_save: null as boolean | null,
      penalty_strokes: h.penalty_strokes,
      club_off_tee: null as string | null,
      approach_distance_yd: null as number | null,
      notes: null as string | null,
    }));

    await upsertHoles(roundId, holeData);

    // Update round totals
    const totalScore = holeData.reduce((a, h) => a + (h.score ?? 0), 0);
    const totalPutts = holeData.reduce((a, h) => a + (h.putts ?? 0), 0);
    const fairwayHoles = holeData.filter((h) => h.par >= 4);
    const firCount = fairwayHoles.filter((h) => h.fairway_hit === true).length;
    const girCount = holeData.filter((h) => h.gir === true).length;
    const penalties = holeData.reduce((a, h) => a + h.penalty_strokes, 0);
    const hasScores = holeData.some((h) => h.score != null && h.score > 0);

    await updateRound(roundId, {
      total_score: hasScores ? totalScore : null,
      total_putts: hasScores ? totalPutts : null,
      total_fairways_hit: firCount,
      total_fairways: fairwayHoles.length,
      total_gir: girCount,
      total_penalties: penalties,
    });

    setSaving(false);
  }, [roundId, holes, upsertHoles, updateRound]);

  // Navigate holes
  const goNext = useCallback(async () => {
    if (currentHole < holes.length - 1) {
      setCurrentHole((h) => h + 1);
    } else {
      // Last hole — save and show summary
      await saveRound();
      setPhase('summary');
    }
  }, [currentHole, holes.length, saveRound]);

  const goPrev = () => setCurrentHole((h) => Math.max(0, h - 1));

  // Running totals
  const totals = useMemo(() => {
    const scored = holes.filter((h) => h.score != null);
    const totalScore = scored.reduce((a, h) => a + h.score!, 0);
    const totalPar = scored.reduce((a, h) => a + h.par, 0);
    const totalPutts = scored.reduce((a, h) => a + (h.putts ?? 0), 0);
    const toPar = totalScore - totalPar;
    return { scored: scored.length, totalScore, totalPar, totalPutts, toPar };
  }, [holes]);

  // ============================================================
  // Setup Phase
  // ============================================================
  if (phase === 'setup') {
    // Check for in-progress rounds (no score yet, from today)
    const today = new Date().toISOString().split('T')[0];
    const inProgress = rounds.filter(
      (r) => r.total_score == null && r.round_date === today
    );

    return (
      <>
        <Nav />
        <div className="max-w-md mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-50 mb-6">Start Round</h1>

          {inProgress.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Resume In Progress</h2>
              {inProgress.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleResume(r)}
                  className="w-full text-left px-4 py-3 bg-gray-900 border border-yellow-500/30 rounded-lg mb-2 hover:bg-gray-800"
                >
                  <div className="text-sm font-medium text-gray-50">{r.course_name}</div>
                  <div className="text-xs text-gray-500">{r.tees || ''} {r.holes_played}H - Started today</div>
                </button>
              ))}
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
            <CourseSelector
              onSelect={(info) => {
                setCourse(info.courseName);
                setTees(info.tees);
                if (info.courseRating != null) setCourseRating(String(info.courseRating));
                if (info.slopeRating != null) setSlopeRating(String(info.slopeRating));
              }}
            />

            <div>
              <label className="block text-xs text-gray-500 mb-1">Holes</label>
              <div className="flex gap-2">
                {[9, 18].map((n) => (
                  <button
                    key={n}
                    onClick={() => setHolesCount(n)}
                    className={`flex-1 py-2.5 text-base rounded-lg ${
                      holesCount === n ? 'bg-green-600 text-gray-50' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual rating/slope override if not auto-filled */}
            {!courseRating && !slopeRating && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Course Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    value={courseRating}
                    onChange={(e) => setCourseRating(e.target.value)}
                    placeholder="72.3"
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Slope</label>
                  <input
                    type="number"
                    value={slopeRating}
                    onChange={(e) => setSlopeRating(e.target.value)}
                    placeholder="131"
                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-50"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={!course}
              className="w-full py-3 text-lg font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 text-gray-50 rounded-lg"
            >
              Start Round
            </button>
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // Playing Phase
  // ============================================================
  if (phase === 'playing') {
    const hole = holes[currentHole];
    const holeNum = currentHole + 1;
    const isLast = currentHole === holes.length - 1;

    // Score relative to par for color
    const scoreDiff = hole.score != null ? hole.score - hole.par : null;
    const scoreColor = scoreDiff == null ? 'text-gray-50'
      : scoreDiff <= -2 ? 'text-yellow-300'
      : scoreDiff === -1 ? 'text-red-400'
      : scoreDiff === 0 ? 'text-green-400'
      : scoreDiff === 1 ? 'text-blue-400'
      : 'text-blue-600';

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Top bar */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="text-sm text-gray-400">{course}</div>
          <div className="flex items-center gap-3 text-sm">
            {totals.scored > 0 && (
              <>
                <span className="text-gray-50 font-mono">{totals.totalScore}</span>
                <span className={`font-mono ${totals.toPar < 0 ? 'text-red-400' : totals.toPar > 0 ? 'text-blue-400' : 'text-green-400'}`}>
                  {totals.toPar >= 0 ? '+' : ''}{totals.toPar}
                </span>
              </>
            )}
            <span className="text-gray-600">Thru {totals.scored}</span>
          </div>
        </div>

        {/* Hole selector dots */}
        <div className="bg-gray-900/50 px-4 py-2 flex gap-1 justify-center overflow-x-auto">
          {holes.map((h, i) => {
            const filled = h.score != null;
            const isCurrent = i === currentHole;
            return (
              <button
                key={i}
                onClick={() => setCurrentHole(i)}
                className={`w-7 h-7 rounded-full text-[10px] font-medium flex items-center justify-center transition-colors ${
                  isCurrent
                    ? 'bg-green-600 text-gray-50'
                    : filled
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-800/50 text-gray-600'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Main hole entry */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
          <div className="text-gray-500 text-sm mb-1">Hole {holeNum}</div>

          {/* Par selector */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-gray-500 uppercase">Par</span>
            <div className="flex gap-1">
              {[3, 4, 5].map((p) => (
                <button
                  key={p}
                  onClick={() => updateHole(currentHole, 'par', p)}
                  className={`w-11 h-11 rounded-lg text-lg font-medium ${
                    hole.par === p
                      ? 'bg-green-600 text-gray-50'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Score - big number picker */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 uppercase text-center mb-2">Score</div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const curr = hole.score ?? hole.par;
                  if (curr > 1) updateHole(currentHole, 'score', curr - 1);
                }}
                className="w-14 h-14 rounded-full bg-gray-800 text-gray-300 text-2xl flex items-center justify-center active:bg-gray-700"
              >
                &minus;
              </button>
              <div className={`text-6xl font-bold ${scoreColor} min-w-[80px] text-center tabular-nums`}>
                {hole.score ?? '—'}
              </div>
              <button
                onClick={() => {
                  const curr = hole.score ?? (hole.par - 1);
                  updateHole(currentHole, 'score', curr + 1);
                }}
                className="w-14 h-14 rounded-full bg-gray-800 text-gray-300 text-2xl flex items-center justify-center active:bg-gray-700"
              >
                +
              </button>
            </div>
            {scoreDiff != null && (
              <div className={`text-center text-sm mt-1 ${scoreColor}`}>
                {scoreDiff === 0 ? 'Par' : scoreDiff === -1 ? 'Birdie' : scoreDiff === -2 ? 'Eagle' : scoreDiff < -2 ? 'Albatross' : scoreDiff === 1 ? 'Bogey' : scoreDiff === 2 ? 'Double' : `+${scoreDiff}`}
              </div>
            )}
          </div>

          {/* Putts */}
          <div className="mb-6">
            <div className="text-xs text-gray-500 uppercase text-center mb-2">Putts</div>
            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => updateHole(currentHole, 'putts', p)}
                  className={`w-12 h-12 rounded-lg text-lg font-medium ${
                    hole.putts === p
                      ? 'bg-blue-600 text-gray-50'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => updateHole(currentHole, 'putts', (hole.putts ?? 2) + 1 > 3 ? 4 : (hole.putts ?? 2) + 1)}
                className={`w-12 h-12 rounded-lg text-sm font-medium ${
                  hole.putts != null && hole.putts > 3
                    ? 'bg-blue-600 text-gray-50'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {hole.putts != null && hole.putts > 3 ? hole.putts : '4+'}
              </button>
            </div>
          </div>

          {/* FIR / GIR row */}
          <div className="flex gap-6 mb-6">
            {hole.par >= 4 && (
              <div>
                <div className="text-xs text-gray-500 uppercase text-center mb-2">Fairway</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateHole(currentHole, 'fairway_hit', hole.fairway_hit === true ? null : true)}
                    className={`w-14 h-11 rounded-lg text-sm font-medium ${
                      hole.fairway_hit === true ? 'bg-green-600 text-gray-50' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    Hit
                  </button>
                  <button
                    onClick={() => updateHole(currentHole, 'fairway_hit', hole.fairway_hit === false ? null : false)}
                    className={`w-14 h-11 rounded-lg text-sm font-medium ${
                      hole.fairway_hit === false ? 'bg-red-600/60 text-red-200' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    Miss
                  </button>
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500 uppercase text-center mb-2">Green</div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateHole(currentHole, 'gir', hole.gir === true ? null : true)}
                  className={`w-14 h-11 rounded-lg text-sm font-medium ${
                    hole.gir === true ? 'bg-green-600 text-gray-50' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  GIR
                </button>
                <button
                  onClick={() => updateHole(currentHole, 'gir', hole.gir === false ? null : false)}
                  className={`w-14 h-11 rounded-lg text-sm font-medium ${
                    hole.gir === false ? 'bg-red-600/60 text-red-200' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Miss
                </button>
              </div>
            </div>
          </div>

          {/* Penalty */}
          <div className="mb-4">
            <div className="text-xs text-gray-500 uppercase text-center mb-2">Penalty</div>
            <div className="flex gap-2 justify-center">
              {[0, 1, 2].map((p) => (
                <button
                  key={p}
                  onClick={() => updateHole(currentHole, 'penalty_strokes', p)}
                  className={`w-11 h-11 rounded-lg text-sm font-medium ${
                    hole.penalty_strokes === p
                      ? p === 0 ? 'bg-gray-700 text-gray-50' : 'bg-yellow-600 text-gray-50'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={goPrev}
            disabled={currentHole === 0}
            className="px-4 py-2.5 text-sm bg-gray-800 text-gray-400 rounded-lg disabled:opacity-30"
          >
            &larr; Prev
          </button>
          <button
            onClick={goNext}
            className={`flex-1 py-2.5 text-base font-medium rounded-lg ${
              isLast
                ? 'bg-green-600 hover:bg-green-500 text-gray-50'
                : 'bg-blue-600 hover:bg-blue-500 text-gray-50'
            }`}
          >
            {isLast ? 'Finish Round' : `Hole ${holeNum + 1} \u2192`}
          </button>
          <button
            onClick={async () => { await saveRound(); }}
            disabled={saving}
            className="px-4 py-2.5 text-sm bg-gray-800 text-gray-400 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Summary Phase
  // ============================================================
  const totalPar = holes.reduce((a, h) => a + h.par, 0);
  const totalScore = holes.reduce((a, h) => a + (h.score ?? 0), 0);
  const totalPutts = holes.reduce((a, h) => a + (h.putts ?? 0), 0);
  const scoreToPar = totalScore - totalPar;
  const firHoles = holes.filter((h) => h.par >= 4);
  const firCount = firHoles.filter((h) => h.fairway_hit === true).length;
  const girCount = holes.filter((h) => h.gir === true).length;
  const penalties = holes.reduce((a, h) => a + h.penalty_strokes, 0);

  // Score distribution
  const eagles = holes.filter((h) => h.score != null && h.score <= h.par - 2).length;
  const birdies = holes.filter((h) => h.score != null && h.score === h.par - 1).length;
  const pars = holes.filter((h) => h.score != null && h.score === h.par).length;
  const bogeys = holes.filter((h) => h.score != null && h.score === h.par + 1).length;
  const doubles = holes.filter((h) => h.score != null && h.score === h.par + 2).length;
  const others = holes.filter((h) => h.score != null && h.score >= h.par + 3).length;

  return (
    <>
      <Nav />
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-sm text-gray-500">{course}</div>
          <div className="text-5xl font-bold text-gray-50 mt-2">{totalScore}</div>
          <div className={`text-xl font-medium mt-1 ${scoreToPar < 0 ? 'text-red-400' : scoreToPar > 0 ? 'text-blue-400' : 'text-green-400'}`}>
            {scoreToPar >= 0 ? '+' : ''}{scoreToPar}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Putts</div>
            <div className="text-xl font-bold text-gray-50">{totalPutts}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">FIR</div>
            <div className="text-xl font-bold text-gray-50">
              {firHoles.length > 0 ? `${Math.round((firCount / firHoles.length) * 100)}%` : '—'}
            </div>
            <div className="text-[10px] text-gray-600">{firCount}/{firHoles.length}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">GIR</div>
            <div className="text-xl font-bold text-gray-50">
              {Math.round((girCount / holes.length) * 100)}%
            </div>
            <div className="text-[10px] text-gray-600">{girCount}/{holes.length}</div>
          </div>
        </div>

        {penalties > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center mb-6">
            <span className="text-sm text-yellow-400">{penalties} penalty stroke{penalties !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Score distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Score Distribution</h3>
          <div className="flex gap-2 justify-center">
            {[
              { label: 'Eagle+', count: eagles, color: 'bg-yellow-500' },
              { label: 'Birdie', count: birdies, color: 'bg-red-500' },
              { label: 'Par', count: pars, color: 'bg-green-500' },
              { label: 'Bogey', count: bogeys, color: 'bg-blue-500' },
              { label: 'Dbl', count: doubles, color: 'bg-blue-700' },
              { label: '3+', count: others, color: 'bg-purple-600' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-gray-50 ${item.color} ${item.count === 0 ? 'opacity-20' : ''}`}>
                  {item.count}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hole-by-hole mini scorecard */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Scorecard</h3>
          <div className="grid grid-cols-9 gap-1 text-center text-xs">
            {holes.slice(0, 9).map((h, i) => (
              <div key={i} className="space-y-0.5">
                <div className="text-gray-600">{i + 1}</div>
                <div className="text-gray-500">{h.par}</div>
                <div className={`font-medium ${getScoreColor(h.score, h.par)}`}>
                  {h.score ?? '—'}
                </div>
              </div>
            ))}
          </div>
          {holes.length > 9 && (
            <div className="grid grid-cols-9 gap-1 text-center text-xs mt-2 pt-2 border-t border-gray-800">
              {holes.slice(9, 18).map((h, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="text-gray-600">{i + 10}</div>
                  <div className="text-gray-500">{h.par}</div>
                  <div className={`font-medium ${getScoreColor(h.score, h.par)}`}>
                    {h.score ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/rounds"
            className="flex-1 py-3 text-center text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
          >
            View in Rounds
          </Link>
          <button
            onClick={() => {
              setPhase('setup');
              setRoundId(null);
              setCourse('');
              setTees('');
              setCourseRating('');
              setSlopeRating('');
            }}
            className="flex-1 py-3 text-center text-sm bg-green-600 text-gray-50 rounded-lg hover:bg-green-500"
          >
            New Round
          </button>
        </div>
      </div>
    </>
  );
}

function getScoreColor(score: number | null, par: number): string {
  if (score == null) return 'text-gray-600';
  const diff = score - par;
  if (diff <= -2) return 'text-yellow-300';
  if (diff === -1) return 'text-red-400';
  if (diff === 0) return 'text-green-400';
  if (diff === 1) return 'text-blue-400';
  return 'text-blue-600';
}
