'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useSpeedSessions, useSpeedReadings, useAllSpeedReadings } from '@/lib/hooks';
import { SPEED_PROTOCOLS, SPEED_CLUBS } from '@/lib/types';
import type { SpeedReading } from '@/lib/types';

export default function SpeedPage() {
  return (
    <AuthGuard>
      <Nav />
      <SpeedTraining />
    </AuthGuard>
  );
}

function SpeedTraining() {
  const { sessions, loading, addSession, deleteSession } = useSpeedSessions();
  const { readings: allReadings } = useAllSpeedReadings();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [view, setView] = useState<'log' | 'progress'>('log');

  // New session form
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newProtocol, setNewProtocol] = useState('TheStack');
  const [newProgram, setNewProgram] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const createSession = async () => {
    const { data } = await addSession({
      session_date: newDate,
      protocol: newProtocol,
      program: newProgram || null,
      notes: newNotes || null,
    });
    if (data) {
      setSelectedSessionId(data.id);
      setShowNewSession(false);
      setNewProgram('');
      setNewNotes('');
    }
  };

  // Progress stats
  const progressData = useMemo(() => {
    const driverReadings = allReadings.filter(
      (r) => r.club === 'Driver' && r.clubhead_speed_mph != null
    );
    if (driverReadings.length === 0) return null;

    const byDate = new Map<string, number[]>();
    for (const r of driverReadings) {
      const date = r.session_date;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(r.clubhead_speed_mph!);
    }

    const entries = Array.from(byDate.entries())
      .map(([date, speeds]) => ({
        date,
        max: Math.max(...speeds),
        avg: speeds.reduce((a, b) => a + b, 0) / speeds.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const allMax = Math.max(...entries.map((e) => e.max));
    const latest = entries[entries.length - 1];
    const first = entries[0];
    const gain = latest && first ? latest.max - first.max : 0;

    return { entries, allMax, latestMax: latest?.max ?? 0, gain };
  }, [allReadings]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse bg-gray-900 rounded-2xl h-32" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-gray-50 tracking-tight">Speed Training</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('log')}
            className={`px-4 py-2 text-sm rounded-full ${view === 'log' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'}`}
          >
            Training Log
          </button>
          <button
            onClick={() => setView('progress')}
            className={`px-4 py-2 text-sm rounded-full ${view === 'progress' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'}`}
          >
            Progress
          </button>
        </div>
      </div>

      {view === 'progress' && (
        <ProgressView data={progressData} />
      )}

      {view === 'log' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session list */}
          <div className="space-y-3">
            <button
              onClick={() => setShowNewSession(true)}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-400 text-gray-50 text-sm rounded-xl active:scale-[0.98]"
            >
              + New Speed Session
            </button>

            {showNewSession && (
              <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-medium text-gray-50">New Session</h3>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Protocol</label>
                  <div className="flex flex-wrap gap-1">
                    {SPEED_PROTOCOLS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewProtocol(p)}
                        className={`px-3 py-1.5 text-xs rounded-full ${newProtocol === p ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30' : 'bg-gray-800 text-gray-400'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Program (optional)</label>
                  <input
                    type="text"
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="e.g., Speed 1, Distance"
                    className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Notes</label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={createSession} className="px-4 py-2 text-sm bg-green-500 hover:bg-green-400 text-gray-50 rounded-xl active:scale-[0.98]">
                    Create
                  </button>
                  <button onClick={() => setShowNewSession(false)} className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sessions.length === 0 && !showNewSession && (
              <div className="text-center text-gray-400 py-16 text-[15px]">
                No speed sessions yet. Create your first one above.
              </div>
            )}

            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-colors ${
                  selectedSessionId === s.id
                    ? 'bg-gray-900 ring-1 ring-green-500/30 text-gray-50'
                    : 'bg-gray-900 text-gray-400 hover:ring-1 hover:ring-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.session_date}</span>
                  <span className="text-xs text-gray-500">{s.protocol}</span>
                </div>
                {s.program && <div className="text-xs text-gray-500 mt-1">{s.program}</div>}
              </button>
            ))}
          </div>

          {/* Session detail / reading entry */}
          <div className="lg:col-span-2">
            {selectedSessionId ? (
              <SessionDetail
                sessionId={selectedSessionId}
                onDelete={async () => {
                  await deleteSession(selectedSessionId);
                  setSelectedSessionId(null);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400 text-[15px]">
                Select a session to view or add readings
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionDetail({ sessionId, onDelete }: { sessionId: string; onDelete: () => void }) {
  const { readings, loading, addReading, deleteReading } = useSpeedReadings(sessionId);
  const [club, setClub] = useState('Driver');
  const [speed, setSpeed] = useState('');
  const [ballSpeed, setBallSpeed] = useState('');
  const [setNum, setSetNum] = useState(1);
  const [repNum, setRepNum] = useState(1);

  const handleAdd = async () => {
    if (!speed) return;
    const chs = parseFloat(speed);
    const bs = ballSpeed ? parseFloat(ballSpeed) : null;
    await addReading({
      session_id: sessionId,
      set_number: setNum,
      rep_number: repNum,
      club,
      clubhead_speed_mph: chs,
      ball_speed_mph: bs,
      smash_factor: bs && chs ? Math.round((bs / chs) * 100) / 100 : null,
      carry_distance_yd: null,
      notes: null,
    });
    setSpeed('');
    setBallSpeed('');
    setRepNum(repNum + 1);
  };

  // Stats
  const driverReadings = readings.filter((r) => r.club === 'Driver' && r.clubhead_speed_mph != null);
  const maxSpeed = driverReadings.length > 0 ? Math.max(...driverReadings.map((r) => r.clubhead_speed_mph!)) : null;
  const avgSpeed = driverReadings.length > 0
    ? Math.round((driverReadings.reduce((a, r) => a + r.clubhead_speed_mph!, 0) / driverReadings.length) * 10) / 10
    : null;

  if (loading) return <div className="animate-pulse bg-gray-900 rounded-2xl h-32" />;

  return (
    <div className="space-y-4">
      {/* Session stats */}
      {maxSpeed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Max CHS</div>
            <div className="text-xl font-bold text-green-400">{maxSpeed.toFixed(1)} mph</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Avg CHS</div>
            <div className="text-xl font-bold text-gray-50">{avgSpeed} mph</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Swings</div>
            <div className="text-xl font-bold text-gray-50">{readings.length}</div>
          </div>
        </div>
      )}

      {/* Quick add */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <h3 className="text-sm font-medium text-gray-50 mb-3">Add Reading</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Club</label>
            <select
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
            >
              {SPEED_CLUBS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">CHS (mph)</label>
            <input
              type="number"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="115.2"
              className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Ball Speed</label>
            <input
              type="number"
              step="0.1"
              value={ballSpeed}
              onChange={(e) => setBallSpeed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="optional"
              className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>
          <div className="flex gap-2">
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Set</label>
              <input
                type="number"
                min={1}
                value={setNum}
                onChange={(e) => setSetNum(parseInt(e.target.value) || 1)}
                className="w-16 bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Rep</label>
              <input
                type="number"
                min={1}
                value={repNum}
                onChange={(e) => setRepNum(parseInt(e.target.value) || 1)}
                className="w-16 bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!speed}
            className="px-4 py-3 text-sm bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-50 rounded-xl active:scale-[0.98]"
          >
            Add
          </button>
        </div>
      </div>

      {/* Readings table */}
      {readings.length > 0 && (
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800/60 text-gray-500 text-[13px] uppercase">
                  <th className="p-2 text-left">Set</th>
                  <th className="p-2 text-left">Rep</th>
                  <th className="p-2 text-left">Club</th>
                  <th className="p-2 text-right">CHS (mph)</th>
                  <th className="p-2 text-right">Ball (mph)</th>
                  <th className="p-2 text-right">Smash</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {readings.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-800/50">
                    <td className="p-2 text-gray-400">{r.set_number}</td>
                    <td className="p-2 text-gray-400">{r.rep_number}</td>
                    <td className="p-2 text-gray-200 font-medium">{r.club}</td>
                    <td className="p-2 text-right text-green-400 font-medium">
                      {r.clubhead_speed_mph?.toFixed(1) ?? '—'}
                    </td>
                    <td className="p-2 text-right text-gray-300">
                      {r.ball_speed_mph?.toFixed(1) ?? '—'}
                    </td>
                    <td className="p-2 text-right text-gray-400">
                      {r.smash_factor?.toFixed(2) ?? '—'}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => deleteReading(r.id)}
                        className="text-gray-500 hover:text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onDelete} className="text-xs text-gray-500 hover:text-red-400">
          Delete Session
        </button>
      </div>
    </div>
  );
}

function ProgressView({ data }: { data: { entries: { date: string; max: number; avg: number }[]; allMax: number; latestMax: number; gain: number } | null }) {
  if (!data || data.entries.length === 0) {
    return (
      <div className="text-center text-gray-400 py-16 text-[15px]">
        No driver speed data yet. Log some speed sessions to see your progress.
      </div>
    );
  }

  const { entries, allMax, latestMax, gain } = data;
  const chartMin = Math.floor(Math.min(...entries.map((e) => e.avg)) - 2);
  const chartMax = Math.ceil(allMax + 2);
  const range = chartMax - chartMin;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">All-Time Max</div>
          <div className="text-2xl font-bold text-green-400">{allMax.toFixed(1)}</div>
          <div className="text-xs text-gray-500">mph</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Latest Max</div>
          <div className="text-2xl font-bold text-gray-50">{latestMax.toFixed(1)}</div>
          <div className="text-xs text-gray-500">mph</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Speed Gain</div>
          <div className={`text-2xl font-bold ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {gain >= 0 ? '+' : ''}{gain.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">mph since first</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Sessions</div>
          <div className="text-2xl font-bold text-gray-50">{entries.length}</div>
          <div className="text-xs text-gray-500">logged</div>
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <h3 className="text-sm font-medium text-gray-50 mb-4">Driver CHS Over Time</h3>
        <div className="flex items-end gap-1 h-48">
          {entries.map((e, i) => {
            const pctMax = ((e.max - chartMin) / range) * 100;
            const pctAvg = ((e.avg - chartMin) / range) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div className="w-full flex flex-col items-center" style={{ height: '100%' }}>
                  <div className="flex-1" />
                  <div
                    className="w-full bg-green-600/30 rounded-t relative"
                    style={{ height: `${pctMax}%`, minHeight: '4px' }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t"
                      style={{ height: `${(pctAvg / pctMax) * 100}%`, minHeight: '2px' }}
                    />
                  </div>
                </div>
                {/* Tooltip */}
                <div className="hidden group-hover:block absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-800 rounded-xl px-3 py-2 text-xs whitespace-nowrap z-10">
                  <div className="text-gray-50 font-medium">{e.date}</div>
                  <div className="text-green-400">Max: {e.max.toFixed(1)}</div>
                  <div className="text-gray-400">Avg: {e.avg.toFixed(1)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          <span>{entries[0]?.date}</span>
          <span>{entries[entries.length - 1]?.date}</span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500 rounded-full inline-block" /> Avg</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-600/30 rounded-full inline-block" /> Max</span>
        </div>
      </div>

      {/* History table */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/60 text-gray-500 text-[13px] uppercase">
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-right">Max CHS</th>
                <th className="p-2 text-right">Avg CHS</th>
                <th className="p-2 text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {[...entries].reverse().map((e, i, arr) => {
                const prev = arr[i + 1];
                const change = prev ? e.max - prev.max : 0;
                return (
                  <tr key={e.date}>
                    <td className="p-2 text-gray-300">{e.date}</td>
                    <td className="p-2 text-right text-green-400 font-medium">{e.max.toFixed(1)}</td>
                    <td className="p-2 text-right text-gray-300">{e.avg.toFixed(1)}</td>
                    <td className={`p-2 text-right ${change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                      {i < arr.length - 1 ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
