'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { useAllShots } from '@/lib/hooks';
import type { Shot } from '@/lib/types';
import { computeClubStats } from '@/lib/stats';

// ── Types ───────────────────────────────────────────────────
type ViewMode = 'heatmap' | 'tendencies';
type DistMode = 'carry' | 'total';

interface MissTendency {
  clubName: string;
  clubType: string;
  n: number;
  meanLateral: number;
  meanDistError: number; // positive = long, negative = short
  sdLateral: number;
  sdDistance: number;
  pctLeft: number;
  pctRight: number;
  pctLong: number;
  pctShort: number;
  dominantMiss: string;
  severity: 'low' | 'medium' | 'high';
}

// ── Helpers ─────────────────────────────────────────────────

function computeMissTendencies(shots: Shot[], mode: DistMode): MissTendency[] {
  const byClub = new Map<string, Shot[]>();
  for (const s of shots) {
    if (!s.is_full_shot) continue;
    const arr = byClub.get(s.club_name) ?? [];
    arr.push(s);
    byClub.set(s.club_name, arr);
  }

  const results: MissTendency[] = [];
  for (const [clubName, clubShots] of byClub) {
    if (clubShots.length < 3) continue;
    const clubType = clubShots[0].club_type;
    const laterals = clubShots.map(s => mode === 'carry' ? s.carry_lateral_yd : s.total_lateral_yd);
    const distances = clubShots.map(s => mode === 'carry' ? s.carry_distance_yd : s.total_distance_yd);

    const meanLat = laterals.reduce((a, b) => a + b, 0) / laterals.length;
    const meanDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    const sdLat = Math.sqrt(laterals.reduce((s, v) => s + (v - meanLat) ** 2, 0) / (laterals.length - 1));
    const sdDist = Math.sqrt(distances.reduce((s, v) => s + (v - meanDist) ** 2, 0) / (distances.length - 1));

    const pctLeft = laterals.filter(l => l < -2).length / laterals.length;
    const pctRight = laterals.filter(l => l > 2).length / laterals.length;
    const pctLong = distances.filter(d => d > meanDist + 5).length / distances.length;
    const pctShort = distances.filter(d => d < meanDist - 5).length / distances.length;

    // Dominant miss direction
    const misses: [string, number][] = [
      ['Left', pctLeft], ['Right', pctRight], ['Long', pctLong], ['Short', pctShort],
    ];
    misses.sort((a, b) => b[1] - a[1]);
    const dominantMiss = misses[0][1] > 0.4 ? misses[0][0] :
      Math.abs(meanLat) > 5 ? (meanLat < 0 ? 'Left' : 'Right') : 'Center';

    const lateralBias = Math.abs(meanLat);
    const severity: MissTendency['severity'] =
      lateralBias > 10 || sdLat > 15 ? 'high' :
      lateralBias > 5 || sdLat > 10 ? 'medium' : 'low';

    results.push({
      clubName, clubType, n: clubShots.length,
      meanLateral: meanLat, meanDistError: 0, sdLateral: sdLat, sdDistance: sdDist,
      pctLeft, pctRight, pctLong, pctShort,
      dominantMiss, severity,
    });
  }

  // Sort by club type order
  const typeOrder: Record<string, number> = { Driver: 0, Wood: 1, Hybrid: 2, Iron: 3, Wedge: 4 };
  results.sort((a, b) => (typeOrder[a.clubType] ?? 5) - (typeOrder[b.clubType] ?? 5));
  return results;
}

const CLUB_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

// ── Heatmap D3 Component ────────────────────────────────────

function DensityHeatmap({ shots, mode, selectedClub }: {
  shots: Shot[];
  mode: DistMode;
  selectedClub: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = useMemo(() => {
    let f = shots.filter(s => s.is_full_shot);
    if (selectedClub) f = f.filter(s => s.club_name === selectedClub);
    return f;
  }, [shots, selectedClub]);

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    if (filtered.length < 2 || containerWidth === 0) return;

    const margin = { top: 30, right: 20, bottom: 40, left: 55 };
    const width = containerWidth;
    const height = Math.round(containerWidth * 0.85);
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const getLateral = (s: Shot) => mode === 'carry' ? s.carry_lateral_yd : s.total_lateral_yd;
    const getDistance = (s: Shot) => mode === 'carry' ? s.carry_distance_yd : s.total_distance_yd;

    const laterals = filtered.map(getLateral);
    const distances = filtered.map(getDistance);

    const latExtent = d3.extent(laterals) as [number, number];
    const distExtent = d3.extent(distances) as [number, number];
    const latPad = Math.max(10, (latExtent[1] - latExtent[0]) * 0.15);
    const distPad = Math.max(10, (distExtent[1] - distExtent[0]) * 0.1);

    const xScale = d3.scaleLinear()
      .domain([latExtent[0] - latPad, latExtent[1] + latPad])
      .range([0, innerW]);
    const yScale = d3.scaleLinear()
      .domain([distExtent[0] - distPad, distExtent[1] + distPad])
      .range([innerH, 0]);

    // Grid axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .selectAll('text').attr('fill', '#9ca3af').attr('font-size', '10px');
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(8))
      .selectAll('text').attr('fill', '#9ca3af').attr('font-size', '10px');

    // Grid lines
    g.selectAll('line.hgrid').data(yScale.ticks(8)).enter()
      .append('line').attr('class', 'hgrid')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', '#374151').attr('stroke-dasharray', '2,2');
    g.selectAll('line.vgrid').data(xScale.ticks(8)).enter()
      .append('line').attr('class', 'vgrid')
      .attr('x1', d => xScale(d)).attr('x2', d => xScale(d))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#374151').attr('stroke-dasharray', '2,2');

    // Center line
    if (xScale.domain()[0] <= 0 && xScale.domain()[1] >= 0) {
      g.append('line')
        .attr('x1', xScale(0)).attr('x2', xScale(0))
        .attr('y1', 0).attr('y2', innerH)
        .attr('stroke', '#6b7280').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3');
    }

    // Density contours
    const contourData = d3.contourDensity<Shot>()
      .x(s => xScale(getLateral(s)))
      .y(s => yScale(getDistance(s)))
      .size([innerW, innerH])
      .bandwidth(20)
      .thresholds(12)(filtered);

    const densityMax = d3.max(contourData, d => d.value) ?? 1;
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, densityMax]);

    g.selectAll('path.contour')
      .data(contourData)
      .enter()
      .append('path')
      .attr('class', 'contour')
      .attr('d', d3.geoPath())
      .attr('fill', d => colorScale(d.value))
      .attr('opacity', 0.6)
      .attr('stroke', d => colorScale(d.value))
      .attr('stroke-width', 0.5);

    // Scatter dots on top
    g.selectAll('circle.shot')
      .data(filtered)
      .enter()
      .append('circle')
      .attr('class', 'shot')
      .attr('cx', s => xScale(getLateral(s)))
      .attr('cy', s => yScale(getDistance(s)))
      .attr('r', 3)
      .attr('fill', '#f9fafb')
      .attr('fill-opacity', 0.5)
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 0.5);

    // Mean crosshair
    const meanLat = d3.mean(laterals) ?? 0;
    const meanDist = d3.mean(distances) ?? 0;
    const cx = xScale(meanLat);
    const cy = yScale(meanDist);

    g.append('line').attr('x1', cx - 10).attr('x2', cx + 10).attr('y1', cy).attr('y2', cy)
      .attr('stroke', '#22c55e').attr('stroke-width', 2);
    g.append('line').attr('x1', cx).attr('x2', cx).attr('y1', cy - 10).attr('y2', cy + 10)
      .attr('stroke', '#22c55e').attr('stroke-width', 2);

    // Axis labels
    svg.append('text')
      .attr('x', width / 2).attr('y', height - 4)
      .attr('text-anchor', 'middle').attr('fill', '#9ca3af').attr('font-size', '11px')
      .text('Lateral (yards) — Left ← → Right');
    svg.append('text')
      .attr('transform', `translate(14,${height / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle').attr('fill', '#9ca3af').attr('font-size', '11px')
      .text(`${mode === 'carry' ? 'Carry' : 'Total'} Distance (yards)`);

    // Title
    svg.append('text')
      .attr('x', margin.left).attr('y', 18)
      .attr('fill', '#f9fafb').attr('font-size', '13px').attr('font-weight', '600')
      .text(`Shot Density — ${selectedClub ?? 'All Clubs'} (${filtered.length} shots)`);

  }, [filtered, containerWidth, mode, selectedClub]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}

// ── Miss Tendency Card ──────────────────────────────────────

function TendencyCard({ t }: { t: MissTendency }) {
  const severityColor = t.severity === 'high' ? 'text-red-400' :
    t.severity === 'medium' ? 'text-amber-400' : 'text-green-400';
  const severityBg = t.severity === 'high' ? 'bg-red-500/10 border-red-500/20' :
    t.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-green-500/10 border-green-500/20';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium text-gray-50">{t.clubName}</span>
          <span className="text-xs text-gray-500 ml-2">{t.n} shots</span>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${severityBg} ${severityColor}`}>
          {t.severity === 'low' ? 'Tight' : t.severity === 'medium' ? 'Moderate' : 'Wide'}
        </span>
      </div>

      {/* Visual miss target */}
      <div className="relative w-full aspect-square max-w-[140px] mx-auto mb-3">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Target rings */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="#374151" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="15" fill="none" stroke="#374151" strokeWidth="0.5" />
          <line x1="50" y1="5" x2="50" y2="95" stroke="#4b5563" strokeWidth="0.3" strokeDasharray="2,2" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="#4b5563" strokeWidth="0.3" strokeDasharray="2,2" />

          {/* Mean point — scale: 2px per yard lateral, 1px per yard distance */}
          <circle
            cx={50 + Math.max(-40, Math.min(40, t.meanLateral * 2))}
            cy={50 - Math.max(-40, Math.min(40, t.meanDistError * 1))}
            r="6"
            fill={t.severity === 'high' ? '#ef4444' : t.severity === 'medium' ? '#f59e0b' : '#22c55e'}
            opacity="0.7"
          />
          {/* Spread ellipse */}
          <ellipse
            cx={50 + Math.max(-40, Math.min(40, t.meanLateral * 2))}
            cy={50 - Math.max(-40, Math.min(40, t.meanDistError * 1))}
            rx={Math.min(40, t.sdLateral * 2)}
            ry={Math.min(40, t.sdDistance * 1)}
            fill="none"
            stroke={t.severity === 'high' ? '#ef4444' : t.severity === 'medium' ? '#f59e0b' : '#22c55e'}
            strokeWidth="1"
            strokeDasharray="3,2"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Miss:</span>
          <span className={`ml-1 font-medium ${
            t.dominantMiss === 'Center' ? 'text-green-400' : 'text-amber-400'
          }`}>{t.dominantMiss}</span>
        </div>
        <div>
          <span className="text-gray-500">Bias:</span>
          <span className="text-gray-300 ml-1">
            {t.meanLateral > 0 ? '+' : ''}{t.meanLateral.toFixed(1)}yd
          </span>
        </div>
        <div>
          <span className="text-gray-500">L/R:</span>
          <span className="text-gray-300 ml-1">
            {(t.pctLeft * 100).toFixed(0)}% / {(t.pctRight * 100).toFixed(0)}%
          </span>
        </div>
        <div>
          <span className="text-gray-500">Spread:</span>
          <span className="text-gray-300 ml-1">±{t.sdLateral.toFixed(1)}yd</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function HeatmapPage() {
  const { shots, loading } = useAllShots();
  const [view, setView] = useState<ViewMode>('heatmap');
  const [mode, setMode] = useState<DistMode>('carry');
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const fullShots = useMemo(() => shots.filter(s => s.is_full_shot), [shots]);
  const clubs = useMemo(() => {
    const set = new Set(fullShots.map(s => s.club_name));
    return Array.from(set);
  }, [fullShots]);

  const tendencies = useMemo(() => computeMissTendencies(shots, mode), [shots, mode]);
  const clubStats = useMemo(() => computeClubStats(fullShots), [fullShots]);

  // Summary stats
  const worstMiss = tendencies.filter(t => t.severity === 'high');
  const tightestClubs = tendencies.filter(t => t.severity === 'low');

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (fullShots.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-xl font-bold text-gray-50 mb-2">Shot Pattern Heatmap</h1>
        <p className="text-gray-400 text-sm">Import shot data from the Shot Data page to see your patterns.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Shot Pattern Heatmap</h1>
          <p className="text-sm text-gray-400">{fullShots.length} shots across {clubs.length} clubs</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            {(['heatmap', 'tendencies'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  view === v ? 'bg-green-600 text-gray-50' : 'text-gray-400 hover:text-gray-200'
                }`}>
                {v === 'heatmap' ? 'Density Map' : 'Miss Tendencies'}
              </button>
            ))}
          </div>
          {/* Mode toggle */}
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            {(['carry', 'total'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  mode === m ? 'bg-blue-600 text-gray-50' : 'text-gray-400 hover:text-gray-200'
                }`}>
                {m === 'carry' ? 'Carry' : 'Total'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick insights bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
          <div className="text-xs text-gray-500">Widest Pattern</div>
          <div className="text-sm font-medium text-gray-50">
            {worstMiss.length > 0 ? worstMiss[0].clubName : tendencies[0]?.clubName ?? '—'}
          </div>
          <div className="text-xs text-red-400">
            {worstMiss.length > 0
              ? `±${worstMiss[0].sdLateral.toFixed(1)}yd spread, ${worstMiss[0].dominantMiss} miss`
              : tendencies[0] ? `±${tendencies[0].sdLateral.toFixed(1)}yd spread` : '—'}
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
          <div className="text-xs text-gray-500">Tightest Pattern</div>
          <div className="text-sm font-medium text-gray-50">
            {tightestClubs.length > 0 ? tightestClubs[tightestClubs.length - 1].clubName : '—'}
          </div>
          <div className="text-xs text-green-400">
            {tightestClubs.length > 0
              ? `±${tightestClubs[tightestClubs.length - 1].sdLateral.toFixed(1)}yd spread`
              : '—'}
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
          <div className="text-xs text-gray-500">Overall Bias</div>
          {(() => {
            const allLat = fullShots.map(s => mode === 'carry' ? s.carry_lateral_yd : s.total_lateral_yd);
            const avgBias = allLat.reduce((a, b) => a + b, 0) / (allLat.length || 1);
            const direction = Math.abs(avgBias) < 2 ? 'Center' : avgBias < 0 ? 'Left' : 'Right';
            return (
              <>
                <div className="text-sm font-medium text-gray-50">{direction}</div>
                <div className="text-xs text-blue-400">
                  {avgBias > 0 ? '+' : ''}{avgBias.toFixed(1)}yd avg lateral
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {view === 'heatmap' && (
        <div className="space-y-4">
          {/* Club filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedClub(null)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedClub === null ? 'bg-green-600 text-gray-50' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}>
              All Clubs
            </button>
            {clubs.map((club, i) => (
              <button key={club} onClick={() => setSelectedClub(club)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedClub === club
                    ? 'text-gray-50'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
                style={selectedClub === club ? { backgroundColor: CLUB_COLORS[i % CLUB_COLORS.length] } : {}}>
                {club}
              </button>
            ))}
          </div>

          {/* Heatmap */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <DensityHeatmap shots={fullShots} mode={mode} selectedClub={selectedClub} />
          </div>

          {/* Club stats table */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-500">
                  <th className="text-left px-4 py-2">Club</th>
                  <th className="text-right px-4 py-2">Shots</th>
                  <th className="text-right px-4 py-2">Avg {mode === 'carry' ? 'Carry' : 'Total'}</th>
                  <th className="text-right px-4 py-2">Lateral Bias</th>
                  <th className="text-right px-4 py-2">Spread</th>
                  <th className="text-right px-4 py-2">Miss</th>
                </tr>
              </thead>
              <tbody>
                {tendencies.map((t) => (
                  <tr key={t.clubName}
                    className="border-b border-gray-700/50 hover:bg-gray-750 cursor-pointer"
                    onClick={() => { setSelectedClub(t.clubName); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <td className="px-4 py-2 font-medium text-gray-50">{t.clubName}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{t.n}</td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {(() => {
                        const cs = clubStats.find(c => c.clubName === t.clubName);
                        const dist = mode === 'carry' ? cs?.carry.meanDistance : cs?.total.meanDistance;
                        return dist ? `${dist.toFixed(1)}yd` : '—';
                      })()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={Math.abs(t.meanLateral) > 5 ? 'text-amber-400' : 'text-gray-300'}>
                        {t.meanLateral > 0 ? '+' : ''}{t.meanLateral.toFixed(1)}yd
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">±{t.sdLateral.toFixed(1)}yd</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        t.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                        t.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-green-500/10 text-green-400'
                      }`}>
                        {t.dominantMiss}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'tendencies' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tendencies.map((t) => (
            <TendencyCard key={t.clubName} t={t} />
          ))}
          {tendencies.length === 0 && (
            <p className="text-gray-500 text-sm col-span-full text-center py-8">
              Need at least 3 shots per club to compute miss tendencies.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
