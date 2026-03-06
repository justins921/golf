'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import YardageCardPreview from '@/components/YardageCardPreview';
import { useSessions, useAllShots, useWedgeMatrix } from '@/lib/hooks';
import { sortClubs } from '@/lib/types';
import type { YardageCardConfig, EnvironmentConditions } from '@/lib/types';
import { STANDARD_CONDITIONS } from '@/lib/environment';
import { getClubSpecificSessions } from '@/lib/stats';

export default function YardagePage() {
  return (
    <AuthGuard>
      <Nav />
      <YardageBuilder />
    </AuthGuard>
  );
}

function YardageBuilder() {
  const { sessions } = useSessions();
  const { shots: allShots, loading } = useAllShots();
  const { matrix: wedgeMatrix } = useWedgeMatrix();

  const allClubs = useMemo(() => {
    const set = new Set(allShots.map((s) => s.club_name));
    return sortClubs(Array.from(set));
  }, [allShots]);

  // Card config state
  const [scope, setScope] = useState<YardageCardConfig['scope']>('all-time');
  const [rollingN, setRollingN] = useState(5);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [fullShotsOnly, setFullShotsOnly] = useState(true);
  const [includedClubs, setIncludedClubs] = useState<string[]>([]);
  const [percentileBand, setPercentileBand] = useState<'P20-P80' | 'P10-P90'>('P20-P80');
  const [showGaps, setShowGaps] = useState(true);
  const [showTendency, setShowTendency] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [showDispersionArc, setShowDispersionArc] = useState(true);
  const [minShots, setMinShots] = useState(8);
  const [includeLowConfidence, setIncludeLowConfidence] = useState(false);
  const [distanceMode, setDistanceMode] = useState<'observed' | 'normalized' | 'simulated'>('observed');

  // Target-based mode
  const [targetMode, setTargetMode] = useState(false);
  const [targetDistance, setTargetDistance] = useState(150);
  const [targetTolerance, setTargetTolerance] = useState(10);

  // Destination environment
  const [destEnv, setDestEnv] = useState<EnvironmentConditions>({
    elevationFt: 0,
    temperatureF: 85,
    relativeHumidityPct: 40,
  });
  const [presetName, setPresetName] = useState('');

  // Build the session environment (average of all sessions or use standard)
  const sessionEnv = useMemo<EnvironmentConditions>(() => {
    const envsWithData = sessions
      .filter((s) => s.environment)
      .map((s) => s.environment as EnvironmentConditions);
    if (envsWithData.length === 0) return STANDARD_CONDITIONS;
    return {
      elevationFt: envsWithData.reduce((a, e) => a + e.elevationFt, 0) / envsWithData.length,
      temperatureF: envsWithData.reduce((a, e) => a + e.temperatureF, 0) / envsWithData.length,
      relativeHumidityPct: envsWithData.reduce((a, e) => a + e.relativeHumidityPct, 0) / envsWithData.length,
    };
  }, [sessions]);

  // Filter shots by scope
  const scopedShots = useMemo(() => {
    if (scope === 'all-time') return allShots;
    if (scope === 'rolling') {
      // For rolling, include all clubs — each club filters separately in the card component
      const sorted = [...sessions].sort((a, b) => {
        const da = a.played_at ?? '';
        const db = b.played_at ?? '';
        return db.localeCompare(da);
      });
      const recentIds = new Set(sorted.slice(0, rollingN).map((s) => s.id));
      return allShots.filter((s) => recentIds.has(s.session_id));
    }
    if (scope === 'selected') {
      const idSet = new Set(selectedSessionIds);
      return allShots.filter((s) => idSet.has(s.session_id));
    }
    return allShots;
  }, [allShots, sessions, scope, rollingN, selectedSessionIds]);

  const excludedCount = useMemo(
    () => scopedShots.filter((s) => s.excluded_from_card).length,
    [scopedShots]
  );

  const config: YardageCardConfig = {
    scope,
    rollingN,
    sessionIds: selectedSessionIds,
    fullShotsOnly,
    includedClubs,
    percentileBand,
    showGaps,
    showTendency,
    showConfidence,
    showDispersionArc,
    minShotThreshold: minShots,
    includeLowConfidence,
    distanceMode,
  };

  const toggleSession = (id: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleClub = (club: string) => {
    setIncludedClubs((prev) =>
      prev.includes(club) ? prev.filter((x) => x !== club) : [...prev, club]
    );
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-6">Yardage Card Builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Scope */}
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Dataset Scope</label>
            <div className="segmented-control">
              {[
                { value: 'all-time', label: 'All-time' },
                { value: 'rolling', label: 'Rolling last N' },
                { value: 'selected', label: 'Selected sessions' },
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => setScope(m.value as YardageCardConfig['scope'])}
                  data-active={scope === m.value ? "true" : "false"}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {scope === 'rolling' && (
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">N sessions</label>
              <input
                type="number"
                min={1}
                value={rollingN}
                onChange={(e) => setRollingN(parseInt(e.target.value) || 5)}
                className="w-20 bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
          )}

          {scope === 'selected' && (
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Sessions</label>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {sessions.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.includes(s.id)}
                      onChange={() => toggleSession(s.id)}
                      className="accent-green-500"
                    />
                    <span className="truncate">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Shot Filter</label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={fullShotsOnly}
                onChange={(e) => setFullShotsOnly(e.target.checked)}
                className="accent-green-500"
              />
              Full shots only (default)
            </label>
          </div>

          {/* Excluded shots notice */}
          {excludedCount > 0 && (
            <div className="bg-red-900/20 rounded-2xl p-2">
              <p className="text-xs text-red-400">
                {excludedCount} shot{excludedCount > 1 ? 's' : ''} excluded from card calculations.
                <span className="text-gray-500 ml-1">Manage in Shot Data.</span>
              </p>
            </div>
          )}

          {/* Percentile band */}
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Range Band</label>
            <div className="segmented-control">
              <button
                onClick={() => setPercentileBand('P20-P80')}
                data-active={percentileBand === 'P20-P80' ? "true" : "false"}
              >
                P20–P80
              </button>
              <button
                onClick={() => setPercentileBand('P10-P90')}
                data-active={percentileBand === 'P10-P90' ? "true" : "false"}
              >
                P10–P90
              </button>
            </div>
          </div>

          {/* Display options */}
          <div className="space-y-1">
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Display</label>
            {[
              { label: 'Show gaps', value: showGaps, set: setShowGaps },
              { label: 'Show dispersion arc', value: showDispersionArc, set: setShowDispersionArc },
              { label: 'Show tendency', value: showTendency, set: setShowTendency },
              { label: 'Include low-confidence clubs', value: includeLowConfidence, set: setIncludeLowConfidence },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={opt.value}
                  onChange={(e) => opt.set(e.target.checked)}
                  className="accent-green-500"
                />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Min shots */}
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Min shots per club</label>
            <input
              type="number"
              min={1}
              value={minShots}
              onChange={(e) => setMinShots(parseInt(e.target.value) || 8)}
              className="w-20 bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>

          {/* Club selection */}
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
              Clubs {includedClubs.length > 0 ? `(${includedClubs.length} selected)` : '(all)'}
            </label>
            <div className="segmented-control overflow-x-auto">
              {allClubs.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleClub(c)}
                  data-active={includedClubs.length === 0 || includedClubs.includes(c) ? "true" : "false"}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Distance mode / Destination card */}
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Distance Mode</label>
            <div className="segmented-control">
              {[
                { value: 'observed', label: 'Observed (home)' },
                { value: 'normalized', label: 'Normalized (std conditions)' },
                { value: 'simulated', label: 'Simulated (destination)' },
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => setDistanceMode(m.value as 'observed' | 'normalized' | 'simulated')}
                  data-active={distanceMode === m.value ? "true" : "false"}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {distanceMode === 'simulated' && (
            <div className="bg-gray-900 rounded-2xl p-3 space-y-2">
              <h4 className="text-xs font-medium text-gray-300">Destination Environment</h4>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name (e.g., Loreto – March)"
                className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500">Elevation (ft)</label>
                  <input
                    type="number"
                    value={destEnv.elevationFt}
                    onChange={(e) => setDestEnv({ ...destEnv, elevationFt: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-800 border-0 rounded-xl px-3 py-2 text-xs text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500">Temp (°F)</label>
                  <input
                    type="number"
                    value={destEnv.temperatureF}
                    onChange={(e) => setDestEnv({ ...destEnv, temperatureF: parseFloat(e.target.value) || 72 })}
                    className="w-full bg-gray-800 border-0 rounded-xl px-3 py-2 text-xs text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500">Humidity (%)</label>
                  <input
                    type="number"
                    value={destEnv.relativeHumidityPct}
                    onChange={(e) => setDestEnv({ ...destEnv, relativeHumidityPct: parseFloat(e.target.value) || 50 })}
                    className="w-full bg-gray-800 border-0 rounded-xl px-3 py-2 text-xs text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500">Pressure (inHg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={destEnv.pressureInHg ?? ''}
                    onChange={(e) => setDestEnv({ ...destEnv, pressureInHg: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="auto"
                    className="w-full bg-gray-800 border-0 rounded-xl px-3 py-2 text-xs text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <YardageCardPreview
            shots={scopedShots}
            config={config}
            sessionEnv={sessionEnv}
            destEnv={distanceMode === 'simulated' ? destEnv : null}
            wedgeMatrix={wedgeMatrix}
          />
        </div>
      </div>
    </div>
  );
}
