'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { Shot, EllipseParams } from '@/lib/types';
import { computeClubStats, isOutlier } from '@/lib/stats';
import { svgToPng, downloadBlob } from '@/lib/export';

interface Props {
  shots: Shot[];
  title?: string;
  mode?: 'carry' | 'total';
  showOutliers?: boolean;
  overlayGroups?: { label: string; shots: Shot[]; color: string }[];
  width?: number;
  height?: number;
}

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

export default function DispersionChart({
  shots,
  title,
  mode = 'carry',
  showOutliers = true,
  overlayGroups,
  width = 600,
  height = 500,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubs = useMemo(() => {
    const set = new Set(shots.map((s) => s.club_name));
    return Array.from(set).sort();
  }, [shots]);

  const filteredShots = useMemo(() => {
    if (selectedClub) return shots.filter((s) => s.club_name === selectedClub);
    return shots;
  }, [shots, selectedClub]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const getDistance = (s: Shot) => mode === 'carry' ? s.carry_distance_yd : s.total_distance_yd;
    const getLateral = (s: Shot) => mode === 'carry' ? s.carry_lateral_yd : s.total_lateral_yd;

    // Determine groups to render
    const groups = overlayGroups && overlayGroups.length > 0
      ? overlayGroups
      : [{ label: title || 'Shots', shots: filteredShots, color: COLORS[0] }];

    // Compute domains from all groups
    const allShots = groups.flatMap((g) => g.shots);
    if (allShots.length === 0) {
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#6b7280')
        .text('No shots to display');
      return;
    }

    const distances = allShots.map(getDistance);
    const laterals = allShots.map(getLateral);

    const dExtent = d3.extent(distances) as [number, number];
    const lExtent = d3.extent(laterals) as [number, number];
    const dPad = (dExtent[1] - dExtent[0]) * 0.1 || 10;
    const lPad = Math.max((lExtent[1] - lExtent[0]) * 0.15, 15);

    const xScale = d3.scaleLinear()
      .domain([lExtent[0] - lPad, lExtent[1] + lPad])
      .range([0, w]);

    const yScale = d3.scaleLinear()
      .domain([dExtent[0] - dPad, dExtent[1] + dPad])
      .range([h, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line.h')
      .data(yScale.ticks(8))
      .join('line')
      .attr('x1', 0).attr('x2', w)
      .attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
      .attr('stroke', '#1f2937').attr('stroke-width', 0.5);

    g.append('g')
      .attr('class', 'grid')
      .selectAll('line.v')
      .data(xScale.ticks(8))
      .join('line')
      .attr('x1', (d) => xScale(d)).attr('x2', (d) => xScale(d))
      .attr('y1', 0).attr('y2', h)
      .attr('stroke', '#1f2937').attr('stroke-width', 0.5);

    // Center line (0 lateral)
    if (lExtent[0] <= 0 && lExtent[1] >= 0) {
      g.append('line')
        .attr('x1', xScale(0)).attr('x2', xScale(0))
        .attr('y1', 0).attr('y2', h)
        .attr('stroke', '#374151').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');
    }

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .selectAll('text').attr('fill', '#9ca3af');
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(8))
      .selectAll('text').attr('fill', '#9ca3af');

    // Axis labels
    g.append('text')
      .attr('x', w / 2).attr('y', h + 40)
      .attr('text-anchor', 'middle').attr('fill', '#9ca3af').attr('font-size', 12)
      .text('Lateral Deviation (yards)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2).attr('y', -45)
      .attr('text-anchor', 'middle').attr('fill', '#9ca3af').attr('font-size', 12)
      .text(`${mode === 'carry' ? 'Carry' : 'Total'} Distance (yards)`);

    // Render each group
    groups.forEach((group, gi) => {
      const stats = computeClubStats(group.shots);
      const stat = selectedClub
        ? stats.find((s) => s.clubName === selectedClub)
        : stats.length === 1 ? stats[0] : null;

      const ds = mode === 'carry' ? stat?.carry : stat?.total;

      // Draw ellipses if we have stats for a single club
      if (ds) {
        const drawEllipse = (ep: EllipseParams, opacity: number) => {
          g.append('ellipse')
            .attr('cx', xScale(ep.cx))
            .attr('cy', yScale(ep.cy))
            .attr('rx', Math.abs(xScale(ep.rx) - xScale(0)))
            .attr('ry', Math.abs(yScale(ep.ry) - yScale(0)))
            .attr('transform', `rotate(${-(ep.rotation * 180) / Math.PI}, ${xScale(ep.cx)}, ${yScale(ep.cy)})`)
            .attr('fill', group.color)
            .attr('fill-opacity', opacity * 0.1)
            .attr('stroke', group.color)
            .attr('stroke-opacity', opacity)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,3');
        };

        drawEllipse(ds.ellipse2Sigma, 0.3);
        drawEllipse(ds.ellipse1Sigma, 0.6);

        // Mean marker
        g.append('line')
          .attr('x1', xScale(ds.meanLateral) - 6).attr('x2', xScale(ds.meanLateral) + 6)
          .attr('y1', yScale(ds.meanDistance)).attr('y2', yScale(ds.meanDistance))
          .attr('stroke', group.color).attr('stroke-width', 2);
        g.append('line')
          .attr('x1', xScale(ds.meanLateral)).attr('x2', xScale(ds.meanLateral))
          .attr('y1', yScale(ds.meanDistance) - 6).attr('y2', yScale(ds.meanDistance) + 6)
          .attr('stroke', group.color).attr('stroke-width', 2);
      }

      // Dots
      const tooltip = tooltipRef.current;
      g.selectAll(`.dot-${gi}`)
        .data(group.shots)
        .join('circle')
        .attr('cx', (d) => xScale(getLateral(d)))
        .attr('cy', (d) => yScale(getDistance(d)))
        .attr('r', 4)
        .attr('fill', (d) => {
          if (showOutliers && ds) {
            const out = isOutlier(getLateral(d), getDistance(d), ds.ellipse2Sigma);
            return out ? '#ef4444' : group.color;
          }
          return group.color;
        })
        .attr('fill-opacity', 0.7)
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5)
        .attr('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this).attr('r', 7).attr('fill-opacity', 1);
          if (tooltip) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.offsetX + 10}px`;
            tooltip.style.top = `${event.offsetY - 10}px`;
            tooltip.innerHTML = `
              <div class="text-xs">
                <div class="font-semibold">${d.club_name}</div>
                <div>${mode === 'carry' ? 'Carry' : 'Total'}: ${getDistance(d).toFixed(1)} yd</div>
                <div>Lateral: ${getLateral(d) > 0 ? '+' : ''}${getLateral(d).toFixed(1)} yd ${getLateral(d) > 0 ? 'R' : getLateral(d) < 0 ? 'L' : ''}</div>
                ${d.target_distance_yd != null ? `<div>Target: ${d.target_distance_yd} yd</div>` : ''}
                ${d.tags.length > 0 ? `<div>Tags: ${d.tags.join(', ')}</div>` : ''}
              </div>`;
          }
        })
        .on('mouseout', function () {
          d3.select(this).attr('r', 4).attr('fill-opacity', 0.7);
          if (tooltip) tooltip.style.display = 'none';
        });
    });

    // Legend for overlay groups
    if (groups.length > 1) {
      const legend = g.append('g').attr('transform', `translate(${w - 140}, 10)`);
      groups.forEach((group, i) => {
        const ly = i * 20;
        legend.append('circle').attr('cx', 0).attr('cy', ly).attr('r', 5).attr('fill', group.color);
        legend.append('text').attr('x', 12).attr('y', ly + 4)
          .attr('fill', '#d1d5db').attr('font-size', 11).text(group.label);
      });
    }

    // Style axis lines
    svg.selectAll('.domain').attr('stroke', '#374151');
    svg.selectAll('.tick line').attr('stroke', '#374151');
  }, [filteredShots, mode, showOutliers, overlayGroups, width, height, selectedClub, title]);

  const handleExportPng = async () => {
    if (!svgRef.current) return;
    try {
      const blob = await svgToPng(svgRef.current);
      downloadBlob(blob, `dispersion-${mode}-${selectedClub || 'all'}.png`);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    downloadBlob(blob, `dispersion-${mode}-${selectedClub || 'all'}.svg`);
  };

  return (
    <div className="relative">
      {clubs.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setSelectedClub(null)}
            className={`px-2 py-1 text-xs rounded ${
              !selectedClub ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All Clubs
          </button>
          {clubs.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedClub(c)}
              className={`px-2 py-1 text-xs rounded ${
                selectedClub === c ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="relative inline-block">
        <svg ref={svgRef} />
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-gray-800 border border-gray-600 rounded px-2 py-1 shadow-lg"
          style={{ display: 'none' }}
        />
      </div>

      <div className="flex gap-2 mt-2">
        <button onClick={handleExportPng} className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300">
          Export PNG
        </button>
        <button onClick={handleExportSvg} className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300">
          Export SVG
        </button>
      </div>
    </div>
  );
}
