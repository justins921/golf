'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useChallengeByToken } from '@/lib/hooks';
import { CHALLENGE_TYPE_LABELS, CHALLENGE_TYPE_UNITS } from '@/lib/types';
import type { ChallengeType } from '@/lib/types';

const CHALLENGE_ICONS: Record<string, string> = {
  putting_drill: '\u{1F3AF}',
  practice_sessions: '\u{1F4CB}',
  rounds_played: '\u26F3',
  scoring_target: '\u{1F3C6}',
  fairways_hit: '\u{1F333}',
  gir_target: '\u{1F7E2}',
  speed_target: '\u26A1',
  custom: '\u2B50',
};

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysRemaining(endDate: string) {
  const end = new Date(endDate + 'T23:59:59');
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function ProgressRing({ pct, size = 56, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (1 - Math.min(pct, 100) / 100);
  const color = pct >= 100 ? '#34d399' : pct >= 50 ? '#4ade80' : '#60a5fa';

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-gray-800" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={filled}
        strokeLinecap="round" className="transition-all duration-500"
      />
    </svg>
  );
}

const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

export default function SharedChallengePage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : null;
  const { challenge, entries, loading, addEntry } = useChallengeByToken(token);

  const [participantName, setParticipantName] = useState('');
  const [value, setValue] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEntrySheet, setShowEntrySheet] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('challenge_participant_name');
    if (saved) setParticipantName(saved);
  }, []);

  useEffect(() => {
    if (participantName) localStorage.setItem('challenge_participant_name', participantName);
  }, [participantName]);

  useEffect(() => {
    setEntryDate(new Date().toISOString().split('T')[0]);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const isExpired = challenge ? challenge.end_date < today : false;
  const isActive = challenge ? !isExpired : false;

  const leaderboard = useMemo(() => {
    if (!challenge) return [];
    const grouped: Record<string, number> = {};
    for (const entry of entries) {
      grouped[entry.participant_name] = (grouped[entry.participant_name] || 0) + entry.value;
    }
    return Object.entries(grouped)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [entries, challenge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName.trim() || !value || !entryDate) return;
    setSubmitting(true);
    await addEntry(participantName.trim(), parseFloat(value), entryDate, notes.trim() || undefined);
    setValue('');
    setNotes('');
    setSubmitting(false);
    setShowEntrySheet(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="max-w-lg mx-auto px-4 pt-12">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-900 rounded-2xl w-48 mx-auto" />
            <div className="h-6 bg-gray-900 rounded-xl w-32 mx-auto" />
            <div className="h-80 bg-gray-900 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-4xl mb-4">{'\u{1F6AB}'}</div>
          <h1 className="text-xl font-bold text-gray-50 mb-2">Challenge Not Found</h1>
          <p className="text-[15px] text-gray-400">This link may be invalid or the challenge was removed.</p>
        </div>
      </div>
    );
  }

  const typeLabel = CHALLENGE_TYPE_LABELS[challenge.challenge_type as ChallengeType] || challenge.challenge_type;
  const typeUnit = CHALLENGE_TYPE_UNITS[challenge.challenge_type as ChallengeType] || challenge.unit;
  const icon = CHALLENGE_ICONS[challenge.challenge_type] ?? '\u2B50';
  const days = daysRemaining(challenge.end_date);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-gray-900 rounded-full px-3 py-1.5 text-[13px] font-medium text-gray-400 mb-4">
            <span>{icon}</span> {typeLabel}
          </div>
          <h1 className="text-[28px] font-bold text-gray-50 tracking-tight">{challenge.title}</h1>
          {challenge.description && (
            <p className="text-[15px] text-gray-400 mt-2 max-w-sm mx-auto">{challenge.description}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-3 text-[13px] text-gray-500">
            <span>{formatDateShort(challenge.start_date)} - {formatDateShort(challenge.end_date)}</span>
            {isActive ? (
              <span className="bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">{days}d left</span>
            ) : (
              <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-medium">Ended</span>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl py-10 text-center">
              <div className="text-3xl mb-2">{'\u{1F3C3}'}</div>
              <p className="text-[15px] text-gray-400">No entries yet</p>
              <p className="text-[13px] text-gray-500 mt-1">Be the first to log progress!</p>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl overflow-hidden divide-y divide-gray-800/60">
              {leaderboard.map((participant, idx) => {
                const pct = Math.min((participant.total / challenge.target_value) * 100, 100);
                const completed = participant.total >= challenge.target_value;
                return (
                  <div key={participant.name} className="flex items-center gap-3.5 px-4 py-3.5">
                    <div className={`text-[15px] font-bold w-6 text-center ${RANK_COLORS[idx] ?? 'text-gray-500'}`}>
                      {idx + 1}
                    </div>
                    <div className="relative shrink-0">
                      <ProgressRing pct={pct} size={44} stroke={3.5} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-gray-300">{Math.round(pct)}%</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-gray-50 truncate">{participant.name}</span>
                        {completed && (
                          <span className="text-[11px] font-bold text-green-400 bg-green-500/15 px-1.5 py-0.5 rounded-full">DONE</span>
                        )}
                      </div>
                      <div className="text-[13px] text-gray-400">
                        {participant.total} / {challenge.target_value} {typeUnit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Log Entry button */}
        {isActive && (
          <button
            onClick={() => setShowEntrySheet(true)}
            className="w-full mb-6 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-400 text-white rounded-2xl text-[15px] font-semibold transition-colors active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Log Entry
          </button>
        )}

        {/* Entry Log */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Entry Log</h2>
          {entries.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-6">No entries logged yet.</p>
          ) : (
            <div className="bg-gray-900 rounded-2xl overflow-hidden divide-y divide-gray-800/60">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium text-gray-200">{entry.participant_name}</span>
                      <span className="text-[13px] text-gray-500">{formatDateShort(entry.entry_date)}</span>
                    </div>
                    {entry.notes && <p className="text-[13px] text-gray-500 truncate mt-0.5">{entry.notes}</p>}
                  </div>
                  <span className="text-[15px] font-semibold text-green-400 tabular-nums ml-3">
                    +{entry.value} {typeUnit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Entry Sheet */}
      {showEntrySheet && (
        <div className="fixed inset-0 z-50" onClick={() => setShowEntrySheet(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-900 pt-3 pb-1 flex justify-center z-10">
              <div className="w-9 h-1 rounded-full bg-gray-700" />
            </div>

            <div className="flex items-center justify-between px-5 py-2">
              <button onClick={() => setShowEntrySheet(false)} className="text-[17px] text-green-400 font-medium">
                Cancel
              </button>
              <span className="text-[17px] font-semibold text-gray-50">Log Entry</span>
              <button
                onClick={handleSubmit as unknown as () => void}
                disabled={submitting || !participantName.trim() || !value}
                className="text-[17px] text-green-400 font-semibold disabled:text-gray-600"
              >
                {submitting ? 'Saving' : 'Save'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-10 pt-4 space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block px-1">Your Name</label>
                <input
                  type="text" required value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3.5 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block px-1">Value</label>
                  <input
                    type="number" required step="any" value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0"
                    className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3.5 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block px-1">Date</label>
                  <input
                    type="date" required value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3.5 text-[15px] text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block px-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2} placeholder="Optional notes..."
                  className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/40 resize-none"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
