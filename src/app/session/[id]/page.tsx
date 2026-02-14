'use client';

import { useState, useMemo, useEffect, use } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import DispersionChart from '@/components/DispersionChart';
import ShotTable from '@/components/ShotTable';
import FilterBar from '@/components/FilterBar';
import StatsPanel from '@/components/StatsPanel';
import ConditionsPanel from '@/components/ConditionsPanel';
import RecommendationsPanel from '@/components/RecommendationsPanel';
import { useSessionShots } from '@/lib/hooks';
import { computeClubStats, filterShots } from '@/lib/stats';
import { normalizeShots } from '@/lib/environment';
import { createClient } from '@/lib/supabase';
import { shotsToCSV, statsToJSON, statsToCSV, downloadFile } from '@/lib/export';
import type { Session, ShotFilter, EnvironmentConditions } from '@/lib/types';
import { DEFAULT_FILTER } from '@/lib/types';

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <Nav />
      <SessionDetail sessionId={id} />
    </AuthGuard>
  );
}

function SessionDetail({ sessionId }: { sessionId: string }) {
  const { shots, loading, refetch } = useSessionShots(sessionId);
  const [session, setSession] = useState<Session | null>(null);
  const [filter, setFilter] = useState<ShotFilter>(DEFAULT_FILTER);
  const [mode, setMode] = useState<'carry' | 'total'>('carry');
  const [distanceMode, setDistanceMode] = useState<'observed' | 'normalized'>('observed');
  const [tab, setTab] = useState<'chart' | 'table' | 'recommendations'>('chart');

  const supabase = createClient();

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      if (data) setSession(data as Session);
    };
    fetchSession();
  }, [sessionId]);

  const filteredShots = useMemo(() => {
    let result = filterShots(shots, filter);
    if (distanceMode === 'normalized' && session?.environment) {
      result = normalizeShots(result, session.environment as EnvironmentConditions);
    }
    return result;
  }, [shots, filter, distanceMode, session]);

  const clubs = useMemo(() => {
    const set = new Set(shots.map((s) => s.club_name));
    return Array.from(set).sort();
  }, [shots]);

  const stats = useMemo(() => computeClubStats(filteredShots), [filteredShots]);

  const handleSaveConditions = async (env: EnvironmentConditions) => {
    await supabase.from('sessions').update({ environment: env }).eq('id', sessionId);
    setSession((s) => (s ? { ...s, environment: env } : s));
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{session?.name ?? 'Session'}</h1>
          <div className="flex gap-4 text-sm text-gray-500 mt-1">
            {session?.played_at && <span>{new Date(session.played_at).toLocaleDateString()}</span>}
            <span>{shots.length} shots</span>
            <span>{clubs.length} clubs</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadFile(shotsToCSV(filteredShots), `${session?.name ?? 'shots'}.csv`)}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
          >
            Export Shots CSV
          </button>
          <button
            onClick={() => downloadFile(statsToCSV(stats), `${session?.name ?? 'stats'}-stats.csv`)}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
          >
            Export Stats CSV
          </button>
          <button
            onClick={() => downloadFile(statsToJSON(stats), `${session?.name ?? 'stats'}-stats.json`, 'application/json')}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
          >
            Export Stats JSON
          </button>
        </div>
      </div>

      {/* Filters + mode toggles */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <FilterBar filter={filter} onChange={setFilter} clubs={clubs} />

        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setMode('carry')}
            className={`px-2 py-1 text-xs rounded ${mode === 'carry' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Carry
          </button>
          <button
            onClick={() => setMode('total')}
            className={`px-2 py-1 text-xs rounded ${mode === 'total' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            Total
          </button>
        </div>

        {session?.environment && (
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
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            {(['chart', 'table', 'recommendations'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-sm rounded ${
                  tab === t ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t === 'chart' ? 'Dispersion Chart' : t === 'table' ? 'Shot Table' : 'Recommendations'}
              </button>
            ))}
          </div>

          {tab === 'chart' && (
            <DispersionChart
              shots={filteredShots}
              mode={mode}
              title={session?.name}
              showOutliers
            />
          )}

          {tab === 'table' && (
            <ShotTable shots={filteredShots} onUpdate={refetch} />
          )}

          {tab === 'recommendations' && (
            <RecommendationsPanel clubStats={stats} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ConditionsPanel
            conditions={session?.environment as EnvironmentConditions | null}
            onSave={handleSaveConditions}
          />
          <StatsPanel stats={stats} title="Club Statistics" mode={mode} />
        </div>
      </div>
    </div>
  );
}
