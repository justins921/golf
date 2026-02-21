'use client';

import { useMemo, useRef, lazy, Suspense } from 'react';
import type { Shot, YardageCardClub, YardageCardConfig, EnvironmentConditions, WedgeMatrix } from '@/lib/types';
import { sortClubs, SWING_SYSTEM_LABELS } from '@/lib/types';
import { percentile, mean, filterShots } from '@/lib/stats';
import { adjustCarry, STANDARD_CONDITIONS } from '@/lib/environment';
import { svgToPng, downloadBlob } from '@/lib/export';

const YardageCardPDFButtonInner = lazy(() => import('./YardageCardPDF'));

function YardageCardPDFButtonLazy(props: { shots: Shot[]; config: YardageCardConfig; sessionEnv?: EnvironmentConditions | null; destEnv?: EnvironmentConditions | null }) {
  return (
    <Suspense fallback={<button className="px-3 py-1 text-xs bg-gray-800 rounded text-gray-500" disabled>Export PDF</button>}>
      <YardageCardPDFButtonInner {...props} />
    </Suspense>
  );
}

interface Props {
  shots: Shot[];
  config: YardageCardConfig;
  sessionEnv?: EnvironmentConditions | null;
  destEnv?: EnvironmentConditions | null;
  wedgeMatrix?: WedgeMatrix | null;
}

function computeCardClubs(
  shots: Shot[],
  config: YardageCardConfig,
  sessionEnv?: EnvironmentConditions | null,
  destEnv?: EnvironmentConditions | null
): YardageCardClub[] {
  // Apply full shot filter
  const filtered = filterShots(shots, {
    fullShotsOnly: config.fullShotsOnly,
    includePartials: !config.fullShotsOnly,
    onlyWithTargets: false,
    targetWindow: null,
  });

  // Group by club
  const byClub = new Map<string, Shot[]>();
  for (const s of filtered) {
    if (config.includedClubs.length > 0 && !config.includedClubs.includes(s.club_name)) continue;
    const arr = byClub.get(s.club_name) ?? [];
    arr.push(s);
    byClub.set(s.club_name, arr);
  }

  const [pLow, pHigh] = config.percentileBand === 'P10-P90' ? [10, 90] : [20, 80];

  const clubs: YardageCardClub[] = [];
  const sortedNames = sortClubs(Array.from(byClub.keys()));

  for (const name of sortedNames) {
    const clubShots = byClub.get(name)!;
    const n = clubShots.length;

    if (n < config.minShotThreshold && !config.includeLowConfidence) continue;

    // Get distances, optionally adjusted for environment
    let carryDistances = clubShots.map((s) => s.carry_distance_yd);
    let totalDistances = clubShots.map((s) => s.total_distance_yd);
    const laterals = clubShots.map((s) => s.carry_lateral_yd);

    if (config.distanceMode === 'normalized' && sessionEnv) {
      carryDistances = carryDistances.map((d) => adjustCarry(d, sessionEnv, STANDARD_CONDITIONS));
      totalDistances = totalDistances.map((d) => adjustCarry(d, sessionEnv, STANDARD_CONDITIONS));
    } else if (config.distanceMode === 'simulated' && sessionEnv && destEnv) {
      carryDistances = carryDistances.map((d) => {
        const normalized = adjustCarry(d, sessionEnv, STANDARD_CONDITIONS);
        return adjustCarry(normalized, STANDARD_CONDITIONS, destEnv);
      });
      totalDistances = totalDistances.map((d) => {
        const normalized = adjustCarry(d, sessionEnv, STANDARD_CONDITIONS);
        return adjustCarry(normalized, STANDARD_CONDITIONS, destEnv);
      });
    }

    const sortedCarry = [...carryDistances].sort((a, b) => a - b);
    const sortedTotal = [...totalDistances].sort((a, b) => a - b);

    const tendency = mean(laterals);
    const confidence: 'Low' | 'Med' | 'High' = n >= 12 ? 'High' : n >= 8 ? 'Med' : 'Low';

    // Detect driver by name
    const isDriver = /^(driver|d)$/i.test(name);

    // Dispersion arc (driver): P10-P90 lateral spread
    const sortedLateral = [...laterals].sort((a, b) => a - b);
    const latP10 = percentile(sortedLateral, 10);
    const latP90 = percentile(sortedLateral, 90);
    const dispLeft = Math.round(Math.abs(Math.min(latP10, 0)));
    const dispRight = Math.round(Math.max(latP90, 0));
    const dispArc = dispLeft + dispRight;
    const dispBias: 'L' | 'R' | 'C' = dispRight - dispLeft > 3 ? 'R' : dispLeft - dispRight > 3 ? 'L' : 'C';

    // Dispersion circle (approach): P80 radius from centroid
    const meanCarry = mean(carryDistances);
    const meanLat = mean(laterals);
    const radii = carryDistances.map((d, idx) => {
      const dErr = d - meanCarry;
      const lErr = laterals[idx] - meanLat;
      return Math.sqrt(dErr * dErr + lErr * lErr);
    });
    const sortedRadii = [...radii].sort((a, b) => a - b);
    const dispRadius = Math.round(percentile(sortedRadii, 80));

    clubs.push({
      clubName: name,
      clubType: clubShots[0].club_type,
      carryRange: [
        Math.round(percentile(sortedCarry, pLow)),
        Math.round(percentile(sortedCarry, pHigh)),
      ],
      totalRange: [
        Math.round(percentile(sortedTotal, pLow)),
        Math.round(percentile(sortedTotal, pHigh)),
      ],
      tendency: Math.round(tendency * 10) / 10,
      tendencyLabel: tendency > 0.5 ? `+${tendency.toFixed(1)}y R` : tendency < -0.5 ? `${tendency.toFixed(1)}y L` : 'Straight',
      confidence,
      n,
      dispersionArc: dispArc,
      dispersionLeft: dispLeft,
      dispersionRight: dispRight,
      dispersionBias: dispBias,
      dispersionRadius: dispRadius,
      isDriver,
    });
  }

  // Compute gaps
  for (let i = 0; i < clubs.length - 1; i++) {
    const current = (clubs[i].carryRange[0] + clubs[i].carryRange[1]) / 2;
    const next = (clubs[i + 1].carryRange[0] + clubs[i + 1].carryRange[1]) / 2;
    clubs[i].gapToNext = Math.round(current - next);
  }

  return clubs;
}

export default function YardageCardPreview({ shots, config, sessionEnv, destEnv, wedgeMatrix }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const clubs = useMemo(
    () => computeCardClubs(shots, config, sessionEnv, destEnv),
    [shots, config, sessionEnv, destEnv]
  );

  const handleExportPng = async () => {
    if (!cardRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { backgroundColor: '#111827', pixelRatio: 3 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, 'yardage-card.png');
    } catch (err) {
      console.error('PNG export failed', err);
    }
  };

  const bandLabel = config.percentileBand === 'P10-P90' ? 'P10–P90' : 'P20–P80';
  const modeLabel = config.distanceMode === 'normalized'
    ? 'Normalized (Std Conditions)'
    : config.distanceMode === 'simulated'
    ? 'Simulated (Destination)'
    : 'Observed';

  return (
    <div>
      <div
        ref={cardRef}
        className="bg-gray-900 border border-gray-700 rounded-lg p-3 max-w-sm mx-auto"
      >
        <div className="text-center mb-2">
          <h2 className="text-green-400 font-bold text-sm">Yardage Card</h2>
          <p className="text-[8px] text-gray-500 leading-tight">
            {bandLabel} | {config.fullShotsOnly ? 'Full' : 'All'} | {modeLabel}
          </p>
          {config.distanceMode === 'simulated' && destEnv && (
            <p className="text-[8px] text-yellow-500 leading-tight">
              {destEnv.elevationFt}ft / {destEnv.temperatureF}°F / {destEnv.relativeHumidityPct}%RH
            </p>
          )}
        </div>

        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-gray-700 text-gray-500 uppercase text-[7px]">
              <th className="py-0.5 px-0.5 text-left">Club</th>
              <th className="py-0.5 px-0.5 text-center">Carry</th>
              <th className="py-0.5 px-0.5 text-center">Total</th>
              {config.showGaps && <th className="py-0.5 px-0.5 text-center">Gap</th>}
              {config.showDispersionArc && <th className="py-0.5 px-0.5 text-center">Disp</th>}
              {config.showTendency && <th className="py-0.5 px-0.5 text-center">Tend</th>}
            </tr>
          </thead>
          <tbody>
            {clubs.map((club) => (
              <tr key={club.clubName} className="border-b border-gray-800/50">
                <td className="py-0.5 px-0.5 text-gray-200 font-medium whitespace-nowrap">{club.clubName}</td>
                <td className="py-0.5 px-0.5 text-center text-gray-300">
                  {club.carryRange[0]}–{club.carryRange[1]}
                </td>
                <td className="py-0.5 px-0.5 text-center text-gray-400">
                  {club.totalRange[0]}–{club.totalRange[1]}
                </td>
                {config.showGaps && (
                  <td className="py-0.5 px-0.5 text-center text-gray-500">
                    {club.gapToNext != null ? club.gapToNext : '—'}
                  </td>
                )}
                {config.showDispersionArc && (
                  <td className="py-0.5 px-0.5 text-center whitespace-nowrap">
                    {club.isDriver ? (
                      <>
                        <span className={club.dispersionBias === 'R' ? 'text-yellow-400' : club.dispersionBias === 'L' ? 'text-blue-400' : 'text-gray-400'}>
                          {club.dispersionArc}
                        </span>
                        <span className="text-[7px] text-gray-500 ml-0.5">
                          {club.dispersionLeft}L·{club.dispersionRight}R
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">
                        {club.dispersionRadius}<span className="text-[7px] text-gray-500">yd</span>
                      </span>
                    )}
                  </td>
                )}
                {config.showTendency && (
                  <td className="py-0.5 px-0.5 text-center">
                    <span className={club.tendency > 0.5 ? 'text-yellow-400' : club.tendency < -0.5 ? 'text-blue-400' : 'text-gray-500'}>
                      {club.tendencyLabel}
                    </span>
                  </td>
                )}
                {/* confidence and n kept in data but hidden from card */}
              </tr>
            ))}
          </tbody>
        </table>

        {clubs.length === 0 && (
          <div className="text-center text-gray-600 py-3 text-xs">
            No clubs meet the minimum shot threshold ({config.minShotThreshold})
          </div>
        )}

        {/* Wedge matrix section */}
        {wedgeMatrix && wedgeMatrix.swing_labels.length > 0 && wedgeMatrix.wedge_clubs.length > 0 && Object.keys(wedgeMatrix.distances).length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <h3 className="text-xs font-medium text-green-400 text-center mb-2">
              Wedge Matrix
              <span className="text-gray-500 font-normal ml-1">({SWING_SYSTEM_LABELS[wedgeMatrix.swing_system]})</span>
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700 text-gray-500 uppercase">
                  <th className="p-1 text-left">Swing</th>
                  {wedgeMatrix.wedge_clubs.map((club) => (
                    <th key={club} className="p-1 text-center">{club}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wedgeMatrix.swing_labels.map((label) => (
                  <tr key={label} className="border-b border-gray-800/50">
                    <td className="p-1 text-gray-400 font-medium">{label}</td>
                    {wedgeMatrix.wedge_clubs.map((club) => {
                      const key = `${club}|${label}`;
                      const dist = wedgeMatrix.distances[key];
                      return (
                        <td key={club} className="p-1 text-center text-gray-300">
                          {dist != null ? dist : <span className="text-gray-600">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[7px] text-gray-600 mt-1.5 text-center">
          {config.distanceMode !== 'observed' && 'Distances are estimates. '}
          Generated by Golf OS
        </p>
      </div>

      <div className="flex gap-2 mt-2 justify-center">
        <button
          onClick={handleExportPng}
          className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
        >
          Export PNG
        </button>
        <YardageCardPDFButtonLazy shots={shots} config={config} sessionEnv={sessionEnv} destEnv={destEnv} />
      </div>
    </div>
  );
}

export { computeCardClubs };
