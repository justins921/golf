'use client';

import type { ClubStats } from '@/lib/types';
import { sortClubs } from '@/lib/types';

interface Props {
  stats: ClubStats[];
  title?: string;
  mode?: 'carry' | 'total';
}

export default function StatsPanel({ stats, title, mode = 'carry' }: Props) {
  const sorted = stats.sort(
    (a, b) => (sortClubs([a.clubName, b.clubName])[0] === a.clubName ? -1 : 1)
  );

  if (stats.length === 0) {
    return <div className="text-sm text-gray-600">No stats to display</div>;
  }

  return (
    <div>
      {title && <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">{title}</h3>}
      <div className="bg-gray-900 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[13px] text-gray-500 uppercase">
              <th className="p-1.5 text-left">Club</th>
              <th className="p-1.5 text-right">n</th>
              <th className="p-1.5 text-right">Mean</th>
              <th className="p-1.5 text-right">&sigma; Dist</th>
              <th className="p-1.5 text-right">Median</th>
              <th className="p-1.5 text-right">Bias</th>
              <th className="p-1.5 text-right">&sigma; Lat</th>
              <th className="p-1.5 text-right">Area 1&sigma;</th>
              {sorted.some((s) => s.targetStats) && (
                <>
                  <th className="p-1.5 text-right">Tgt Err</th>
                  <th className="p-1.5 text-right">&plusmn;10 yd</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {sorted.map((s) => {
              const d = mode === 'carry' ? s.carry : s.total;
              return (
                <tr key={s.clubName} className="hover:bg-gray-800/40">
                  <td className="p-1.5 text-gray-200 font-medium">{s.clubName}</td>
                  <td className="p-1.5 text-right text-gray-400">{s.n}</td>
                  <td className="p-1.5 text-right text-gray-300">{d.meanDistance.toFixed(1)}</td>
                  <td className="p-1.5 text-right text-gray-400">{d.sdDistance.toFixed(1)}</td>
                  <td className="p-1.5 text-right text-gray-300">{d.medianDistance.toFixed(1)}</td>
                  <td className="p-1.5 text-right">
                    <span className={d.meanLateral > 2 ? 'text-yellow-400' : d.meanLateral < -2 ? 'text-blue-400' : 'text-gray-400'}>
                      {d.meanLateral > 0 ? '+' : ''}{d.meanLateral.toFixed(1)}
                      {d.meanLateral > 0 ? ' R' : d.meanLateral < 0 ? ' L' : ''}
                    </span>
                  </td>
                  <td className="p-1.5 text-right text-gray-400">{d.sdLateral.toFixed(1)}</td>
                  <td className="p-1.5 text-right text-gray-500">{d.patternArea1Sigma.toFixed(0)}</td>
                  {sorted.some((st) => st.targetStats) && (
                    <>
                      <td className="p-1.5 text-right text-gray-400">
                        {s.targetStats ? `${s.targetStats.meanError > 0 ? '+' : ''}${s.targetStats.meanError.toFixed(1)}` : '\u2014'}
                      </td>
                      <td className="p-1.5 text-right text-gray-400">
                        {s.targetStats ? `${(s.targetStats.pctWithin10 * 100).toFixed(0)}%` : '\u2014'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
