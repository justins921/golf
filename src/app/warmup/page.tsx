'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useRounds, useRoundHoles } from '@/lib/hooks';
import { useWedgeMatrix } from '@/lib/hooks';
import { generateWarmup } from '@/lib/warmup';
import type { WarmupRoutine, WarmupPhase, WarmupDuration, WarmupFacility } from '@/lib/warmup';
import { analyzeRound } from '@/lib/strokesGained';
import { generatePracticeReport } from '@/lib/practicePrioritizer';

export default function WarmupPage() {
  return (
    <AuthGuard>
      <Nav />
      <WarmupGenerator />
    </AuthGuard>
  );
}

function WarmupGenerator() {
  const { rounds, loading: roundsLoading } = useRounds();
  const { matrix: wedgeMatrix, loading: wedgeLoading } = useWedgeMatrix();
  const [duration, setDuration] = useState<WarmupDuration>(30);
  const [facility, setFacility] = useState<WarmupFacility>('full');
  const [generated, setGenerated] = useState(false);
  const [activePhase, setActivePhase] = useState(0);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());

  // Get most recent scored round for SG analysis
  const lastScoredRound = useMemo(() =>
    rounds.find((r) => r.total_score != null && r.holes_played >= 18),
    [rounds]
  );

  const { holes } = useRoundHoles(lastScoredRound?.id ?? null);

  // Build SG report if we have round data
  const sgReport = useMemo(() => {
    if (!lastScoredRound || holes.length === 0) return null;
    const analysis = analyzeRound(lastScoredRound, holes);
    if (!analysis) return null;
    return generatePracticeReport(
      analysis,
      lastScoredRound.round_date,
      lastScoredRound.course_name,
      lastScoredRound.total_score!,
    );
  }, [lastScoredRound, holes]);

  const routine = useMemo<WarmupRoutine | null>(() => {
    if (!generated) return null;
    return generateWarmup({
      duration,
      facility,
      rounds,
      holes,
      wedgeMatrix,
      recentReport: sgReport,
    });
  }, [generated, duration, facility, rounds, holes, wedgeMatrix, sgReport]);

  const loading = roundsLoading || wedgeLoading;

  const toggleActivity = (id: string) => {
    setCompletedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const completedCount = completedActivities.size;
  const totalActivities = routine?.phases.reduce((s, p) => s + p.activities.length, 0) ?? 0;
  const progress = totalActivities > 0 ? (completedCount / totalActivities) * 100 : 0;

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-6">Pre-Round Warmup</h1>

      {!generated ? (
        <div className="space-y-6">
          {/* Configuration */}
          <div className="bg-gray-900 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">How much time do you have?</h2>
              <div className="grid grid-cols-4 gap-2">
                {([15, 30, 45, 60] as WarmupDuration[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-4 py-3 rounded-2xl text-center transition-colors ${
                      duration === d
                        ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-lg font-bold">{d}</div>
                    <div className="text-xs">minutes</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">What&apos;s available at the course?</h2>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'full', label: 'Full Facility', desc: 'Range + putting green + short game area' },
                  { value: 'range_only', label: 'Range Only', desc: 'Driving range, no putting green' },
                  { value: 'putting_only', label: 'Putting Green', desc: 'Putting green only, no range' },
                  { value: 'no_warmup', label: 'No Practice Area', desc: 'Just body warmup & mental prep' },
                ] as { value: WarmupFacility; label: string; desc: string }[]).map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFacility(f.value)}
                    className={`px-4 py-3 rounded-2xl text-left transition-colors ${
                      facility === f.value
                        ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-sm font-medium">{f.label}</div>
                    <div className="text-xs opacity-70">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Data insights */}
            {sgReport && (
              <div className="bg-gray-900 rounded-2xl p-5">
                <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Based on your last round</h3>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-gray-50 font-medium">{sgReport.courseName}</span>
                    <span className="text-gray-500 text-sm ml-2">({sgReport.score})</span>
                  </div>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Biggest opportunity: <span className="text-yellow-400">{sgReport.biggestOpportunity}</span>
                </div>
                {sgReport.recommendations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sgReport.recommendations.slice(0, 3).map((r, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                        {r.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!sgReport && rounds.length === 0 && (
              <div className="bg-gray-900 rounded-2xl p-5 text-sm text-gray-500">
                No round data yet. Add rounds with scorecards for personalized warmup recommendations.
              </div>
            )}
          </div>

          <button
            onClick={() => { setGenerated(true); setActivePhase(0); setCompletedActivities(new Set()); }}
            className="w-full px-6 py-3 bg-green-500 hover:bg-green-400 text-gray-50 font-medium rounded-2xl text-lg transition-colors active:scale-[0.98]"
          >
            Generate Warmup
          </button>
        </div>
      ) : routine ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-50">{routine.title}</h2>
              {routine.personalizations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {routine.personalizations.map((p, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setGenerated(false)}
              className="px-3 py-1.5 text-sm bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700"
            >
              Customize
            </button>
          </div>

          {/* Progress bar */}
          <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 text-right">
            {completedCount}/{totalActivities} activities complete
          </div>

          {/* Phase tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {routine.phases.map((phase, i) => {
              const phaseComplete = phase.activities.every(
                (_, ai) => completedActivities.has(`${i}-${ai}`)
              );
              return (
                <button
                  key={i}
                  onClick={() => setActivePhase(i)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activePhase === i
                      ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                      : phaseComplete
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <PhaseIcon icon={phase.icon} />
                  <span>{phase.name}</span>
                  <span className="text-xs opacity-70">{phase.minutes}m</span>
                </button>
              );
            })}
          </div>

          {/* Active phase */}
          {routine.phases[activePhase] && (
            <PhaseCard
              phase={routine.phases[activePhase]}
              phaseIndex={activePhase}
              completedActivities={completedActivities}
              onToggle={toggleActivity}
              isLast={activePhase === routine.phases.length - 1}
              onNext={() => setActivePhase((p) => Math.min(p + 1, routine.phases.length - 1))}
            />
          )}

          {/* Completion */}
          {progress === 100 && (
            <div className="bg-green-500/10 rounded-2xl p-6 text-center">
              <div className="text-2xl mb-2">&#9971;</div>
              <div className="text-lg font-bold text-green-400">Warmup Complete!</div>
              <div className="text-sm text-gray-400 mt-1">
                You&apos;re ready to play. Trust your preparation and commit to every shot.
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// Phase Card
// ============================================================

function PhaseCard({
  phase,
  phaseIndex,
  completedActivities,
  onToggle,
  isLast,
  onNext,
}: {
  phase: WarmupPhase;
  phaseIndex: number;
  completedActivities: Set<string>;
  onToggle: (id: string) => void;
  isLast: boolean;
  onNext: () => void;
}) {
  const allComplete = phase.activities.every(
    (_, i) => completedActivities.has(`${phaseIndex}-${i}`)
  );

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhaseIcon icon={phase.icon} />
          <h3 className="font-medium text-gray-50">{phase.name}</h3>
          <span className="text-xs text-gray-500">{phase.minutes} min</span>
        </div>
        {allComplete && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
            Complete
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-800/50">
        {phase.activities.map((activity, i) => {
          const id = `${phaseIndex}-${i}`;
          const done = completedActivities.has(id);
          return (
            <div
              key={i}
              className={`p-4 flex gap-3 transition-colors ${done ? 'bg-green-500/5' : ''}`}
            >
              <button
                onClick={() => onToggle(id)}
                className={`mt-0.5 w-6 h-6 rounded-lg flex-shrink-0 border flex items-center justify-center transition-colors ${
                  done
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                {done && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-gray-50'}`}>
                    {activity.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">
                    {activity.duration}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${done ? 'text-gray-600' : 'text-gray-400'}`}>
                  {activity.description}
                </p>
                {activity.focusArea && (
                  <span className={`text-[10px] mt-1 inline-block ${done ? 'text-gray-600' : 'text-blue-400'}`}>
                    Focus: {activity.focusArea}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isLast && allComplete && (
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={onNext}
            className="w-full px-4 py-2 bg-green-500 hover:bg-green-400 text-gray-50 text-sm rounded-2xl active:scale-[0.98]"
          >
            Next Phase &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Phase icon helper
// ============================================================

function PhaseIcon({ icon }: { icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    body: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
      </svg>
    ),
    putting: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
      </svg>
    ),
    short_game: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      </svg>
    ),
    full_swing: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    mental: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  };
  return <span className="text-gray-400">{icons[icon] ?? null}</span>;
}
