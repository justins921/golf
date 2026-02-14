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
import type { ShotFilter, EnvironmentConditions } from '@/lib/types';

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
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const allClubs = useMemo(() => {
    const set = new Set(allShots.map((s) => s.club_name));
    return sortClubs(Array.from(set));
  }, [allShots]);

  // Select first club by default
  useEffect(() => {
    if (allClubs.length > 0 && !selectedClub) {
      setSelectedClub(allClubs[0]);
    }
  }, [allClubs, selectedClub]);

  const toggleSession = (id: string) => {
    const next = new Set(selectedSessionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSessionIds(next);
  };

  // Determine shots for the current view
  const { overlayGroups, aggregateStats, rollingInfo } = useMemo(() => {
    if (!selectedClub) return { overlayGroups: [], aggregateStats: [], rollingInfo: null };

    let shotsInScope = allShots;

    // Apply environment normalization
    if (distanceMode === 'normalized') {
      // Normalize each session's shots based on its environment
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

    const filtered = filterShots(shotsInScope, { ...filter, clubNames: [selectedClub] });

    if (mode === 'selected') {
      const groups = Array.from(selectedSessionIds).map((id, i) => {
        const session = sessions.find((s) => s.id === id);
        const sessionShots = filtered.filter((s) => s.session_id === id);
        return {
          label: session?.name ?? id.slice(0, 8),
          shots: sessionShots,
          color: COLORS[i % COLORS.length],
        };
      });
      const allFiltered = groups.flatMap((g) => g.shots);
      return {
        overlayGroups: groups,
        aggregateStats: computeClubStats(allFiltered),
        rollingInfo: null,
      };
    }

    if (mode === 'rolling') {
      const info = getClubSpecificSessions(allShots, selectedClub, sessions, rollingN);
      const rollingShots = filtered.filter((s) => info.sessionIds.includes(s.session_id));
      return {
        overlayGroups: [{ label: `Rolling ${rollingN} sessions`, shots: rollingShots, color: COLORS[0] }],
        aggregateStats: computeClubStats(rollingShots),
        rollingInfo: info,
      };
    }

    // all-time
    return {
      overlayGroups: [{ label: 'All-time', shots: filtered, color: COLORS[0] }],
      aggregateStats: computeClubStats(filtered),
      rollingInfo: null,
    };
  }, [allShots, sessions, selectedClub, mode, selectedSessionIds, rollingN, filter, distanceMode]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Compare Sessions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar controls */}
        <div className="space-y-4">
          {/* Mode selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Compare Mode</label>
            <div className="flex flex-col gap-1">
              {([
                { value: 'all-time' as CompareMode, label: 'All-time average' },
                { value: 'rolling' as CompareMode, label: 'Rolling last N' },
                { value: 'selected' as CompareMode, label: 'Selected sessions' },
              ] as const).map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`px-3 py-1.5 text-sm rounded text-left ${
                    mode === m.value ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'rolling' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rolling N</label>
              <input
                type="number"
                min={1}
                max={50}
                value={rollingN}
                onChange={(e) => setRollingN(parseInt(e.target.value) || 5)}
                className="w-20 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white"
              />
              {rollingInfo && (
                <p className="text-[10px] text-gray-600 mt-1">
                  Using {rollingInfo.totalSessions} sessions / {rollingInfo.totalShots} shots
                </p>
              )}
            </div>
          )}

          {/* Club selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Club</label>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {allClubs.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedClub(c)}
                  className={`px-3 py-1 text-sm rounded text-left ${
                    selectedClub === c ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Session selector (for selected mode) */}
          {mode === 'selected' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sessions</label>
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
            <label className="block text-xs text-gray-500 mb-1">Distance</label>
            <div className="flex gap-1">
              <button
                onClick={() => setDistanceMode('observed')}
                className={`px-2 py-1 text-xs rounded ${distanceMode === 'observed' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
              >
                Observed
              </button>
              <button
                onClick={() => setDistanceMode('normalized')}
                className={`px-2 py-1 text-xs rounded ${distanceMode === 'normalized' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
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
              className={`px-2 py-1 text-xs rounded ${chartMode === 'carry' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              Carry
            </button>
            <button
              onClick={() => setChartMode('total')}
              className={`px-2 py-1 text-xs rounded ${chartMode === 'total' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              Total
            </button>
          </div>

          <DispersionChart
            shots={[]}
            mode={chartMode}
            overlayGroups={overlayGroups}
            title={selectedClub ?? 'Select a club'}
            width={700}
            height={500}
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
