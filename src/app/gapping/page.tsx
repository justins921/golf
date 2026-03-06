'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useAllShots, useSessions } from '@/lib/hooks';
import type { Shot } from '@/lib/types';
import { CLUB_ORDER, sortClubs } from '@/lib/types';
import { percentile, mean, filterShots } from '@/lib/stats';
import { copyToClipboard, formatGappingSummary } from '@/lib/shareImage';

export default function GappingPage() {
  const [tab, setTab] = useState<'actual' | 'simulator'>('actual');

  return (
    <AuthGuard>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-1">Club Gapping</h1>
        <p className="text-sm text-gray-500 mb-4">
          Visualize carry distance gaps between clubs and identify problems in your bag.
        </p>

        {/* Tab toggle */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setTab('actual')}
            className={`px-4 py-2 text-sm rounded-full transition-colors ${
              tab === 'actual' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Actual Gapping
          </button>
          <button
            onClick={() => setTab('simulator')}
            className={`px-4 py-2 text-sm rounded-full transition-colors ${
              tab === 'simulator' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Bag Simulator
          </button>
        </div>

        {tab === 'actual' ? <GappingAnalysis /> : <BagSimulator />}
      </div>
    </AuthGuard>
  );
}

// ============================================================
// Types
// ============================================================

interface ClubGap {
  clubName: string;
  n: number;
  medianCarry: number;
  p20Carry: number;
  p80Carry: number;
  meanLateral: number;
  gapToNext: number | null; // yards to next shorter club
  gapStatus: 'good' | 'large' | 'overlap' | 'none';
}

// ============================================================
// Main component
// ============================================================

function GappingAnalysis() {
  const { shots, loading: shotsLoading } = useAllShots();
  const { sessions } = useSessions();
  const [fullShotsOnly, setFullShotsOnly] = useState(true);
  const [minShots, setMinShots] = useState(3);
  const [distMode, setDistMode] = useState<'median' | 'p50'>('median');

  const filteredShots = useMemo(() => {
    return filterShots(shots.filter((s) => !s.excluded_from_card), {
      fullShotsOnly,
      includePartials: !fullShotsOnly,
      onlyWithTargets: false,
      targetWindow: null,
    });
  }, [shots, fullShotsOnly]);

  const clubGaps = useMemo(() => computeGaps(filteredShots, minShots), [filteredShots, minShots]);

  const problems = useMemo(() => {
    return clubGaps.filter((c) => c.gapStatus === 'large' || c.gapStatus === 'overlap');
  }, [clubGaps]);

  if (shotsLoading) {
    return <div className="text-center text-gray-600 py-12 text-sm">Loading shot data...</div>;
  }

  if (shots.length === 0) {
    return (
      <div className="text-center py-16 text-[15px] text-gray-400">
        <div className="mb-2">No shot data yet</div>
        <div className="text-xs text-gray-500">Import Garmin R50 CSV files in Shot Data to see gapping analysis.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={fullShotsOnly}
            onChange={(e) => setFullShotsOnly(e.target.checked)}
            className="rounded"
          />
          Full shots only
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          Min shots:
          <select
            value={minShots}
            onChange={(e) => setMinShots(parseInt(e.target.value))}
            className="bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/40"
          >
            <option value={1}>1</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </label>
        <div className="text-xs text-gray-600">
          {filteredShots.length} shots · {clubGaps.length} clubs
        </div>
      </div>

      {/* Problem alerts */}
      {problems.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <h2 className="text-sm font-medium text-gray-50 mb-2">
            {problems.length} Gap {problems.length === 1 ? 'Issue' : 'Issues'} Found
          </h2>
          <div className="space-y-2">
            {problems.map((p) => (
              <div key={p.clubName} className="flex items-start gap-2">
                <span className={`text-xs font-bold mt-0.5 ${p.gapStatus === 'large' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {p.gapStatus === 'large' ? '!' : '~'}
                </span>
                <div>
                  <div className="text-sm text-gray-50">{p.clubName}</div>
                  <div className="text-xs text-gray-500">
                    {p.gapStatus === 'large'
                      ? `${p.gapToNext} yard gap to next club — consider adding a club between these distances`
                      : `Overlapping carry with adjacent club (${p.gapToNext} yd gap) — these clubs cover the same distance`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual gap ladder */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <h2 className="text-sm font-medium text-gray-50 mb-4">Distance Ladder</h2>
        <GapLadder clubs={clubGaps} />
      </div>

      {/* Detail table */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-50">Club Details</h2>
          <ShareGappingButton clubs={clubGaps} />
        </div>
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[13px] text-gray-500 uppercase tracking-wider">
                  <th className="p-2 text-left">Club</th>
                  <th className="p-2 text-center">Shots</th>
                  <th className="p-2 text-center">Carry (P20)</th>
                  <th className="p-2 text-center">Carry (Med)</th>
                  <th className="p-2 text-center">Carry (P80)</th>
                  <th className="p-2 text-center">Range</th>
                  <th className="p-2 text-center">Gap</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {clubGaps.map((club) => (
                  <tr key={club.clubName}>
                    <td className="p-2 text-gray-50 font-medium">{club.clubName}</td>
                    <td className="p-2 text-center text-gray-400">{club.n}</td>
                    <td className="p-2 text-center text-gray-500">{club.p20Carry}</td>
                    <td className="p-2 text-center text-gray-50 font-mono">{club.medianCarry}</td>
                    <td className="p-2 text-center text-gray-500">{club.p80Carry}</td>
                    <td className="p-2 text-center text-gray-400">{club.p80Carry - club.p20Carry} yd</td>
                    <td className={`p-2 text-center font-mono ${
                      club.gapStatus === 'large' ? 'text-red-400' :
                      club.gapStatus === 'overlap' ? 'text-yellow-400' :
                      club.gapStatus === 'good' ? 'text-green-400' :
                      'text-gray-600'
                    }`}>
                      {club.gapToNext != null ? `${club.gapToNext} yd` : '—'}
                    </td>
                    <td className="p-2 text-center">
                      <GapBadge status={club.gapStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ideal gaps info */}
      <div className="bg-gray-900 rounded-2xl p-4 text-xs text-gray-500">
        <h3 className="text-sm font-medium text-gray-400 mb-2">How to read this</h3>
        <ul className="space-y-1">
          <li><span className="text-green-400 font-bold">Good (10-20 yd)</span> — Ideal gap between clubs. You have consistent coverage.</li>
          <li><span className="text-red-400 font-bold">Large (25+ yd)</span> — Too big of a gap. You have a dead zone with no club that covers this distance. Consider adding a hybrid, adjusting lofts, or using a partial swing.</li>
          <li><span className="text-yellow-400 font-bold">Overlap (&lt;5 yd)</span> — Two clubs cover the same distance. Consider replacing one or bending lofts to create separation.</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// Gap Ladder Visualization
// ============================================================

function GapLadder({ clubs }: { clubs: ClubGap[] }) {
  if (clubs.length === 0) return <div className="text-center py-16 text-[15px] text-gray-400">No clubs to display</div>;

  const maxDist = Math.max(...clubs.map((c) => c.p80Carry));
  const minDist = Math.min(...clubs.map((c) => c.p20Carry));
  const range = maxDist - minDist || 1;

  return (
    <div className="space-y-1.5">
      {clubs.map((club, i) => {
        const leftPct = ((club.p20Carry - minDist) / range) * 100;
        const widthPct = ((club.p80Carry - club.p20Carry) / range) * 100;
        const medPct = ((club.medianCarry - minDist) / range) * 100;

        return (
          <div key={club.clubName} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-20 text-right shrink-0 truncate">{club.clubName}</span>
            <div className="flex-1 relative h-6">
              {/* P20-P80 range bar */}
              <div
                className={`absolute h-4 top-1 rounded-xl ${
                  club.gapStatus === 'large' ? 'bg-red-500/30' :
                  club.gapStatus === 'overlap' ? 'bg-yellow-500/30' :
                  'bg-green-500/20'
                }`}
                style={{ left: `${leftPct}%`, width: `${Math.max(1, widthPct)}%` }}
              />
              {/* Median marker */}
              <div
                className={`absolute w-1 h-6 rounded ${
                  club.gapStatus === 'large' ? 'bg-red-400' :
                  club.gapStatus === 'overlap' ? 'bg-yellow-400' :
                  'bg-green-400'
                }`}
                style={{ left: `${medPct}%` }}
              />
              {/* Gap indicator between clubs */}
              {club.gapToNext != null && i < clubs.length - 1 && (
                <div
                  className="absolute -bottom-0.5 text-[9px] text-gray-600 font-mono"
                  style={{ left: `${medPct}%`, transform: 'translateX(-50%)' }}
                >
                  {club.gapToNext}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 w-12 text-left shrink-0 font-mono">{club.medianCarry}</span>
          </div>
        );
      })}
      {/* Distance axis labels */}
      <div className="flex items-center gap-2 mt-2">
        <span className="w-20 shrink-0" />
        <div className="flex-1 flex justify-between text-[10px] text-gray-600">
          <span>{minDist} yd</span>
          <span>{Math.round((minDist + maxDist) / 2)} yd</span>
          <span>{maxDist} yd</span>
        </div>
        <span className="w-12 shrink-0" />
      </div>
    </div>
  );
}

// ============================================================
// Gap Status Badge
// ============================================================

function GapBadge({ status }: { status: ClubGap['gapStatus'] }) {
  const styles: Record<string, string> = {
    good: 'bg-green-500/10 text-green-400',
    large: 'bg-red-500/10 text-red-400',
    overlap: 'bg-yellow-500/10 text-yellow-400',
    none: 'bg-gray-800 text-gray-600',
  };

  const labels: Record<string, string> = {
    good: 'Good',
    large: 'Large',
    overlap: 'Overlap',
    none: '—',
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ============================================================
// Gap computation
// ============================================================

// ============================================================
// Share Gapping Button
// ============================================================

function ShareGappingButton({ clubs }: { clubs: ClubGap[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = formatGappingSummary(clubs);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-full transition-colors"
    >
      {copied ? 'Copied!' : 'Copy to Clipboard'}
    </button>
  );
}

// ============================================================
// Bag Simulator — like Golf Engineer's Gap Visualizer
// ============================================================

const DEFAULT_CLUBS = [
  { name: 'Lob Wedge', carry: 80 },
  { name: 'Sand Wedge', carry: 90 },
  { name: 'Gap Wedge', carry: 100 },
  { name: 'PW', carry: 120 },
  { name: '9 Iron', carry: 130 },
  { name: '8 Iron', carry: 140 },
  { name: '7 Iron', carry: 150 },
  { name: '6 Iron', carry: 160 },
  { name: '5 Iron', carry: 170 },
  { name: '4 Iron', carry: 180 },
  { name: '3 Hybrid', carry: 195 },
  { name: '5 Wood', carry: 215 },
  { name: '3 Wood', carry: 235 },
  { name: 'Driver', carry: 250 },
];

interface SimClub { name: string; carry: number }

function BagSimulator() {
  const { shots, loading } = useAllShots();
  const [clubs, setClubs] = useState<SimClub[]>([]);
  const [mode, setMode] = useState<'equal' | 'custom'>('custom');
  const [initialized, setInitialized] = useState(false);

  // Initialize from actual shot data if available
  const actualClubData = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const s of shots.filter(s => s.is_full_shot && !s.excluded_from_card)) {
      (map[s.club_name] ??= []).push(s.carry_distance_yd);
    }
    const result: SimClub[] = [];
    for (const [name, carries] of Object.entries(map)) {
      if (carries.length < 2) continue;
      carries.sort((a, b) => a - b);
      result.push({ name, carry: Math.round(carries[Math.floor(carries.length / 2)]) });
    }
    result.sort((a, b) => a.carry - b.carry);
    return result;
  }, [shots]);

  // Initialize clubs once when data loads
  if (!initialized && !loading) {
    setClubs(actualClubData.length >= 3 ? actualClubData : DEFAULT_CLUBS);
    setInitialized(true);
  }

  const updateCarry = (idx: number, carry: number) => {
    setClubs(prev => prev.map((c, i) => i === idx ? { ...c, carry } : c));
  };

  const updateName = (idx: number, name: string) => {
    setClubs(prev => prev.map((c, i) => i === idx ? { ...c, name } : c));
  };

  const removeClub = (idx: number) => {
    setClubs(prev => prev.filter((_, i) => i !== idx));
  };

  const addClub = () => {
    const maxCarry = clubs.length > 0 ? Math.max(...clubs.map(c => c.carry)) : 100;
    setClubs([...clubs, { name: 'New Club', carry: maxCarry + 15 }]);
  };

  const calcEqualGaps = () => {
    if (clubs.length < 2) return;
    const sorted = [...clubs].sort((a, b) => a.carry - b.carry);
    const min = sorted[0].carry;
    const max = sorted[sorted.length - 1].carry;
    const gap = (max - min) / (clubs.length - 1);
    const newClubs = sorted.map((c, i) => ({ ...c, carry: Math.round(min + gap * i) }));
    setClubs(newClubs);
    setMode('equal');
  };

  const resetToActual = () => {
    if (actualClubData.length >= 3) {
      setClubs(actualClubData);
    } else {
      setClubs(DEFAULT_CLUBS);
    }
    setMode('custom');
  };

  // Sort for display (longest first)
  const sorted = useMemo(() => {
    const s = [...clubs].sort((a, b) => b.carry - a.carry);
    return s.map((c, i) => ({
      ...c,
      gap: i < s.length - 1 ? c.carry - s[i + 1].carry : null,
    }));
  }, [clubs]);

  const maxCarry = Math.max(...clubs.map(c => c.carry), 100);
  const minCarry = Math.min(...clubs.map(c => c.carry), 0);
  const range = maxCarry - minCarry || 1;

  if (loading) {
    return <div className="text-center text-gray-600 py-12 text-sm">Loading shot data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-medium text-gray-50">Bag Setup</h2>
            <p className="text-xs text-gray-500">{clubs.length} clubs · Dream up new configurations</p>
          </div>
          <div className="flex gap-2">
            <button onClick={calcEqualGaps} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors">
              Equal Gaps
            </button>
            <button onClick={resetToActual} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors">
              {actualClubData.length >= 3 ? 'Reset to Actual' : 'Reset to Default'}
            </button>
            <button onClick={addClub} className="px-3 py-1.5 text-xs bg-green-500 hover:bg-green-400 text-white rounded-full transition-colors">
              + Add Club
            </button>
          </div>
        </div>

        {/* Club list — editable */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[13px] text-gray-500 uppercase tracking-wider px-2 mb-1">
            <span className="w-32">Club</span>
            <span className="w-20 text-center">Carry (yd)</span>
            <span className="w-16 text-center">Gap</span>
            <span className="flex-1" />
          </div>
          {sorted.map((club, sortedIdx) => {
            const realIdx = clubs.findIndex(c => c.name === club.name && c.carry === club.carry);
            const gapColor = club.gap == null ? 'text-gray-600' :
              club.gap >= 25 ? 'text-red-400' :
              club.gap < 5 ? 'text-yellow-400' : 'text-green-400';
            return (
              <div key={sortedIdx} className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-2 py-1.5">
                <input
                  type="text"
                  value={club.name}
                  onChange={(e) => updateName(realIdx, e.target.value)}
                  className="w-32 bg-transparent border-b border-gray-700 text-sm text-gray-50 focus:border-green-500 outline-none px-1"
                />
                <input
                  type="number"
                  value={club.carry}
                  onChange={(e) => updateCarry(realIdx, parseInt(e.target.value) || 0)}
                  className="w-20 bg-gray-800 border-0 rounded-xl px-2 py-1 text-sm text-gray-50 text-center focus:outline-none focus:ring-2 focus:ring-green-500/40"
                />
                <span className={`w-16 text-center text-xs font-mono ${gapColor}`}>
                  {club.gap != null ? `${club.gap}` : '—'}
                </span>
                {/* Mini bar */}
                <div className="flex-1 h-4 relative">
                  <div
                    className="absolute h-full bg-green-500/30 rounded-xl"
                    style={{ width: `${((club.carry - minCarry) / range) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => removeClub(realIdx)}
                  className="text-gray-500 hover:text-red-400 text-xs px-1"
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual gap chart */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <h2 className="text-sm font-medium text-gray-50 mb-4">Distance Ladder</h2>
        <div className="space-y-2">
          {sorted.map((club, i) => {
            const pct = ((club.carry - minCarry) / range) * 100;
            const gapColor = club.gap == null ? '' :
              club.gap >= 25 ? 'text-red-400' :
              club.gap < 5 ? 'text-yellow-400' : 'text-green-400';
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-24 text-right shrink-0 truncate">{club.name}</span>
                <div className="flex-1 relative h-6">
                  <div
                    className="absolute h-4 top-1 bg-green-500/30 rounded-xl"
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                  <div
                    className="absolute w-1.5 h-6 bg-green-400 rounded"
                    style={{ left: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-50 w-10 text-right font-mono shrink-0">{club.carry}</span>
                {club.gap != null && (
                  <span className={`text-xs w-8 text-right font-mono shrink-0 ${gapColor}`}>{club.gap}</span>
                )}
                {club.gap == null && <span className="w-8 shrink-0" />}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800/60">
          <span className="w-24 shrink-0" />
          <div className="flex-1 flex justify-between text-xs text-gray-600">
            <span>{minCarry} yd</span>
            <span>{Math.round((minCarry + maxCarry) / 2)} yd</span>
            <span>{maxCarry} yd</span>
          </div>
          <span className="w-10 shrink-0" />
          <span className="w-8 shrink-0" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-900 rounded-2xl p-3">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Clubs</div>
          <div className="text-xl font-bold text-gray-50">{clubs.length}</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-3">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Coverage</div>
          <div className="text-xl font-bold text-gray-50">{minCarry}–{maxCarry}<span className="text-sm text-gray-500"> yd</span></div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-3">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Avg Gap</div>
          <div className="text-xl font-bold text-green-400">
            {sorted.filter(c => c.gap != null).length > 0
              ? Math.round(sorted.filter(c => c.gap != null).reduce((s, c) => s + c.gap!, 0) / sorted.filter(c => c.gap != null).length)
              : '—'}<span className="text-sm text-gray-500"> yd</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-3">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Issues</div>
          <div className="text-xl font-bold text-red-400">
            {sorted.filter(c => c.gap != null && (c.gap >= 25 || c.gap < 5)).length}
          </div>
        </div>
      </div>

      {/* Comparison to actual (if shot data exists) */}
      {actualClubData.length >= 3 && mode === 'custom' && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <h3 className="text-sm font-medium text-gray-50 mb-2">vs. Your Actual Distances</h3>
          <p className="text-xs text-gray-500 mb-3">How this setup compares to your real shot data</p>
          <div className="space-y-1">
            {sorted.map((simClub, i) => {
              const actual = actualClubData.find(a => a.name === simClub.name);
              if (!actual) return null;
              const diff = simClub.carry - actual.carry;
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-gray-400 text-xs truncate">{simClub.name}</span>
                  <span className="text-gray-500 text-xs w-16">Actual: {actual.carry}</span>
                  <span className="text-gray-50 text-xs w-16">Sim: {simClub.carry}</span>
                  <span className={`text-xs font-mono ${diff > 0 ? 'text-blue-400' : diff < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                    {diff > 0 ? '+' : ''}{diff} yd
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Gap computation
// ============================================================

function computeGaps(shots: Shot[], minShots: number): ClubGap[] {
  // Group by club
  const byClub = new Map<string, Shot[]>();
  for (const s of shots) {
    const arr = byClub.get(s.club_name) ?? [];
    arr.push(s);
    byClub.set(s.club_name, arr);
  }

  // Build club list sorted by median carry (longest first)
  const clubs: ClubGap[] = [];
  for (const [clubName, clubShots] of byClub) {
    if (clubShots.length < minShots) continue;

    const carries = clubShots.map((s) => s.carry_distance_yd).sort((a, b) => a - b);
    const laterals = clubShots.map((s) => s.carry_lateral_yd);

    clubs.push({
      clubName,
      n: clubShots.length,
      medianCarry: Math.round(percentile(carries, 0.5)),
      p20Carry: Math.round(percentile(carries, 0.2)),
      p80Carry: Math.round(percentile(carries, 0.8)),
      meanLateral: Math.round(mean(laterals) * 10) / 10,
      gapToNext: null,
      gapStatus: 'none',
    });
  }

  // Sort by median carry descending (longest club first)
  clubs.sort((a, b) => b.medianCarry - a.medianCarry);

  // Compute gaps between consecutive clubs
  for (let i = 0; i < clubs.length - 1; i++) {
    const gap = clubs[i].medianCarry - clubs[i + 1].medianCarry;
    clubs[i].gapToNext = gap;

    if (gap >= 25) {
      clubs[i].gapStatus = 'large';
    } else if (gap < 5) {
      clubs[i].gapStatus = 'overlap';
    } else {
      clubs[i].gapStatus = 'good';
    }
  }

  return clubs;
}
