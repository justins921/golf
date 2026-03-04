'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useAllShots, useSessions } from '@/lib/hooks';
import type { Shot } from '@/lib/types';
import { CLUB_ORDER, sortClubs } from '@/lib/types';
import { percentile, mean, filterShots } from '@/lib/stats';

export default function GappingPage() {
  return (
    <AuthGuard>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-50 mb-1">Club Gapping</h1>
        <p className="text-sm text-gray-500 mb-6">
          Visualize carry distance gaps between clubs and identify problems in your bag.
        </p>
        <GappingAnalysis />
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
      <div className="text-center text-gray-600 py-12">
        <div className="text-sm mb-2">No shot data yet</div>
        <div className="text-xs text-gray-700">Import Garmin R50 CSV files in Shot Data to see gapping analysis.</div>
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
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300"
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
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
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
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-50 mb-4">Distance Ladder</h2>
        <GapLadder clubs={clubGaps} />
      </div>

      {/* Detail table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-50 mb-3">Club Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
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
            <tbody>
              {clubGaps.map((club) => (
                <tr key={club.clubName} className="border-b border-gray-800/50">
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

      {/* Ideal gaps info */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs text-gray-500">
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
  if (clubs.length === 0) return <div className="text-gray-600 text-sm">No clubs to display</div>;

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
                className={`absolute h-4 top-1 rounded ${
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
    good: 'bg-green-500/10 text-green-400 border-green-500/20',
    large: 'bg-red-500/10 text-red-400 border-red-500/20',
    overlap: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    none: 'bg-gray-800 text-gray-600 border-gray-700',
  };

  const labels: Record<string, string> = {
    good: 'Good',
    large: 'Large',
    overlap: 'Overlap',
    none: '—',
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles[status]}`}>
      {labels[status]}
    </span>
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
