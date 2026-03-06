'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useRounds, useRoundHoles } from '@/lib/hooks';
import { useSpeedSessions, useAllSpeedReadings, useWorkoutLogs } from '@/lib/hooks';
import { usePracticeSessions } from '@/lib/practice/hooks';
import { analyzeRound } from '@/lib/strokesGained';
import { generatePracticeReport } from '@/lib/practicePrioritizer';
import { calculateHandicap } from '@/lib/handicap';
import { computePersonalBests } from '@/lib/personalBests';

export default function HomePage() {
  return (
    <AuthGuard>
      <Nav />
      <Dashboard />
    </AuthGuard>
  );
}

// ============================================================
// Dashboard
// ============================================================

function Dashboard() {
  const { rounds, loading: roundsLoading } = useRounds();
  const { readings, loading: speedLoading } = useAllSpeedReadings();
  const { logs: workouts, loading: fitnessLoading } = useWorkoutLogs();
  const { sessions: practiceSessions, loading: practiceLoading } = usePracticeSessions();

  const loading = roundsLoading || speedLoading || fitnessLoading || practiceLoading;

  // Latest scored round
  const latestRound = useMemo(
    () => rounds.find((r) => r.total_score != null) ?? null,
    [rounds],
  );

  // Handicap Index (WHS when course ratings available, estimated otherwise)
  const handicapResult = useMemo(() => calculateHandicap(rounds), [rounds]);
  const handicapEstimate = handicapResult.index;

  // Speed training progress
  const speedStats = useMemo(() => {
    if (readings.length === 0) return null;
    const driverReadings = readings.filter(
      (r) => r.club === 'Driver' && r.clubhead_speed_mph != null,
    );
    if (driverReadings.length === 0) return null;
    const maxChs = Math.max(...driverReadings.map((r) => r.clubhead_speed_mph!));
    const recent = driverReadings.slice(-10);
    const avgRecent = recent.reduce((s, r) => s + r.clubhead_speed_mph!, 0) / recent.length;
    return { maxChs: Math.round(maxChs * 10) / 10, avgRecent: Math.round(avgRecent * 10) / 10, totalSessions: new Set(driverReadings.map((r) => r.session_id)).size };
  }, [readings]);

  // Activity streak (consecutive days with any activity: round, workout, practice)
  const streak = useMemo(() => {
    const activityDates = new Set<string>();
    for (const r of rounds) activityDates.add(r.round_date);
    for (const w of workouts) activityDates.add(w.workout_date);
    for (const p of practiceSessions) activityDates.add(p.created_at.split('T')[0]);

    if (activityDates.size === 0) return 0;

    let count = 0;
    const today = new Date();
    const d = new Date(today);
    // Check today first, then go backwards
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().split('T')[0];
      if (activityDates.has(dateStr)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else if (i === 0) {
        // Today might not have activity yet, check yesterday
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [rounds, workouts, practiceSessions]);

  // Recent activity count (last 30 days)
  const recentActivity = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

    return {
      rounds: rounds.filter((r) => r.round_date >= cutoff).length,
      workouts: workouts.filter((w) => w.workout_date >= cutoff).length,
      practice: practiceSessions.filter((p) => p.created_at.split('T')[0] >= cutoff).length,
    };
  }, [rounds, workouts, practiceSessions]);

  // Scoring trend (last 5 rounds)
  const scoringTrend = useMemo(() => {
    return rounds
      .filter((r) => r.total_score != null)
      .slice(0, 5)
      .reverse();
  }, [rounds]);

  const personalBests = useMemo(
    () => computePersonalBests(rounds, readings, workouts, practiceSessions),
    [rounds, readings, workouts, practiceSessions],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-gray-50 tracking-tight">Dashboard</h1>
        <p className="text-[15px] text-gray-500 mt-0.5">Your game at a glance</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-12 text-sm">Loading your data...</div>
      ) : (
        <>
          {/* Top stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              label={handicapResult.roundsWithRating >= 3 ? 'Handicap Index' : 'Est. Handicap'}
              value={handicapEstimate != null ? handicapEstimate.toFixed(1) : '—'}
              sub={handicapResult.roundsWithRating >= 3
                ? `WHS · ${handicapResult.roundsWithRating} rated rounds`
                : rounds.filter((r) => r.total_score != null).length > 0
                ? `${rounds.filter((r) => r.total_score != null).length} rounds`
                : 'No rounds yet'}
              color="text-green-400"
              href="/rounds"
            />
            <StatCard
              label="Last Round"
              value={latestRound ? `${latestRound.total_score}` : '—'}
              sub={latestRound
                ? `${latestRound.course_name} · ${latestRound.round_date}`
                : 'No rounds yet'}
              color="text-green-400"
              href="/rounds"
            />
            <StatCard
              label="Max Driver CHS"
              value={speedStats ? `${speedStats.maxChs}` : '—'}
              sub={speedStats ? `Avg ${speedStats.avgRecent} mph · ${speedStats.totalSessions} sessions` : 'No speed data'}
              color="text-orange-400"
              href="/speed"
              unit={speedStats ? ' mph' : ''}
            />
            <StatCard
              label="Activity Streak"
              value={streak > 0 ? `${streak}` : '0'}
              sub={`${recentActivity.rounds}R · ${recentActivity.workouts}W · ${recentActivity.practice}P last 30d`}
              color="text-purple-400"
              unit={streak > 0 ? ' days' : ''}
            />
          </div>

          {/* Middle row: Scoring trend + Practice recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-gray-50">Recent Scores</h2>
                <Link href="/rounds" className="text-[13px] text-green-400 hover:text-green-300">
                  View all
                </Link>
              </div>
              {scoringTrend.length > 0 ? (
                <ScoringMiniChart rounds={scoringTrend} />
              ) : (
                <div className="text-center text-gray-600 py-6 text-xs">
                  Enter your first round to see scoring trends
                </div>
              )}
            </div>
            <PracticeRecommendationCard latestRound={latestRound} handicap={handicapEstimate ?? 15} />
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-3 px-1">Quick Actions</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <QuickAction href="/play" label="Play" icon="flag" color="text-green-400" />
              <QuickAction href="/warmup" label="Warmup" icon="sun" color="text-yellow-400" />
              <QuickAction href="/practice" label="Practice" icon="target" color="text-purple-400" />
              <QuickAction href="/fitness" label="Workout" icon="heart" color="text-red-400" />
              <QuickAction href="/speed" label="Speed" icon="bolt" color="text-orange-400" />
              <QuickAction href="/challenges" label="Challenge" icon="trophy" color="text-yellow-400" />
            </div>
          </div>

          {personalBests.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2 px-1">Personal Bests</h2>
              <div className="bg-gray-900 rounded-2xl overflow-hidden divide-y divide-gray-800/60">
                {personalBests.map((pb, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-medium text-gray-200">{pb.label}</span>
                        {pb.isNew && (
                          <span className="text-[11px] font-bold text-yellow-400 bg-yellow-400/15 px-1.5 py-0.5 rounded-full">NEW</span>
                        )}
                      </div>
                      <div className="text-[13px] text-gray-500 truncate mt-0.5">{pb.detail}</div>
                    </div>
                    <span className="text-[17px] font-bold text-green-400 tabular-nums ml-3">{pb.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Stat Card
// ============================================================

function StatCard({
  label,
  value,
  sub,
  color,
  href,
  unit = '',
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  href?: string;
  unit?: string;
}) {
  const content = (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="text-[13px] text-gray-500 font-medium">{label}</div>
      <div className={`text-[22px] font-semibold ${color} mt-1 tracking-tight`}>
        {value}<span className="text-[13px] font-normal text-gray-500">{unit}</span>
      </div>
      <div className="text-[12px] text-gray-500 mt-1.5 truncate">{sub}</div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block hover:bg-gray-800/50 rounded-2xl transition-colors">{content}</Link>;
  }
  return content;
}

// ============================================================
// Scoring Mini Chart
// ============================================================

function ScoringMiniChart({ rounds }: { rounds: { total_score: number | null; course_name: string; round_date: string }[] }) {
  if (rounds.length === 0) return null;

  const scores = rounds.map((r) => r.total_score ?? 0);
  const min = Math.min(...scores) - 3;
  const max = Math.max(...scores) + 3;
  const range = max - min || 1;

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-24">
        {rounds.map((r, i) => {
          const score = r.total_score ?? 0;
          const pct = ((score - min) / range) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-gray-50">{score}</span>
              <div className="w-full bg-gray-800 rounded-t relative" style={{ height: `${Math.max(8, pct)}%` }}>
                <div className="absolute inset-0 bg-green-500/40 rounded-t" />
              </div>
              <span className="text-xs text-gray-500 truncate max-w-full">{r.course_name.slice(0, 10)}</span>
            </div>
          );
        })}
      </div>
      {scores.length >= 2 && (
        <div className="text-xs text-gray-500 text-center">
          {scores[scores.length - 1] <= scores[0]
            ? `Trending down ${scores[0] - scores[scores.length - 1]} strokes`
            : `Up ${scores[scores.length - 1] - scores[0]} strokes from ${rounds[0].round_date}`}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Practice Recommendation Card
// ============================================================

function PracticeRecommendationCard({
  latestRound,
  handicap,
}: {
  latestRound: { id: string; round_date: string; course_name: string; total_score: number | null; holes_played: number } | null;
  handicap: number;
}) {
  const { holes, loading } = useRoundHoles(latestRound?.id ?? null);

  const report = useMemo(() => {
    if (!latestRound || !latestRound.total_score || holes.length === 0) return null;
    const analysis = analyzeRound(latestRound as Parameters<typeof analyzeRound>[0], holes, handicap);
    return generatePracticeReport(analysis, latestRound.round_date, latestRound.course_name, latestRound.total_score);
  }, [latestRound, holes, handicap]);

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-gray-50">What to Practice</h2>
        <Link href="/practice" className="text-[13px] text-green-400 hover:text-green-300">
          Start session
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-6 text-xs">Loading...</div>
      ) : report && report.recommendations.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-2">
            Based on your last round at {report.courseName}
          </div>
          {report.recommendations.slice(0, 3).map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-xs font-bold mt-0.5 ${
                rec.category === 'putting' ? 'text-purple-400' :
                rec.category === 'short_game' ? 'text-yellow-400' :
                rec.category === 'approach' ? 'text-green-400' :
                'text-blue-400'
              }`}>
                {i + 1}.
              </span>
              <div>
                <div className="text-xs text-gray-50 font-medium">{rec.title}</div>
                <div className="text-xs text-gray-500">{rec.sgImpact.toFixed(1)} SG impact</div>
              </div>
            </div>
          ))}
          <Link
            href="/rounds"
            className="block text-center text-[13px] text-gray-500 hover:text-gray-300 mt-3 pt-2.5 border-t border-gray-800/30"
          >
            Full analysis
          </Link>
        </div>
      ) : (
        <div className="text-center text-gray-600 py-6 text-xs">
          {latestRound
            ? 'Add hole-by-hole data to your latest round for practice recommendations'
            : 'Log a round with hole-by-hole data to get practice recommendations'}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Quick Action Button
// ============================================================

function QuickAction({ href, label, icon, color }: { href: string; label: string; icon: string; color: string }) {
  const icons: Record<string, React.ReactNode> = {
    flag: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    target: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    heart: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    bolt: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    sun: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
    trophy: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m5.25-6.388V2.721" />
      </svg>
    ),
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-2 bg-gray-900 rounded-2xl px-4 py-3 hover:bg-gray-800 transition-all active:scale-[0.97]"
    >
      <span className={color}>{icons[icon]}</span>
      <span className="text-sm text-gray-50 font-medium">{label}</span>
    </Link>
  );
}
