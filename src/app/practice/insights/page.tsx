'use client';

import { useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { usePracticeSessions, useAllPracticeShots } from '@/lib/practice/hooks';

export default function InsightsPage() {
  return (
    <AuthGuard>
      <Nav />
      <PracticeInsights />
    </AuthGuard>
  );
}

function PracticeInsights() {
  const { sessions, loading: sessionsLoading } = usePracticeSessions();
  const { shots, loading: shotsLoading } = useAllPracticeShots();

  const loading = sessionsLoading || shotsLoading;

  const stats = useMemo(() => {
    if (shots.length === 0) return null;

    const totalSessions = sessions.filter((s) => s.completed_at).length;
    const totalShots = shots.length;
    const nonMishits = shots.filter((s) => !s.is_mishit);

    // Overall scoring
    const pointsArray = nonMishits.map((s) => s.computed?.points ?? 0);
    const avgPoints = pointsArray.length > 0 ? Math.round(pointsArray.reduce((a, b) => a + b, 0) / pointsArray.length) : 0;
    const avgError = nonMishits.length > 0
      ? Math.round((nonMishits.reduce((s, sh) => s + Math.abs(sh.computed?.error ?? 0), 0) / nonMishits.length) * 10) / 10
      : 0;

    // By club
    const byClub: Record<string, { shots: number; totalPoints: number; totalError: number }> = {};
    for (const s of nonMishits) {
      if (!byClub[s.club_name]) byClub[s.club_name] = { shots: 0, totalPoints: 0, totalError: 0 };
      byClub[s.club_name].shots++;
      byClub[s.club_name].totalPoints += s.computed?.points ?? 0;
      byClub[s.club_name].totalError += Math.abs(s.computed?.error ?? 0);
    }

    const clubBreakdown = Object.entries(byClub)
      .map(([club, data]) => ({
        club,
        shots: data.shots,
        avgPoints: Math.round(data.totalPoints / data.shots),
        avgError: Math.round((data.totalError / data.shots) * 10) / 10,
      }))
      .sort((a, b) => b.shots - a.shots);

    // By category (from sessions)
    const byCategory: Record<string, { sessions: number; shots: number }> = {};
    for (const sess of sessions.filter((s) => s.completed_at)) {
      const cat = sess.category ?? 'unknown';
      if (!byCategory[cat]) byCategory[cat] = { sessions: 0, shots: 0 };
      byCategory[cat].sessions++;
    }
    for (const s of shots) {
      // Try to find the session category
      const sess = sessions.find((se) => se.id === s.practice_session_id);
      const cat = sess?.category ?? 'unknown';
      if (!byCategory[cat]) byCategory[cat] = { sessions: 0, shots: 0 };
      byCategory[cat].shots++;
    }

    // Trend: last 5 sessions avg vs previous 5
    const completedSessions = sessions.filter((s) => s.completed_at).slice(0, 10);
    let trend: number | null = null;
    if (completedSessions.length >= 6) {
      const recent5Ids = new Set(completedSessions.slice(0, 5).map((s) => s.id));
      const older5Ids = new Set(completedSessions.slice(5, 10).map((s) => s.id));
      const recentShots = nonMishits.filter((s) => recent5Ids.has(s.practice_session_id));
      const olderShots = nonMishits.filter((s) => older5Ids.has(s.practice_session_id));
      if (recentShots.length > 0 && olderShots.length > 0) {
        const recentAvg = recentShots.reduce((a, s) => a + (s.computed?.points ?? 0), 0) / recentShots.length;
        const olderAvg = olderShots.reduce((a, s) => a + (s.computed?.points ?? 0), 0) / olderShots.length;
        trend = Math.round(recentAvg - olderAvg);
      }
    }

    return {
      totalSessions,
      totalShots,
      avgPoints,
      avgError,
      clubBreakdown,
      byCategory: Object.entries(byCategory).sort((a, b) => b[1].shots - a[1].shots),
      trend,
    };
  }, [sessions, shots]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-50 mb-4">Practice Insights</h1>
        <p className="text-gray-500">No practice data yet. Complete some sessions to see your insights here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-50 mb-6">Practice Insights</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-50">{stats.totalSessions}</div>
          <div className="text-[10px] text-gray-500">Sessions</div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-50">{stats.totalShots}</div>
          <div className="text-[10px] text-gray-500">Total Shots</div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.avgPoints}</div>
          <div className="text-[10px] text-gray-500">Avg Points</div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-50">{stats.avgError} yds</div>
          <div className="text-[10px] text-gray-500">Avg Error</div>
        </div>
      </div>

      {/* Trend */}
      {stats.trend !== null && (
        <div className={`mb-6 p-3 rounded-lg border text-center text-sm ${
          stats.trend >= 0
            ? 'bg-green-600/10 border-green-600/30 text-green-400'
            : 'bg-red-600/10 border-red-600/30 text-red-400'
        }`}>
          {stats.trend >= 0 ? '+' : ''}{stats.trend} points avg trend (last 5 vs previous 5 sessions)
        </div>
      )}

      {/* By club */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Performance by Club</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="py-2 px-2">Club</th>
                <th className="py-2 px-2 text-center">Shots</th>
                <th className="py-2 px-2 text-center">Avg Points</th>
                <th className="py-2 px-2 text-center">Avg Error</th>
                <th className="py-2 px-2">Performance</th>
              </tr>
            </thead>
            <tbody>
              {stats.clubBreakdown.map((c) => (
                <tr key={c.club} className="border-b border-gray-800/50">
                  <td className="py-1.5 px-2 text-gray-50 font-medium">{c.club}</td>
                  <td className="py-1.5 px-2 text-center text-gray-400">{c.shots}</td>
                  <td className="py-1.5 px-2 text-center">
                    <span className={c.avgPoints >= 150 ? 'text-green-400' : c.avgPoints >= 100 ? 'text-yellow-400' : 'text-red-400'}>
                      {c.avgPoints}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-center text-gray-400">{c.avgError} yds</td>
                  <td className="py-1.5 px-2">
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${c.avgPoints >= 150 ? 'bg-green-500' : c.avgPoints >= 100 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, (c.avgPoints / 300) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By category */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Practice Distribution</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.byCategory.map(([cat, data]) => (
            <div key={cat} className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-50">{data.shots}</div>
              <div className="text-[10px] text-gray-500 capitalize">{cat.replace('_', ' ')} shots</div>
              <div className="text-[10px] text-gray-600">{data.sessions} sessions</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
