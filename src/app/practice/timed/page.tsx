'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { usePracticeSessions } from '@/lib/practice/hooks';
import { getDrillsByCategory, getDrillsForLocation, buildTimeDrillPlan } from '@/lib/practice/drills';
import type { DrillCategory, PracticeLocation, PracticeDrill, SessionPlan } from '@/lib/practice/types';

export default function TimedDrillPage() {
  return (
    <AuthGuard>
      <Nav />
      <DrillByTime />
    </AuthGuard>
  );
}

function DrillByTime() {
  const router = useRouter();
  const { createSession } = usePracticeSessions();

  const [category, setCategory] = useState<DrillCategory | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [location, setLocation] = useState<PracticeLocation>('range');
  const [selectedDrill, setSelectedDrill] = useState<PracticeDrill | null>(null);
  const [customClubs, setCustomClubs] = useState<string[]>([]);
  const [customClub, setCustomClub] = useState('');
  const [starting, setStarting] = useState(false);

  const availableDrills = category
    ? getDrillsByCategory(category).filter((d) => d.locations.includes(location))
    : [];

  const addClub = () => {
    if (customClub.trim() && !customClubs.includes(customClub.trim())) {
      setCustomClubs([...customClubs, customClub.trim()]);
      setCustomClub('');
    }
  };

  const handleStart = async () => {
    if (!selectedDrill || !minutes) return;
    setStarting(true);

    const plan = buildTimeDrillPlan(selectedDrill, minutes, customClubs.length > 0 ? customClubs : undefined);

    const sessionId = await createSession({
      mode: 'TIME_DRILL',
      category: category ?? 'random',
      drill_id: selectedDrill.id,
      location,
      plan,
    });

    if (sessionId) {
      router.push(`/practice/session/${sessionId}`);
    }
    setStarting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-2">Drill By Time</h1>
      <p className="text-sm text-gray-500 mb-6">Pick a focus and time -- get a workout that fits exactly.</p>

      {/* Location */}
      <div className="mb-6">
        <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Where?</label>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'range', label: 'Range' },
            { value: 'home_sim', label: 'Home Sim' },
            { value: 'putting_mat', label: 'Putting Mat' },
            { value: 'course', label: 'Course' },
          ] as const).map((loc) => (
            <button
              key={loc.value}
              onClick={() => { setLocation(loc.value); setSelectedDrill(null); }}
              className={`px-4 py-2 text-sm rounded-full ${
                location === loc.value
                  ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="mb-6">
        <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'wedges', label: 'Wedges' },
            { value: 'full_swing', label: 'Full Swing' },
            { value: 'putting', label: 'Putting' },
            { value: 'short_game', label: 'Short Game' },
            { value: 'random', label: 'Random' },
          ] as const).map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setSelectedDrill(null); }}
              className={`px-4 py-2 text-sm rounded-full ${
                category === cat.value
                  ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div className="mb-6">
        <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">How long?</label>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 20, 30, 45, 60].map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`px-4 py-2 text-sm rounded-full ${
                minutes === m
                  ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      {/* Drill selection */}
      {category && availableDrills.length > 0 && (
        <div className="mb-6">
          <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Pick a drill</label>
          <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800/60">
            {availableDrills.map((drill) => (
              <button
                key={drill.id}
                onClick={() => setSelectedDrill(drill)}
                className={`block w-full text-left px-4 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${
                  selectedDrill?.id === drill.id
                    ? 'bg-green-500/10'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <h4 className="text-sm font-medium text-gray-50">{drill.name}</h4>
                <p className="text-xs text-gray-400 mt-0.5">{drill.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {category && availableDrills.length === 0 && (
        <div className="py-16 text-center mb-6">
          <p className="text-[15px] text-gray-400">No drills available for this category and location combination.</p>
        </div>
      )}

      {/* Optional clubs */}
      {selectedDrill && (
        <div className="mb-6">
          <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Clubs (optional)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {customClubs.map((c) => (
              <div key={c} className="flex items-center gap-1 bg-gray-800 rounded-full px-3 py-1">
                <span className="text-sm text-gray-300">{c}</span>
                <button onClick={() => setCustomClubs(customClubs.filter((x) => x !== c))} className="text-xs text-gray-500 hover:text-red-400">&times;</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={customClub}
              onChange={(e) => setCustomClub(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addClub(); } }}
              placeholder="Add club..."
              className="bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 w-32 focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
            <button onClick={addClub} className="px-3 py-2 text-xs bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700">Add</button>
          </div>
        </div>
      )}

      {/* Start */}
      {selectedDrill && minutes && (
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full px-5 py-3 text-sm bg-green-500 text-gray-50 rounded-2xl hover:bg-green-400 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {starting ? 'Starting...' : `Start ${minutes}-Min ${selectedDrill.name}`}
        </button>
      )}
    </div>
  );
}
