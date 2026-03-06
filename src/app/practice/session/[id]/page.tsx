'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { usePracticeSessions, usePracticeShots, useScoringSettings } from '@/lib/practice/hooks';
import { scoreShot, scoreSession, isWedgeClub } from '@/lib/practice/scoring';
import { useVoiceInput } from '@/lib/practice/voice';
import type { SessionPlan } from '@/lib/practice/types';

export default function SessionPage() {
  return (
    <AuthGuard>
      <Nav />
      <SessionLogger />
    </AuthGuard>
  );
}

function SessionLogger() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { sessions, completeSession } = usePracticeSessions();
  const { shots, addShot, undoLastShot, toggleMishit } = usePracticeShots(id);
  const { settings } = useScoringSettings();

  const session = sessions.find((s) => s.id === id);
  const plan = session?.plan as SessionPlan | null;

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Current state tracking for ladder-style programs
  const [carryInput, setCarryInput] = useState('');
  const [lateralInput, setLateralInput] = useState('');
  const [voiceAutoLog, setVoiceAutoLog] = useState(true);
  const [lastVoiceResult, setLastVoiceResult] = useState<{ value: number; transcript: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // We need a ref to the latest carryInput for voice auto-log
  const pendingVoiceLogRef = useRef<number | null>(null);

  // Compute where we are in the plan
  const progress = useMemo(() => {
    if (!plan || plan.blocks.length === 0) return null;

    let shotIdx = 0;
    for (let bi = 0; bi < plan.blocks.length; bi++) {
      const block = plan.blocks[bi];
      const targets = block.targets ?? [];
      const spt = block.shotsPerTarget ?? 3;
      const totalInBlock = targets.length > 0 ? targets.length * spt : (block.reps ?? 10);

      if (shotIdx + totalInBlock > shots.length) {
        // We're in this block
        const inBlock = shots.length - shotIdx;
        const targetIdx = targets.length > 0 ? Math.floor(inBlock / spt) : 0;
        const shotInTarget = targets.length > 0 ? inBlock % spt : inBlock;

        return {
          blockIdx: bi,
          block,
          targetIdx,
          currentTarget: targets[targetIdx] ?? null,
          currentClub: block.clubs?.[0] ?? null,
          shotInTarget,
          shotsPerTarget: spt,
          totalShots: plan.blocks.reduce((s, b) => {
            const t = b.targets ?? [];
            return s + (t.length > 0 ? t.length * (b.shotsPerTarget ?? 3) : (b.reps ?? 10));
          }, 0),
          isComplete: false,
        };
      }
      shotIdx += totalInBlock;
    }

    return {
      blockIdx: plan.blocks.length,
      block: plan.blocks[plan.blocks.length - 1],
      targetIdx: 0,
      currentTarget: null,
      currentClub: null,
      shotInTarget: 0,
      shotsPerTarget: 0,
      totalShots: plan.blocks.reduce((s, b) => {
        const t = b.targets ?? [];
        return s + (t.length > 0 ? t.length * (b.shotsPerTarget ?? 3) : (b.reps ?? 10));
      }, 0),
      isComplete: true,
    };
  }, [plan, shots.length]);

  // Scored shots for display
  const scoredShots = useMemo(() => {
    return shots.map((s) => ({
      ...s,
      score: s.computed ? {
        targetDistance: s.target_distance_yd,
        carryDistance: s.carry_distance_yd,
        lateralYds: s.lateral_yd ?? 0,
        error: s.computed.error,
        leaveDistance: s.computed.leaveDistance,
        sg: s.computed.sg,
        points: s.computed.points,
      } : scoreShot(
        s.target_distance_yd,
        s.carry_distance_yd,
        s.lateral_yd ?? 0,
        isWedgeClub(s.club_name),
        settings,
      ),
    }));
  }, [shots, settings]);

  const sessionScore = useMemo(() => {
    return scoreSession(scoredShots.map((s) => s.score));
  }, [scoredShots]);

  const handleLogShot = useCallback(async () => {
    if (!carryInput || !progress || progress.isComplete) return;

    const carry = parseFloat(carryInput);
    if (isNaN(carry)) return;

    const target = progress.currentTarget ?? 0;
    const club = progress.currentClub ?? 'PW';
    const lateral = lateralInput ? parseFloat(lateralInput) : 0;
    const isWedge = isWedgeClub(club);

    const scored = scoreShot(target, carry, lateral, isWedge, settings);

    await addShot({
      practice_session_id: id,
      timestamp: new Date().toISOString(),
      club_name: club,
      club_type: isWedge ? 'wedge' : 'iron',
      target_distance_yd: target,
      carry_distance_yd: carry,
      lateral_yd: lateral || null,
      is_mishit: false,
      computed: {
        error: scored.error,
        leaveDistance: scored.leaveDistance,
        sg: scored.sg,
        points: scored.points,
      },
      tags: null,
    });

    setCarryInput('');
    setLateralInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [carryInput, lateralInput, progress, id, settings, addShot]);

  // Voice-triggered auto-log: submit directly with the spoken number
  const handleVoiceLog = useCallback(async (carry: number) => {
    if (!progress || progress.isComplete) return;

    const target = progress.currentTarget ?? 0;
    const club = progress.currentClub ?? 'PW';
    const isWedge = isWedgeClub(club);
    const scored = scoreShot(target, carry, 0, isWedge, settings);

    setLastVoiceResult({ value: carry, transcript: `${carry} yds → ${scored.points} pts` });

    await addShot({
      practice_session_id: id,
      timestamp: new Date().toISOString(),
      club_name: club,
      club_type: isWedge ? 'wedge' : 'iron',
      target_distance_yd: target,
      carry_distance_yd: carry,
      lateral_yd: null,
      is_mishit: false,
      computed: {
        error: scored.error,
        leaveDistance: scored.leaveDistance,
        sg: scored.sg,
        points: scored.points,
      },
      tags: ['voice'],
    });

    setCarryInput('');
    // Clear the voice result after a moment
    setTimeout(() => setLastVoiceResult(null), 2000);
  }, [progress, id, settings, addShot]);

  // Voice input hook
  const voice = useVoiceInput({
    onNumber: useCallback((value: number) => {
      if (voiceAutoLog) {
        handleVoiceLog(value);
      } else {
        setCarryInput(value.toString());
        setLastVoiceResult({ value, transcript: `Heard: ${value}` });
        inputRef.current?.focus();
      }
    }, [voiceAutoLog, handleVoiceLog]),
    onCommand: useCallback((cmd: 'undo' | 'mishit' | 'skip' | 'done' | null) => {
      if (cmd === 'undo') undoLastShot();
    }, [undoLastShot]),
    continuous: true,
  });

  const handleComplete = async () => {
    voice.stop();
    await completeSession(id);
  };

  const handleUndo = async () => {
    await undoLastShot();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-6 w-40 bg-gray-800 rounded-2xl animate-pulse" />
        <div className="h-4 w-24 bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const isComplete = session.completed_at || progress?.isComplete;

  // ==================== RECAP SCREEN ====================
  if (isComplete && shots.length > 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-2">Session Complete</h1>
        <p className="text-sm text-gray-500 mb-6">
          {plan?.title ?? session.mode} &middot; {formatTime(elapsed)} &middot; {shots.length} shots
        </p>

        {/* Score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Points" value={sessionScore.totalPoints.toString()} />
          <StatCard label="Avg Points" value={sessionScore.avgPoints.toString()} highlight />
          <StatCard label="Avg Error" value={`${sessionScore.avgError} yds`} />
          <StatCard label="Avg Leave" value={`${sessionScore.avgLeave} yds`} />
        </div>

        {/* Shot log */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Shot Log</h3>
          <ShotLogTable shots={scoredShots} onToggleMishit={toggleMishit} />
        </div>

        <div className="flex gap-3 mt-6">
          {!session.completed_at && (
            <button
              onClick={handleComplete}
              className="px-5 py-2 text-sm bg-green-500 text-gray-50 rounded-2xl hover:bg-green-400 active:scale-[0.98] transition-all"
            >
              Save & Finish
            </button>
          )}
          <button
            onClick={() => router.push('/practice')}
            className="px-5 py-2 text-sm bg-gray-800 text-gray-400 rounded-2xl hover:bg-gray-700"
          >
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  // ==================== ACTIVE SESSION ====================
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-50">{plan?.title ?? 'Practice'}</h1>
          <p className="text-xs text-gray-500">{formatTime(elapsed)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={shots.length === 0}
            className="px-3 py-1.5 text-xs bg-gray-800 text-gray-400 rounded-full hover:bg-gray-700 disabled:opacity-30"
          >
            Undo
          </button>
          <button
            onClick={handleComplete}
            className="px-3 py-1.5 text-xs bg-red-600/80 text-gray-50 rounded-full hover:bg-red-600"
          >
            End
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {progress && progress.totalShots > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Shot {shots.length + 1} of {progress.totalShots}</span>
            <span>{Math.round((shots.length / progress.totalShots) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-green-500 rounded-full h-2 transition-all duration-300"
              style={{ width: `${(shots.length / progress.totalShots) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Current target display */}
      {progress && !progress.isComplete && (
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {progress.block.name}
            {progress.currentClub ? ` — ${progress.currentClub}` : ''}
          </p>

          {progress.currentTarget != null && (
            <>
              <p className="text-6xl font-bold text-green-400 my-2">{progress.currentTarget}</p>
              <p className="text-sm text-gray-500 mb-1">yards</p>
              <p className="text-xs text-gray-600">
                Shot {progress.shotInTarget + 1} of {progress.shotsPerTarget} at this target
              </p>
            </>
          )}

          {/* Voice input */}
          {voice.supported && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                onClick={voice.toggle}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  voice.listening
                    ? 'bg-red-600 hover:bg-red-500 animate-pulse shadow-lg shadow-red-600/30'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
                title={voice.listening ? 'Stop listening' : 'Start voice input'}
              >
                <svg className="w-7 h-7 text-gray-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </button>
              <div className="text-center">
                {voice.listening && !lastVoiceResult && (
                  <p className="text-xs text-gray-400 animate-pulse">Listening... say a number</p>
                )}
                {lastVoiceResult && (
                  <p className="text-xs text-green-400">{lastVoiceResult.transcript}</p>
                )}
                {!voice.listening && !lastVoiceResult && (
                  <p className="text-xs text-gray-600">Tap mic to speak your yardage</p>
                )}
              </div>
              {voice.listening && (
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceAutoLog}
                    onChange={(e) => setVoiceAutoLog(e.target.checked)}
                    className="accent-green-500"
                  />
                  Auto-log on voice (say &quot;undo&quot; to take back)
                </label>
              )}
            </div>
          )}

          {/* Manual input */}
          <div className="mt-4">
            <p className="text-[10px] text-gray-600 mb-2">{voice.supported ? 'Or type manually:' : 'Enter carry distance:'}</p>
            <div className="flex items-end gap-3 justify-center">
              <div>
                <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Carry (yds)</label>
                <input
                  ref={inputRef}
                  type="number"
                  value={carryInput}
                  onChange={(e) => setCarryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogShot(); }}
                  placeholder="Enter carry..."
                  className="w-28 bg-gray-800/60 rounded-xl px-4 py-3 text-lg text-gray-50 text-center placeholder-gray-600 font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  autoFocus={!voice.supported}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Lateral (opt)</label>
                <input
                  type="number"
                  value={lateralInput}
                  onChange={(e) => setLateralInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogShot(); }}
                  placeholder="±"
                  className="w-20 bg-gray-800 border-0 rounded-xl px-2 py-3 text-lg text-gray-50 text-center placeholder-gray-600 font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
                />
              </div>
              <button
                onClick={handleLogShot}
                disabled={!carryInput}
                className="px-5 py-3 text-sm bg-green-500 text-gray-50 rounded-2xl hover:bg-green-400 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live stats */}
      {shots.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Avg Points" value={sessionScore.avgPoints.toString()} highlight />
          <StatCard label="Avg Error" value={`${sessionScore.avgError} yds`} />
          <StatCard label="Shots" value={shots.length.toString()} />
        </div>
      )}

      {/* Recent shots (last 5) */}
      {scoredShots.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Recent Shots</h3>
          <ShotLogTable shots={scoredShots.slice(-8).reverse()} onToggleMishit={toggleMishit} compact />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Shared components
// ============================================================

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-3 text-center">
      <div className={`text-xl font-bold ${highlight ? 'text-green-400' : 'text-gray-50'}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function ShotLogTable({
  shots,
  onToggleMishit,
  compact,
}: {
  shots: { id: string; club_name: string; target_distance_yd: number; carry_distance_yd: number; lateral_yd: number | null; is_mishit: boolean; score: { error: number; points: number; leaveDistance: number } }[];
  onToggleMishit: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800/60 text-gray-500 text-left text-xs">
            <th className="py-1.5 px-2">Club</th>
            <th className="py-1.5 px-2">Target</th>
            <th className="py-1.5 px-2">Carry</th>
            <th className="py-1.5 px-2">Error</th>
            {!compact && <th className="py-1.5 px-2 hidden sm:table-cell">Leave</th>}
            <th className="py-1.5 px-2">Pts</th>
            <th className="py-1.5 px-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {shots.map((s) => (
            <tr key={s.id} className={`${s.is_mishit ? 'opacity-50' : ''}`}>
              <td className="py-1.5 px-2 text-gray-300">{s.club_name}</td>
              <td className="py-1.5 px-2 text-gray-400">{s.target_distance_yd}</td>
              <td className="py-1.5 px-2 text-gray-300">{s.carry_distance_yd}</td>
              <td className={`py-1.5 px-2 font-mono ${
                Math.abs(s.score.error) <= 3 ? 'text-green-400' :
                Math.abs(s.score.error) <= 7 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {s.score.error > 0 ? '+' : ''}{s.score.error.toFixed(1)}
              </td>
              {!compact && (
                <td className="py-1.5 px-2 text-gray-500 hidden sm:table-cell">{s.score.leaveDistance}</td>
              )}
              <td className="py-1.5 px-2 font-mono">
                <span className={
                  s.score.points >= 200 ? 'text-green-400' :
                  s.score.points >= 100 ? 'text-yellow-400' : 'text-red-400'
                }>
                  {s.score.points}
                </span>
              </td>
              <td className="py-1.5 px-2">
                <button
                  onClick={() => onToggleMishit(s.id)}
                  className={`text-xs ${s.is_mishit ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
                  title={s.is_mishit ? 'Unmark mishit' : 'Mark as mishit'}
                >
                  {s.is_mishit ? 'mishit' : '~'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
