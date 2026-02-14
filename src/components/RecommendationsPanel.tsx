'use client';

import { useMemo, useState } from 'react';
import type { ClubStats } from '@/lib/types';
import { generateRecommendations, generatePracticePlan } from '@/lib/recommendations';

interface Props {
  clubStats: ClubStats[];
}

export default function RecommendationsPanel({ clubStats }: Props) {
  const [handicap, setHandicap] = useState(10.8);
  const [goalHandicap, setGoalHandicap] = useState(9.0);

  const recommendations = useMemo(
    () => generateRecommendations({ currentHandicap: handicap, goalHandicap, clubStats }),
    [handicap, goalHandicap, clubStats]
  );

  const practicePlan = useMemo(
    () => generatePracticePlan(recommendations),
    [recommendations]
  );

  const top5 = recommendations.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Current Handicap</label>
          <input
            type="number"
            step="0.1"
            value={handicap}
            onChange={(e) => setHandicap(parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Goal Handicap</label>
          <input
            type="number"
            step="0.1"
            value={goalHandicap}
            onChange={(e) => setGoalHandicap(parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white"
          />
        </div>
      </div>

      {top5.length === 0 ? (
        <div className="text-sm text-gray-500">
          Not enough data to generate recommendations. Need at least 5 shots per club.
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Top Recommendations</h3>
          {top5.map((rec, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold text-sm mt-0.5">#{i + 1}</span>
                <div>
                  <p className="text-sm text-gray-200">{rec.issue}</p>
                  <p className="text-xs text-gray-400 mt-1">{rec.suggestion}</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Metric: {rec.metric} = {rec.value.toFixed(2)} (threshold: {rec.threshold.toFixed(1)})
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {practicePlan && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-400 mb-2">{practicePlan.title}</h3>
          <div className="space-y-2">
            {practicePlan.drills.map((drill, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-xs text-gray-500 min-w-[48px]">{drill.duration}</span>
                <div>
                  <p className="text-sm text-gray-200">{drill.name}</p>
                  <p className="text-xs text-gray-400">{drill.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
