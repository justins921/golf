'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useChallengeByToken } from '@/lib/hooks';
import { CHALLENGE_TYPE_LABELS, CHALLENGE_TYPE_UNITS } from '@/lib/types';
import type { ChallengeType } from '@/lib/types';

export default function SharedChallengePage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : null;
  const { challenge, entries, loading, addEntry, refetch } = useChallengeByToken(token);

  const [participantName, setParticipantName] = useState('');
  const [value, setValue] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Persist participant name in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('challenge_participant_name');
    if (saved) setParticipantName(saved);
  }, []);

  useEffect(() => {
    if (participantName) {
      localStorage.setItem('challenge_participant_name', participantName);
    }
  }, [participantName]);

  // Default entry date to today
  useEffect(() => {
    setEntryDate(new Date().toISOString().split('T')[0]);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const isExpired = challenge ? challenge.end_date < today : false;
  const isActive = challenge ? !isExpired : false;

  // Group entries by participant
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
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-800 rounded w-32" />
          <div className="h-8 bg-gray-800 rounded w-64" />
          <div className="h-4 bg-gray-800 rounded w-48" />
          <div className="h-40 bg-gray-800 rounded" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  // Not found state
  if (!challenge) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-50 mb-2">Challenge Not Found</h1>
        <p className="text-sm text-gray-400">This challenge link may be invalid or the challenge has been removed.</p>
      </div>
    );
  }

  const typeLabel = CHALLENGE_TYPE_LABELS[challenge.challenge_type as ChallengeType] || challenge.challenge_type;
  const typeUnit = CHALLENGE_TYPE_UNITS[challenge.challenge_type as ChallengeType] || challenge.unit;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Challenge Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Shared Challenge</p>
        <h1 className="text-2xl font-bold text-gray-50">{challenge.title}</h1>
        {challenge.description && (
          <p className="text-sm text-gray-300">{challenge.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
          <span className="bg-gray-700 px-2 py-0.5 rounded text-gray-300">{typeLabel}</span>
          <span>Target: {challenge.target_value} {typeUnit}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
          <span>{challenge.start_date} to {challenge.end_date}</span>
          {isActive ? (
            <span className="bg-green-600 text-gray-50 text-xs font-medium px-2 py-0.5 rounded">Active</span>
          ) : (
            <span className="bg-gray-600 text-gray-300 text-xs font-medium px-2 py-0.5 rounded">Ended</span>
          )}
        </div>
      </div>

      {/* Leaderboard / Progress */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-50">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-gray-400">No entries yet. Be the first to log progress!</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((participant, idx) => {
              const pct = Math.min((participant.total / challenge.target_value) * 100, 100);
              const completed = participant.total >= challenge.target_value;
              return (
                <div key={participant.name} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-400">#{idx + 1}</span>
                      <span className="text-sm font-semibold text-gray-50">{participant.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">
                        {participant.total} / {challenge.target_value} {typeUnit}
                      </span>
                      {completed && (
                        <span className="bg-green-600 text-gray-50 text-xs font-medium px-2 py-0.5 rounded">
                          Completed!
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-3 bg-green-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Entry Log */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-50">Entry Log</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">No entries logged yet.</p>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700">
            {entries.map((entry) => (
              <div key={entry.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-50">{entry.participant_name}</span>
                    <span className="text-xs text-gray-500">{entry.entry_date}</span>
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.notes}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-green-400 whitespace-nowrap">
                  +{entry.value} {typeUnit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Entry Form — only if challenge is active */}
      {isActive && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-50">Log Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Name</label>
              <input
                type="text"
                required
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Value</label>
              <input
                type="number"
                required
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about this entry..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-gray-50 font-medium text-sm rounded-lg px-4 py-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Logging...' : 'Log Entry'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
