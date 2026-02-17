'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { usePracticeSessions } from '@/lib/practice/hooks';
import { PROGRAMS, buildWedgeLadderPlan } from '@/lib/practice/drills';
import type { PracticeLocation } from '@/lib/practice/types';

export default function ProgramsPage() {
  return (
    <AuthGuard>
      <Nav />
      <ProgramsList />
    </AuthGuard>
  );
}

function ProgramsList() {
  const [configuring, setConfiguring] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Programs</h1>
      <p className="text-sm text-gray-500 mb-6">Structured practice with progressive targets and scoring.</p>

      <div className="space-y-4">
        {PROGRAMS.map((p) => (
          <div key={p.id} className="bg-gray-900 border border-gray-700 rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-medium">{p.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{p.category.replace('_', ' ')}</p>
                <p className="text-sm text-gray-400 mt-2">{p.description}</p>
              </div>
              <button
                onClick={() => setConfiguring(configuring === p.id ? null : p.id)}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md shrink-0"
              >
                Start
              </button>
            </div>

            {configuring === p.id && (
              <ProgramConfig programId={p.id} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgramConfig({ programId }: { programId: string }) {
  const router = useRouter();
  const { createSession } = usePracticeSessions();

  // Wedge Ladder config
  const [clubs, setClubs] = useState(['PW', 'GW', 'SW']);
  const [customClub, setCustomClub] = useState('');
  const [targets, setTargets] = useState([30, 40, 50, 60, 70, 80, 90]);
  const [customTarget, setCustomTarget] = useState('');
  const [shotsPerTarget, setShotsPerTarget] = useState(3);
  const [location, setLocation] = useState<PracticeLocation>('range');
  const [starting, setStarting] = useState(false);

  const addClub = () => {
    if (customClub.trim() && !clubs.includes(customClub.trim())) {
      setClubs([...clubs, customClub.trim()]);
      setCustomClub('');
    }
  };

  const addTarget = () => {
    const t = parseInt(customTarget);
    if (!isNaN(t) && !targets.includes(t)) {
      setTargets([...targets, t].sort((a, b) => a - b));
      setCustomTarget('');
    }
  };

  const handleStart = async () => {
    setStarting(true);

    let plan;
    if (programId === 'prog-wedge-ladder' || programId === 'prog-scoring') {
      plan = buildWedgeLadderPlan(clubs, targets, shotsPerTarget);
    } else {
      plan = buildWedgeLadderPlan(clubs, targets, shotsPerTarget);
    }

    const sessionId = await createSession({
      mode: 'PROGRAM',
      program_id: programId,
      category: 'wedges',
      location,
      plan,
    });

    if (sessionId) {
      router.push(`/practice/session/${sessionId}`);
    }
    setStarting(false);
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
      {/* Location */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Where are you practicing?</label>
        <div className="flex flex-wrap gap-2">
          {(['range', 'home_sim'] as const).map((loc) => (
            <button
              key={loc}
              onClick={() => setLocation(loc)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                location === loc
                  ? 'border-green-500 bg-green-600/20 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-400'
              }`}
            >
              {loc === 'home_sim' ? 'Home Sim' : 'Range'}
            </button>
          ))}
        </div>
      </div>

      {/* Clubs */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Wedge Clubs</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {clubs.map((c) => (
            <div key={c} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1">
              <span className="text-sm text-gray-300">{c}</span>
              <button onClick={() => setClubs(clubs.filter((x) => x !== c))} className="text-xs text-gray-500 hover:text-red-400">&times;</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={customClub}
            onChange={(e) => setCustomClub(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addClub(); } }}
            placeholder="Add club..."
            className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 w-32"
          />
          <button onClick={addClub} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">Add</button>
        </div>
      </div>

      {/* Targets */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Target Distances (yds)</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {targets.map((t) => (
            <div key={t} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-md px-2 py-1">
              <span className="text-sm text-gray-300">{t}</span>
              <button onClick={() => setTargets(targets.filter((x) => x !== t))} className="text-xs text-gray-500 hover:text-red-400">&times;</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTarget(); } }}
            placeholder="Add target..."
            className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 w-32"
          />
          <button onClick={addTarget} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">Add</button>
        </div>
      </div>

      {/* Shots per target */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Shots per target</label>
        <input
          type="number"
          min={1}
          max={10}
          value={shotsPerTarget}
          onChange={(e) => setShotsPerTarget(parseInt(e.target.value) || 3)}
          className="w-20 px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white"
        />
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-500">
        {clubs.length} club{clubs.length !== 1 ? 's' : ''} &times; {targets.length} target{targets.length !== 1 ? 's' : ''} &times; {shotsPerTarget} shot{shotsPerTarget !== 1 ? 's' : ''} = {clubs.length * targets.length * shotsPerTarget} total shots
      </p>

      <button
        onClick={handleStart}
        disabled={starting || clubs.length === 0 || targets.length === 0}
        className="px-5 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {starting ? 'Starting...' : 'Start Session'}
      </button>
    </div>
  );
}
