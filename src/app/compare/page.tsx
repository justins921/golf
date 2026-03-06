'use client';

import { useState, useMemo, useEffect } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import DispersionChart from '@/components/DispersionChart';
import FilterBar from '@/components/FilterBar';
import StatsPanel from '@/components/StatsPanel';
import ConditionsPanel from '@/components/ConditionsPanel';
import { useSessions, useAllShots } from '@/lib/hooks';
import { computeClubStats, filterShots, getClubSpecificSessions } from '@/lib/stats';
import { normalizeShots, simulateShots, STANDARD_CONDITIONS } from '@/lib/environment';
import { sortClubs, DEFAULT_FILTER } from '@/lib/types';
import type { Shot, ShotFilter, EnvironmentConditions } from '@/lib/types';

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

export default function ComparePage() {
  return (
    <AuthGuard>
      <Nav />
      <Compare />
    </AuthGuard>
  );
}

type CompareMode = 'selected' | 'all-time' | 'rolling';

function Compare() {
  const { sessions } = useSessions();
  const { shots: allShots, loading } = useAllShots();

  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<CompareMode>('all-time');
  const [rollingN, setRollingN] = useState(5);
  const [distanceMode, setDistanceMode] = useState<'observed' | 'normalized'>('observed');
  const [chartMode, setChartMode] = useState<'carry' | 'total'>('carry');
  const [filter, setFilter] = useState<ShotFilter>(DEFAULT_FILTER);
  const [selectedClubs, setSelectedClubs] = useState<Set<string>>(new Set());

  const allClubs = useMemo(() => {
    const set = new Set(allShots.map((s) => s.club_name));
    return sortClubs(Array.from(set));
  }, [allShots]);

  // Select first club by default
  useEffect(() => {
    if (allClubs.length > 0 && selectedClubs.size === 0) {
      setSelectedClubs(new Set([allClubs[0]]));
    }
  }, [allClubs, selectedClubs]);

  const toggleClub = (club: string) => {
    const next = new Set(selectedClubs);
    if (next.has(club)) {
      if (next.size > 1) next.delete(club); // keep at least one selected
    } else {
      next.add(club);
    }
    setSelectedClubs(next);
  };

  const toggleSession = (id: string) => {
    const next = new Set(selectedSessionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSessionIds(next);
  };

  // Determine shots for the current view
  const { overlayGroups, aggregateStats, rollingInfo } = useMemo(() => {
    if (selectedClubs.size === 0) return { overlayGroups: [] as { label: string; shots: Shot[]; color: string }[], aggregateStats: [] as ReturnType<typeof computeClubStats>, rollingInfo: null as { sessionIds: string[]; totalSessions: number; totalShots: number } | null };

    let shotsInScope = allShots;

    // Apply environment normalization
    if (distanceMode === 'normalized') {
      const normalizedShots = allShots.map((shot) => {
        const session = sessions.find((s) => s.id === shot.session_id);
        const env = session?.environment as EnvironmentConditions | null;
        if (env) {
          return normalizeShots([shot], env)[0];
        }
        return shot;
      });
      shotsInScope = normalizedShots;
    }

    const clubsArr = Array.from(selectedClubs);

    if (mode === 'selected') {
      // Each club x session combination becomes a group
      let colorIdx = 0;
      const groups: { label: string; shots: Shot[]; color: string }[] = [];
      for (const club of clubsArr) {
        const filtered = filterShots(shotsInScope, { ...filter, clubNames: [club] });
        for (const id of Array.from(selectedSessionIds)) {
          const session = sessions.find((s) => s.id === id);
          const sessionShots = filtered.filter((s) => s.session_id === id);
          if (sessionShots.length > 0) {
            groups.push({
              label: clubsArr.length > 1 ? `${club} – ${session?.name ?? id.slice(0, 8)}` : (session?.name ?? id.slice(0, 8)),
              shots: sessionShots,
              color: COLORS[colorIdx++ % COLORS.length],
            });
          }
        }
      }
      const allFiltered = groups.flatMap((g) => g.shots);
      return {
        overlayGroups: groups,
        aggregateStats: computeClubStats(allFiltered),
        rollingInfo: null,
      };
    }

    if (mode === 'rolling') {
      const groups: { label: string; shots: Shot[]; color: string }[] = [];
      let firstInfo: { sessionIds: string[]; totalSessions: number; totalShots: number } | null = null;
      clubsArr.forEach((club, i) => {
        const info = getClubSpecificSessions(allShots, club, sessions, rollingN);
        if (i === 0) firstInfo = info;
        const filtered = filterShots(shotsInScope, { ...filter, clubNames: [club] });
        const rollingShots = filtered.filter((s) => info.sessionIds.includes(s.session_id));
        groups.push({
          label: clubsArr.length > 1 ? `${club} (last ${rollingN})` : `Rolling ${rollingN} sessions`,
          shots: rollingShots,
          color: COLORS[i % COLORS.length],
        });
      });
      const allFiltered = groups.flatMap((g) => g.shots);
      return {
        overlayGroups: groups,
        aggregateStats: computeClubStats(allFiltered),
        rollingInfo: firstInfo,
      };
    }

    // all-time: one group per club
    const groups = clubsArr.map((club, i) => {
      const filtered = filterShots(shotsInScope, { ...filter, clubNames: [club] });
      return {
        label: clubsArr.length > 1 ? club : 'All-time',
        shots: filtered,
        color: COLORS[i % COLORS.length],
      };
    });
    const allFiltered = groups.flatMap((g) => g.shots);
    return {
      overlayGroups: groups,
      aggregateStats: computeClubStats(allFiltered),
      rollingInfo: null,
    };
  }, [allShots, sessions, selectedClubs, mode, selectedSessionIds, rollingN, filter, distanceMode]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-6">Compare Sessions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar controls */}
        <div className="space-y-4">
          {/* Mode selector */}
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Compare Mode</label>
            <div className="flex flex-row lg:flex-col gap-1 flex-wrap">
              {([
                { value: 'all-time' as CompareMode, label: 'All-time average' },
                { value: 'rolling' as CompareMode, label: 'Rolling last N' },
                { value: 'selected' as CompareMode, label: 'Selected sessions' },
              ] as const).map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`px-4 py-2 text-sm rounded-full text-left ${
                    mode === m.value ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'rolling' && (
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Rolling N</label>
              <input
                type="number"
                min={1}
                max={50}
                value={rollingN}
                onChange={(e) => setRollingN(parseInt(e.target.value) || 5)}
                className="w-20 bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
              {rollingInfo && (
                <p className="text-[10px] text-gray-600 mt-1">
                  Using {rollingInfo.totalSessions} sessions / {rollingInfo.totalShots} shots
                </p>
              )}
            </div>
          )}

          {/* Club selector (multi-select) */}
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Clubs</label>
            <div className="flex flex-row flex-wrap lg:flex-col gap-1 max-h-60 overflow-y-auto">
              {allClubs.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300 px-2 py-1 rounded-xl hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={selectedClubs.has(c)}
                    onChange={() => toggleClub(c)}
                    className="accent-green-500"
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Session selector (for selected mode) */}
          {mode === 'selected' && (
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Sessions</label>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {sessions.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.has(s.id)}
                      onChange={() => toggleSession(s.id)}
                      className="accent-green-500"
                    />
                    <span className="truncate">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Distance mode */}
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Distance</label>
            <div className="flex gap-1">
              <button
                onClick={() => setDistanceMode('observed')}
                className={`px-4 py-2 text-xs rounded-full ${distanceMode === 'observed' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'}`}
              >
                Observed
              </button>
              <button
                onClick={() => setDistanceMode('normalized')}
                className={`px-4 py-2 text-xs rounded-full ${distanceMode === 'normalized' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'}`}
              >
                Normalized
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          <FilterBar filter={filter} onChange={setFilter} />

          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setChartMode('carry')}
              className={`px-4 py-2 text-xs rounded-full ${chartMode === 'carry' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'}`}
            >
              Carry
            </button>
            <button
              onClick={() => setChartMode('total')}
              className={`px-4 py-2 text-xs rounded-full ${chartMode === 'total' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'}`}
            >
              Total
            </button>
          </div>

          <DispersionChart
            shots={[]}
            mode={chartMode}
            overlayGroups={overlayGroups}
            title={selectedClubs.size > 0 ? Array.from(selectedClubs).join(', ') : 'Select a club'}
          />

          <div className="mt-6">
            <StatsPanel stats={aggregateStats} title="Aggregate Statistics" mode={chartMode} />
          </div>

          {/* Per-session stats breakdown */}
          {mode === 'selected' && overlayGroups.length > 1 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-medium text-gray-400">Per-Session Breakdown</h3>
              {overlayGroups.map((group) => (
                <StatsPanel
                  key={group.label}
                  stats={computeClubStats(group.shots)}
                  title={group.label}
                  mode={chartMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
