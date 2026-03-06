'use client';

import { useState, useEffect, useMemo } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Nav from '@/components/Nav';
import { useChallenges, useChallengeEntries } from '@/lib/hooks';
import type { ChallengeType } from '@/lib/types';
import { CHALLENGE_TYPE_LABELS, CHALLENGE_TYPE_UNITS } from '@/lib/types';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function weekFromNowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

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

const challengeTypes = Object.keys(CHALLENGE_TYPE_LABELS) as ChallengeType[];

const CHALLENGE_ICONS: Record<ChallengeType, string> = {
  putting_drill: '\u{1F3AF}',
  practice_sessions: '\u{1F4CB}',
  rounds_played: '\u26F3',
  scoring_target: '\u{1F3C6}',
  fairways_hit: '\u{1F333}',
  gir_target: '\u{1F7E2}',
  speed_target: '\u26A1',
  custom: '\u2B50',
};

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

function ChallengesContent() {
  const { challenges, loading, addChallenge, deleteChallenge } = useChallenges();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const { entries, loading: entriesLoading, addEntry } = useChallengeEntries(selectedChallengeId);

  const [showSheet, setShowSheet] = useState(false);
  const [title, setTitle] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('putting_drill');
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [unit, setUnit] = useState(CHALLENGE_TYPE_UNITS['putting_drill']);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(weekFromNowStr());
  const [submitting, setSubmitting] = useState(false);

  const [participantName, setParticipantName] = useState('');
  const [entryValue, setEntryValue] = useState<number | ''>('');
  const [entryDate, setEntryDate] = useState(todayStr());
  const [entryNotes, setEntryNotes] = useState('');
  const [loggingEntry, setLoggingEntry] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('challenge_participant_name');
    if (saved) setParticipantName(saved);
  }, []);

  useEffect(() => {
    if (challengeType !== 'custom') setUnit(CHALLENGE_TYPE_UNITS[challengeType]);
  }, [challengeType]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function handleCopyLink(shareToken: string) {
    const link = `${window.location.origin}/challenges/${shareToken}`;
    await navigator.clipboard.writeText(link);
    showToast('Link copied!');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !targetValue) return;
    setSubmitting(true);
    const { data, error } = await addChallenge({
      title: title.trim(),
      challenge_type: challengeType,
      target_value: Number(targetValue),
      unit,
      description: description.trim() || null,
      start_date: startDate,
      end_date: endDate,
    });
    setSubmitting(false);
    if (!error && data) {
      setCreatedToken(data.share_token);
      setTitle('');
      setTargetValue('');
      setDescription('');
      setChallengeType('putting_drill');
      setUnit(CHALLENGE_TYPE_UNITS['putting_drill']);
      setStartDate(todayStr());
      setEndDate(weekFromNowStr());
      setShowSheet(false);
    }
  }

  async function handleLogEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChallengeId || !participantName.trim() || !entryValue) return;
    setLoggingEntry(true);
    localStorage.setItem('challenge_participant_name', participantName.trim());
    await addEntry({
      challenge_id: selectedChallengeId,
      participant_name: participantName.trim(),
      value: Number(entryValue),
      entry_date: entryDate,
      notes: entryNotes.trim() || null,
    });
    setLoggingEntry(false);
    setEntryValue('');
    setEntryNotes('');
    setEntryDate(todayStr());
  }

  async function handleDelete(id: string) {
    await deleteChallenge(id);
    setDeleteConfirmId(null);
    if (selectedChallengeId === id) setSelectedChallengeId(null);
  }

  const today = todayStr();
  const active = challenges.filter(c => c.end_date >= today);
  const ended = challenges.filter(c => c.end_date < today);

  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId) ?? null;
  const entriesTotal = useMemo(() => entries.reduce((s, e) => s + e.value, 0), [entries]);

  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-800/90 backdrop-blur-lg text-gray-50 px-5 py-2.5 rounded-full shadow-2xl text-sm font-medium border border-gray-700/50">
          {toast}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-gray-50 tracking-tight">Challenges</h1>
          <p className="text-[15px] text-gray-400 mt-0.5">Compete with friends or push yourself</p>
        </div>

        {/* Created share link banner */}
        {createdToken && (
          <div className="mb-5 bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
            <p className="text-sm font-semibold text-green-400 mb-2">Challenge created!</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-900/80 rounded-xl px-3 py-2.5 text-sm text-gray-300 truncate font-mono">
                {window.location.origin}/challenges/{createdToken}
              </div>
              <button
                onClick={() => { handleCopyLink(createdToken); }}
                className="px-4 py-2.5 bg-green-500 hover:bg-green-400 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Copy
              </button>
            </div>
            <button onClick={() => setCreatedToken(null)} className="text-xs text-gray-500 mt-2 hover:text-gray-300 transition-colors">
              Dismiss
            </button>
          </div>
        )}

        {/* New Challenge button */}
        <button
          onClick={() => setShowSheet(true)}
          className="w-full mb-6 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-400 text-white rounded-2xl text-[15px] font-semibold transition-colors active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Challenge
        </button>

        {/* Challenge Lists */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse bg-gray-900 rounded-2xl h-24" />
            ))}
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-1">Active</h2>
                <div className="bg-gray-900 rounded-2xl overflow-hidden divide-y divide-gray-800/60">
                  {active.map(challenge => {
                    const icon = CHALLENGE_ICONS[challenge.challenge_type] ?? '\u2B50';
                    const days = daysRemaining(challenge.end_date);
                    return (
                      <div
                        key={challenge.id}
                        onClick={() => setSelectedChallengeId(selectedChallengeId === challenge.id ? null : challenge.id)}
                        className="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer active:bg-gray-800/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-lg shrink-0">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold text-gray-50 truncate">{challenge.title}</div>
                          <div className="text-[13px] text-gray-400">
                            {challenge.target_value} {challenge.unit} &middot; {days}d left
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(challenge.share_token); }}
                            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.022a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.69 8.56" />
                            </svg>
                          </button>
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {ended.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-1">Ended</h2>
                <div className="bg-gray-900 rounded-2xl overflow-hidden divide-y divide-gray-800/60">
                  {ended.map(challenge => {
                    const icon = CHALLENGE_ICONS[challenge.challenge_type] ?? '\u2B50';
                    return (
                      <div
                        key={challenge.id}
                        onClick={() => setSelectedChallengeId(selectedChallengeId === challenge.id ? null : challenge.id)}
                        className="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer active:bg-gray-800/50 transition-colors opacity-60"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-lg shrink-0">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold text-gray-50 truncate">{challenge.title}</div>
                          <div className="text-[13px] text-gray-400">
                            {challenge.target_value} {challenge.unit} &middot; ended {formatDateShort(challenge.end_date)}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {challenges.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">{'\u{1F3AF}'}</div>
                <p className="text-gray-400 text-[15px]">No challenges yet</p>
                <p className="text-gray-500 text-[13px] mt-1">Create one and share it with a friend</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Sheet */}
      {selectedChallengeId && selectedChallenge && (
        <div className="fixed inset-0 z-40" onClick={() => setSelectedChallengeId(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-gray-900 rounded-t-3xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-900 pt-3 pb-2 flex justify-center z-10">
              <div className="w-9 h-1 rounded-full bg-gray-700" />
            </div>

            <div className="px-5 pb-8 space-y-5">
              <div className="text-center pt-2">
                <div className="text-3xl mb-2">{CHALLENGE_ICONS[selectedChallenge.challenge_type] ?? '\u2B50'}</div>
                <h2 className="text-xl font-bold text-gray-50">{selectedChallenge.title}</h2>
                {selectedChallenge.description && (
                  <p className="text-sm text-gray-400 mt-1">{selectedChallenge.description}</p>
                )}
                <div className="text-[13px] text-gray-500 mt-2">
                  {formatDateShort(selectedChallenge.start_date)} - {formatDateShort(selectedChallenge.end_date)}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <ProgressRing pct={selectedChallenge.target_value > 0 ? (entriesTotal / selectedChallenge.target_value) * 100 : 0} size={80} stroke={6} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-50">
                      {Math.round(Math.min(100, selectedChallenge.target_value > 0 ? (entriesTotal / selectedChallenge.target_value) * 100 : 0))}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  {entriesTotal} / {selectedChallenge.target_value} {selectedChallenge.unit}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(selectedChallenge.share_token)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.022a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.69 8.56" />
                  </svg>
                  Share Link
                </button>
                {deleteConfirmId === selectedChallenge.id ? (
                  <button
                    onClick={() => handleDelete(selectedChallenge.id)}
                    className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-sm font-medium text-red-400 transition-colors"
                  >
                    Confirm Delete
                  </button>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(selectedChallenge.id)}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-500 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>

              {selectedChallenge.end_date >= today && (
                <div className="bg-gray-800/50 rounded-2xl p-4">
                  <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Log Entry</h3>
                  <form onSubmit={handleLogEntry} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text" required value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                        placeholder="Your name"
                        className="col-span-2 bg-gray-900/60 rounded-xl px-4 py-3 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                      <input
                        type="number" required step="any" value={entryValue}
                        onChange={(e) => setEntryValue(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={`Value (${selectedChallenge.unit})`}
                        className="bg-gray-900/60 rounded-xl px-4 py-3 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                      <input
                        type="date" value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="bg-gray-900/60 rounded-xl px-4 py-3 text-[15px] text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>
                    <input
                      type="text" value={entryNotes}
                      onChange={(e) => setEntryNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="w-full bg-gray-900/60 rounded-xl px-4 py-3 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    />
                    <button
                      type="submit"
                      disabled={loggingEntry || !participantName.trim() || !entryValue}
                      className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white rounded-xl text-[15px] font-semibold transition-colors active:scale-[0.98]"
                    >
                      {loggingEntry ? 'Logging...' : 'Log Entry'}
                    </button>
                  </form>
                </div>
              )}

              <div>
                <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">Recent Entries</h3>
                {entriesLoading ? (
                  <div className="animate-pulse bg-gray-800 rounded-2xl h-20" />
                ) : entries.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-[13px]">No entries yet</p>
                ) : (
                  <div className="bg-gray-800/50 rounded-2xl overflow-hidden divide-y divide-gray-800">
                    {entries.slice(0, 20).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-gray-200">{entry.participant_name}</span>
                            <span className="text-[13px] text-gray-500">{formatDateShort(entry.entry_date)}</span>
                          </div>
                          {entry.notes && <p className="text-[13px] text-gray-500 truncate mt-0.5">{entry.notes}</p>}
                        </div>
                        <span className="text-[15px] font-semibold text-green-400 tabular-nums ml-3">
                          +{entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-gray-900 rounded-t-3xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-900 pt-3 pb-1 flex justify-center z-10">
              <div className="w-9 h-1 rounded-full bg-gray-700" />
            </div>

            <div className="flex items-center justify-between px-5 py-2">
              <button onClick={() => setShowSheet(false)} className="text-[17px] text-green-400 font-medium">
                Cancel
              </button>
              <span className="text-[17px] font-semibold text-gray-50">New Challenge</span>
              <button
                onClick={handleSubmit as unknown as () => void}
                disabled={submitting || !title.trim() || !targetValue}
                className="text-[17px] text-green-400 font-semibold disabled:text-gray-600"
              >
                {submitting ? 'Saving' : 'Create'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-10 pt-4 space-y-5">
              <div>
                <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block px-1">Type</label>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                  {challengeTypes.map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setChallengeType(t)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                        challengeType === t
                          ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      <span>{CHALLENGE_ICONS[t]}</span>
                      {CHALLENGE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block px-1">Title</label>
                <input
                  type="text" required value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 30-Day Putting Challenge"
                  className="w-full bg-gray-800/60 rounded-xl px-4 py-3.5 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block px-1">Target</label>
                  <input
                    type="number" required min={0} step="any" value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="100"
                    className="w-full bg-gray-800/60 rounded-xl px-4 py-3.5 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block px-1">Unit</label>
                  <input
                    type="text" value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    readOnly={challengeType !== 'custom'}
                    className={`w-full bg-gray-800/60 rounded-xl px-4 py-3.5 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${challengeType !== 'custom' ? 'opacity-50' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block px-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2} placeholder="Rules, instructions, or details..."
                  className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block px-1">Start</label>
                  <input
                    type="date" value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-800/60 rounded-xl px-4 py-3.5 text-[15px] text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block px-1">End</label>
                  <input
                    type="date" value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-800/60 rounded-xl px-4 py-3.5 text-[15px] text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <AuthGuard>
      <ChallengesContent />
    </AuthGuard>
  );
}
