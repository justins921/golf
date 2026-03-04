'use client';

import { useState, useMemo } from 'react';
import type { Round, RoundHole } from '@/lib/types';
import { analyzeRound } from '@/lib/strokesGained';
import type { RoundSGAnalysis, HoleSG } from '@/lib/strokesGained';
import { generatePracticeReport } from '@/lib/practicePrioritizer';
import type { PracticePriorityReport, PracticeRecommendation } from '@/lib/practicePrioritizer';

// ============================================================
// Main component
// ============================================================

export default function RoundAnalysis({
  round,
  holes,
}: {
  round: Round;
  holes: RoundHole[];
}) {
  const [handicap, setHandicap] = useState(15);
  const [activeTab, setActiveTab] = useState<'overview' | 'holes' | 'practice'>('overview');

  const analysis = useMemo(() => {
    if (holes.length === 0) return null;
    return analyzeRound(round, holes, handicap);
  }, [round, holes, handicap]);

  const practiceReport = useMemo(() => {
    if (!analysis) return null;
    return generatePracticeReport(
      analysis,
      round.round_date,
      round.course_name,
      round.total_score ?? 0,
    );
  }, [analysis, round]);

  if (holes.length === 0 || !holes.some((h) => h.score && h.score > 0)) {
    return (
      <div className="text-center text-gray-600 py-12 text-sm">
        Enter your scorecard to see Strokes Gained analysis.
        <br />
        <span className="text-gray-700 text-xs">Tip: Include putts, FIR, GIR, and up & down data for the best analysis.</span>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-4">
      {/* Handicap selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500">Benchmark handicap:</label>
        <select
          value={handicap}
          onChange={(e) => setHandicap(parseInt(e.target.value))}
          className="px-2 py-1 text-sm bg-gray-900 border border-gray-700 rounded text-gray-300"
        >
          <option value={0}>Scratch (0)</option>
          <option value={5}>5 HI</option>
          <option value={10}>10 HI</option>
          <option value={15}>15 HI</option>
          <option value={20}>20 HI</option>
          <option value={25}>25 HI</option>
          <option value={30}>30+ HI</option>
        </select>
        <span className="text-xs text-gray-600">vs {analysis.benchmark.label} golfer</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800 pb-1">
        {(['overview', 'holes', 'practice'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-sm rounded-t ${
              activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'overview' ? 'SG Overview' : tab === 'holes' ? 'By Hole' : 'Practice Plan'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <SGOverview analysis={analysis} />}
      {activeTab === 'holes' && <SGByHole analysis={analysis} />}
      {activeTab === 'practice' && practiceReport && <PracticePlan report={practiceReport} />}
    </div>
  );
}

// ============================================================
// SG Overview tab
// ============================================================

function SGOverview({ analysis }: { analysis: RoundSGAnalysis }) {
  const b = analysis.benchmark;

  const categories = [
    { label: 'Off the Tee', sg: analysis.sgOtt, color: 'blue' },
    { label: 'Approach', sg: analysis.sgApproach, color: 'green' },
    { label: 'Short Game', sg: analysis.sgShortGame, color: 'yellow' },
    { label: 'Putting', sg: analysis.sgPutting, color: 'purple' },
  ];

  return (
    <div className="space-y-5">
      {/* Total SG card */}
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <div className="text-xs text-gray-500 mb-1">
          Total Strokes Gained vs {b.label} Golfer
        </div>
        <div className={`text-3xl font-bold ${analysis.totalSG >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {analysis.totalSG >= 0 ? '+' : ''}{analysis.totalSG.toFixed(1)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Benchmark: {b.avgScore18} | Actual: {analysis.holes.reduce((s, h) => s + h.score, 0)}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <SGCategoryCard key={cat.label} label={cat.label} sg={cat.sg} color={cat.color} />
        ))}
      </div>

      {/* SG bar chart */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3">Strokes Gained Breakdown</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <SGBar key={cat.label} label={cat.label} sg={cat.sg} />
          ))}
        </div>
      </div>

      {/* Key stats */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3">Key Stats vs Benchmark</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <StatRow label="Fairways Hit" value={`${analysis.firCount}/${analysis.firHoles} (${analysis.firPct.toFixed(0)}%)`} benchmark={`${b.firPct}%`} better={analysis.firPct >= b.firPct} />
          <StatRow label="Greens in Reg" value={`${analysis.girCount}/${analysis.holes.length} (${analysis.girPct.toFixed(0)}%)`} benchmark={`${b.girPct}%`} better={analysis.girPct >= b.girPct} />
          <StatRow label="Up & Down" value={`${analysis.upAndDownMade}/${analysis.upAndDownAttempts} (${analysis.upAndDownPct.toFixed(0)}%)`} benchmark={`${b.upAndDownPct}%`} better={analysis.upAndDownPct >= b.upAndDownPct} />
          <StatRow label="Total Putts" value={`${analysis.totalPutts}`} benchmark={`${b.puttsPerRound}`} better={analysis.totalPutts <= b.puttsPerRound} />
          <StatRow label="Putts / GIR" value={analysis.puttsPerGir > 0 ? `${analysis.puttsPerGir.toFixed(2)}` : '—'} benchmark={`${b.puttsPerGir}`} better={analysis.puttsPerGir <= b.puttsPerGir} />
          <StatRow label="3-Putts" value={`${analysis.threePuttCount}`} benchmark={`~${Math.round(18 * b.threePuttPctGir / 100)}`} better={analysis.threePuttCount <= Math.round(18 * b.threePuttPctGir / 100)} />
          <StatRow label="1-Putts" value={`${analysis.onePuttCount}`} benchmark="—" better={analysis.onePuttCount >= 3} />
          <StatRow label="Penalties" value={`${analysis.totalPenalties}`} benchmark="~1" better={analysis.totalPenalties <= 1} />
        </div>
      </div>
    </div>
  );
}

function SGCategoryCard({ label, sg, color }: { label: string; sg: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: sg >= 0 ? 'border-blue-500/50' : 'border-blue-900/50',
    green: sg >= 0 ? 'border-green-500/50' : 'border-green-900/50',
    yellow: sg >= 0 ? 'border-yellow-500/50' : 'border-yellow-900/50',
    purple: sg >= 0 ? 'border-purple-500/50' : 'border-purple-900/50',
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-3 border-l-4 ${colorMap[color]}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold ${sg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {sg >= 0 ? '+' : ''}{sg.toFixed(1)}
      </div>
    </div>
  );
}

function SGBar({ label, sg }: { label: string; sg: number }) {
  const maxWidth = 5; // max SG for scaling
  const pct = Math.min(100, (Math.abs(sg) / maxWidth) * 100);
  const isPositive = sg >= 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 flex items-center h-5">
        {/* Center line */}
        <div className="relative w-full h-full flex items-center">
          {/* The bar */}
          {isPositive ? (
            <div className="absolute left-1/2 h-3 bg-green-500/60 rounded-r" style={{ width: `${pct / 2}%` }} />
          ) : (
            <div className="absolute h-3 bg-red-500/60 rounded-l" style={{ width: `${pct / 2}%`, right: '50%' }} />
          )}
          {/* Center line */}
          <div className="absolute left-1/2 w-px h-full bg-gray-600" />
        </div>
      </div>
      <span className={`text-xs font-mono w-12 text-right ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{sg.toFixed(1)}
      </span>
    </div>
  );
}

function StatRow({ label, value, benchmark, better }: { label: string; value: string; benchmark: string; better: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-gray-400">{label}</span>
        <div className={`font-medium ${better ? 'text-green-400' : 'text-red-400'}`}>{value}</div>
      </div>
      <div className="text-right">
        <span className="text-[10px] text-gray-600 uppercase">Benchmark</span>
        <div className="text-xs text-gray-500">{benchmark}</div>
      </div>
    </div>
  );
}

// ============================================================
// SG By Hole tab
// ============================================================

function SGByHole({ analysis }: { analysis: RoundSGAnalysis }) {
  const [sgView, setSgView] = useState<'total' | 'putting' | 'teeToGreen'>('total');

  const getSgValue = (hole: HoleSG) => {
    switch (sgView) {
      case 'total': return hole.sgTotal;
      case 'putting': return hole.sgPutting;
      case 'teeToGreen': return hole.sgTeeToGreen;
    }
  };

  const maxSg = Math.max(1, ...analysis.holes.map((h) => Math.abs(getSgValue(h))));

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-1">
        {(['total', 'putting', 'teeToGreen'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setSgView(v)}
            className={`px-2 py-1 text-xs rounded ${sgView === v ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-500'}`}
          >
            {v === 'total' ? 'Total' : v === 'putting' ? 'Putting' : 'Tee-to-Green'}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-end gap-1 h-40">
          {analysis.holes.map((hole) => {
            const sg = getSgValue(hole);
            const pct = Math.max(4, (Math.abs(sg) / maxSg) * 100);
            const isPositive = sg >= 0;

            return (
              <div key={hole.holeNumber} className="flex-1 flex flex-col items-center group relative">
                {/* Positive bars grow up from center */}
                <div className="flex-1 flex flex-col justify-end">
                  {isPositive && (
                    <div
                      className="w-full bg-green-500/70 rounded-t"
                      style={{ height: `${pct}%`, minHeight: '2px' }}
                    />
                  )}
                </div>
                {/* Negative bars grow down from center */}
                <div className="flex-1 flex flex-col justify-start">
                  {!isPositive && (
                    <div
                      className="w-full bg-red-500/70 rounded-b"
                      style={{ height: `${pct}%`, minHeight: '2px' }}
                    />
                  )}
                </div>
                {/* Tooltip */}
                <div className="hidden group-hover:block absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                  <div className="text-gray-400">Hole {hole.holeNumber} (Par {hole.par})</div>
                  <div className="text-white">Score: {hole.score} | Putts: {hole.putts}</div>
                  <div className={sg >= 0 ? 'text-green-400' : 'text-red-400'}>
                    SG: {sg >= 0 ? '+' : ''}{sg.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Hole numbers */}
        <div className="flex gap-1 mt-1">
          {analysis.holes.map((hole) => (
            <div key={hole.holeNumber} className="flex-1 text-center text-[9px] text-gray-600">
              {hole.holeNumber}
            </div>
          ))}
        </div>
      </div>

      {/* Hole-by-hole table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 uppercase">
              <th className="p-1.5 text-left">Hole</th>
              <th className="p-1.5 text-center">Par</th>
              <th className="p-1.5 text-center">Score</th>
              <th className="p-1.5 text-center">Putts</th>
              <th className="p-1.5 text-center">SG Total</th>
              <th className="p-1.5 text-center">SG Putt</th>
              <th className="p-1.5 text-center">SG OTT</th>
              <th className="p-1.5 text-center">SG App</th>
              <th className="p-1.5 text-center">SG Short</th>
            </tr>
          </thead>
          <tbody>
            {analysis.holes.map((hole) => (
              <tr key={hole.holeNumber} className="border-b border-gray-800/50">
                <td className="p-1.5 text-gray-400">{hole.holeNumber}</td>
                <td className="p-1.5 text-center text-gray-500">{hole.par}</td>
                <td className="p-1.5 text-center text-white">{hole.score}</td>
                <td className="p-1.5 text-center text-gray-400">{hole.putts}</td>
                <td className={`p-1.5 text-center font-mono ${hole.sgTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatSG(hole.sgTotal)}
                </td>
                <td className={`p-1.5 text-center font-mono ${hole.sgPutting >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatSG(hole.sgPutting)}
                </td>
                <td className={`p-1.5 text-center font-mono ${hole.sgOtt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatSG(hole.sgOtt)}
                </td>
                <td className={`p-1.5 text-center font-mono ${hole.sgApproach >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatSG(hole.sgApproach)}
                </td>
                <td className={`p-1.5 text-center font-mono ${hole.sgShortGame >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatSG(hole.sgShortGame)}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-t-2 border-gray-700 bg-gray-800/50 font-medium">
              <td className="p-1.5 text-gray-400" colSpan={2}>Total</td>
              <td className="p-1.5 text-center text-white">{analysis.holes.reduce((s, h) => s + h.score, 0)}</td>
              <td className="p-1.5 text-center text-gray-400">{analysis.totalPutts}</td>
              <td className={`p-1.5 text-center font-mono ${analysis.totalSG >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatSG(analysis.totalSG)}
              </td>
              <td className={`p-1.5 text-center font-mono ${analysis.sgPutting >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatSG(analysis.sgPutting)}
              </td>
              <td className={`p-1.5 text-center font-mono ${analysis.sgOtt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatSG(analysis.sgOtt)}
              </td>
              <td className={`p-1.5 text-center font-mono ${analysis.sgApproach >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatSG(analysis.sgApproach)}
              </td>
              <td className={`p-1.5 text-center font-mono ${analysis.sgShortGame >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatSG(analysis.sgShortGame)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Practice Plan tab
// ============================================================

function PracticePlan({ report }: { report: PracticePriorityReport }) {
  if (report.recommendations.length === 0) {
    return (
      <div className="text-center text-gray-600 py-8 text-sm">
        Your round matched or exceeded benchmarks. Keep up the good work!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-2">Biggest Opportunity</h3>
        <div className="text-lg font-bold text-red-400">{report.biggestOpportunity}</div>
        <div className="text-xs text-gray-500 mt-1">{report.summary}</div>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        {report.recommendations.map((rec, i) => (
          <RecommendationCard key={i} rec={rec} />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: PracticeRecommendation }) {
  const [expanded, setExpanded] = useState(false);

  const categoryColors: Record<string, string> = {
    putting: 'border-purple-500/50 bg-purple-900/10',
    short_game: 'border-yellow-500/50 bg-yellow-900/10',
    approach: 'border-green-500/50 bg-green-900/10',
    off_the_tee: 'border-blue-500/50 bg-blue-900/10',
  };

  const categoryLabels: Record<string, string> = {
    putting: 'Putting',
    short_game: 'Short Game',
    approach: 'Approach',
    off_the_tee: 'Off the Tee',
  };

  return (
    <div className={`rounded-lg border-l-4 ${categoryColors[rec.category]} p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
              #{rec.priority}
            </span>
            <span className="text-xs text-gray-500">{categoryLabels[rec.category]}</span>
            <span className={`text-xs font-mono ${rec.sgImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {rec.sgImpact >= 0 ? '+' : ''}{rec.sgImpact.toFixed(1)} SG
            </span>
          </div>
          <h4 className="text-sm font-medium text-white">{rec.title}</h4>
          <p className="text-xs text-gray-400 mt-1">{rec.reason}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-500 hover:text-gray-300 px-2"
        >
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-gray-800 pt-3">
          <div>
            <div className="text-[10px] text-gray-600 uppercase mb-1">Benchmark</div>
            <div className="text-xs text-gray-400">{rec.benchmarkComparison}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 uppercase mb-1">Recommended Drills</div>
            <ul className="text-xs text-gray-400 space-y-1">
              {rec.drillSuggestions.map((d, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-green-600 mt-0.5">-</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <div className="text-[10px] text-gray-600 uppercase mb-1">Tip</div>
            <div className="text-xs text-gray-300">{rec.tip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatSG(sg: number): string {
  if (sg === 0) return '0.0';
  return `${sg >= 0 ? '+' : ''}${sg.toFixed(1)}`;
}
