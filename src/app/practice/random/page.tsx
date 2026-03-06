'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { usePracticeSessions, useAllPracticeShots } from '@/lib/practice/hooks';
import { buildRandomPlan } from '@/lib/practice/drills';
import type { PracticeLocation, DrillCategory, SessionPlan } from '@/lib/practice/types';

export default function RandomPracticePage() {
  return (
    <AuthGuard>
      <Nav />
      <RandomPracticeGenerator />
    </AuthGuard>
  );
}

function RandomPracticeGenerator() {
  const router = useRouter();
  const { sessions, createSession } = usePracticeSessions();
  const { shots: allShots } = useAllPracticeShots();

  const [minutes, setMinutes] = useState<number | null>(null);
  const [location, setLocation] = useState<PracticeLocation | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<SessionPlan | null>(null);
  const [starting, setStarting] = useState(false);

  // Analyze recent data for weak areas
  const weakAreas = useMemo(() => {
    if (allShots.length < 10) return [];

    const areas: { category: DrillCategory; reason: string }[] = [];

    // Group shots by category
    const wedgeShots = allShots.filter((s) => ['PW', 'GW', 'SW', 'LW', 'AW'].includes(s.club_name) || /^\d+°?$/.test(s.club_name));
    const fullShots = allShots.filter((s) => !['PW', 'GW', 'SW', 'LW', 'AW'].includes(s.club_name) && !/^\d+°?$/.test(s.club_name));

    // Check wedge accuracy
    if (wedgeShots.length >= 5) {
      const avgError = wedgeShots.reduce((s, sh) => s + Math.abs(sh.computed?.error ?? 0), 0) / wedgeShots.length;
      if (avgError > 8) {
        areas.push({ category: 'wedges', reason: `Wedge avg error is ${avgError.toFixed(1)} yds -- room to tighten` });
      }
    }

    // Check full swing consistency
    if (fullShots.length >= 5) {
      const avgError = fullShots.reduce((s, sh) => s + Math.abs(sh.computed?.error ?? 0), 0) / fullShots.length;
      if (avgError > 12) {
        areas.push({ category: 'full_swing', reason: `Full swing avg error is ${avgError.toFixed(1)} yds -- focus on consistency` });
      }
    }

    // Check what hasn't been practiced recently
    const recentCategories = new Set(sessions.slice(0, 3).map((s) => s.category).filter(Boolean));
    if (!recentCategories.has('wedges') && areas.length < 2) {
      areas.push({ category: 'wedges', reason: "Haven't practiced wedges recently" });
    }
    if (!recentCategories.has('putting') && areas.length < 3) {
      areas.push({ category: 'putting', reason: "Haven't practiced putting recently" });
    }

    return areas;
  }, [allShots, sessions]);

  const handleGenerate = () => {
    if (!minutes || !location) return;
    const plan = buildRandomPlan(minutes, location, weakAreas.length > 0 ? weakAreas : undefined);
    setGeneratedPlan(plan);
  };

  const handleStart = async () => {
    if (!generatedPlan || !location) return;
    setStarting(true);
    const sessionId = await createSession({
      mode: 'RANDOM',
      category: 'random',
      location,
      plan: generatedPlan,
    });
    if (sessionId) {
      router.push(`/practice/session/${sessionId}`);
    }
    setStarting(false);
  };

  const handleRegenerate = () => {
    if (!minutes || !location) return;
    const plan = buildRandomPlan(minutes, location, weakAreas.length > 0 ? weakAreas : undefined);
    setGeneratedPlan(plan);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-2">Random Practice</h1>
      <p className="text-sm text-gray-500 mb-6">Tell us your time and location — we&apos;ll build a plan using your data.</p>

      {/* Step 1: Time */}
      <div className="mb-6">
        <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">How much time do you have?</label>
        <div className="flex flex-wrap gap-2">
          {[10, 20, 30, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => { setMinutes(m); setGeneratedPlan(null); }}
              className={`px-4 py-2 text-sm rounded-full ${
                minutes === m
                  ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Location */}
      <div className="mb-6">
        <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Where are you practicing?</label>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'range', label: 'Range' },
            { value: 'home_sim', label: 'Home Sim' },
            { value: 'putting_mat', label: 'Putting Mat' },
            { value: 'course', label: 'Course' },
          ] as const).map((loc) => (
            <button
              key={loc.value}
              onClick={() => { setLocation(loc.value); setGeneratedPlan(null); }}
              className={`px-4 py-2 text-sm rounded-full ${
                location === loc.value
                  ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      {minutes && location && !generatedPlan && (
        <button
          onClick={handleGenerate}
          className="px-4 py-3 text-sm bg-green-500 text-gray-50 rounded-2xl hover:bg-green-400 mb-6 active:scale-[0.98] transition-all"
        >
          Generate Plan
        </button>
      )}

      {/* Generated plan display */}
      {generatedPlan && (
        <div className="bg-gray-900 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-purple-400">{generatedPlan.title}</h2>
            <span className="text-xs text-gray-500">{generatedPlan.totalMinutes} min</span>
          </div>

          {generatedPlan.explanation && (
            <div className="bg-purple-500/10 rounded-2xl p-3">
              <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Why this plan:</p>
              <p className="text-sm text-gray-300">{generatedPlan.explanation}</p>
            </div>
          )}

          {generatedPlan.warmup && (
            <div className="bg-gray-800/50 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-yellow-400">{generatedPlan.warmup.name}</h4>
                <span className="text-xs text-gray-500">{generatedPlan.warmup.minutes} min</span>
              </div>
              <p className="text-xs text-gray-400">{generatedPlan.warmup.description}</p>
            </div>
          )}

          {generatedPlan.blocks.map((block, i) => (
            <div key={i} className="bg-gray-800/50 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-gray-50">{block.name}</h4>
                <span className="text-xs text-gray-500">{block.minutes} min</span>
              </div>
              <p className="text-xs text-gray-400">{block.description}</p>
              {block.clubs && (
                <p className="text-xs text-gray-500 mt-1">Clubs: {block.clubs.join(', ')}</p>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex-1 px-4 py-3 text-sm bg-green-500 text-gray-50 rounded-2xl hover:bg-green-400 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {starting ? 'Starting...' : 'Start This Plan'}
            </button>
            <button
              onClick={handleRegenerate}
              className="px-4 py-3 text-sm bg-gray-800 text-gray-400 rounded-2xl hover:bg-gray-700"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
