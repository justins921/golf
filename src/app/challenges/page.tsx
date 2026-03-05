'use client';

import { useState, useEffect } from 'react';
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

const challengeTypes = Object.keys(CHALLENGE_TYPE_LABELS) as ChallengeType[];

function ChallengesContent() {
  const { challenges, loading, addChallenge, deleteChallenge } = useChallenges();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const { entries, loading: entriesLoading, addEntry } = useChallengeEntries(selectedChallengeId);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('putting_drill');
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [unit, setUnit] = useState(CHALLENGE_TYPE_UNITS['putting_drill']);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(weekFromNowStr());
  const [createdShareLink, setCreatedShareLink] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Log entry state
  const [participantName, setParticipantName] = useState('');
  const [entryValue, setEntryValue] = useState<number | ''>('');
  const [entryDate, setEntryDate] = useState(todayStr());
  const [entryNotes, setEntryNotes] = useState('');
  const [loggingEntry, setLoggingEntry] = useState(false);

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<string | null>(null);

  // Load participant name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('challenge_participant_name');
    if (saved) setParticipantName(saved);
  }, []);

  // Auto-fill unit when type changes
  useEffect(() => {
    if (challengeType !== 'custom') {
      setUnit(CHALLENGE_TYPE_UNITS[challengeType]);
    }
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
      setCreatedShareLink(`${window.location.origin}/challenges/${data.share_token}`);
      setTitle('');
      setTargetValue('');
      setDescription('');
      setChallengeType('putting_drill');
      setUnit(CHALLENGE_TYPE_UNITS['putting_drill']);
      setStartDate(todayStr());
      setEndDate(weekFromNowStr());
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
  const sorted = [...challenges].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-50">Challenges</h1>
          <p className="text-gray-400 mt-1">Challenge a friend or set personal targets</p>
        </div>

        {/* New Challenge toggle */}
        <div className="mb-6">
          {!showForm && !createdShareLink && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + New Challenge
            </button>
          )}

          {/* Created share link display */}
          {createdShareLink && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-green-400 text-sm font-medium mb-2">Challenge created! Share this link:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdShareLink}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm"
                />
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdShareLink);
                    showToast('Link copied!');
                  }}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Copy
                </button>
              </div>
              <button
                onClick={() => setCreatedShareLink(null)}
                className="mt-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
              <h2 className="text-lg font-semibold text-gray-50">New Challenge</h2>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 30-Day Putting Challenge"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select
                    value={challengeType}
                    onChange={(e) => setChallengeType(e.target.value as ChallengeType)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm"
                  >
                    {challengeTypes.map((t) => (
                      <option key={t} value={t}>
                        {CHALLENGE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Target Value</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="100"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  readOnly={challengeType !== 'custom'}
                  className={`w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 text-sm ${
                    challengeType !== 'custom' ? 'opacity-60' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Rules, instructions, or notes..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !targetValue}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Challenge'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* My Challenges list */}
        <div>
          <h2 className="text-lg font-semibold text-gray-50 mb-4">My Challenges</h2>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : sorted.length === 0 ? (
            <p className="text-gray-500 text-sm">No challenges yet. Create one to get started.</p>
          ) : (
            <div className="space-y-3">
              {sorted.map((challenge) => {
                const isActive = challenge.end_date >= today;
                const isExpanded = selectedChallengeId === challenge.id;
                const entriesSum = isExpanded
                  ? entries.reduce((sum, e) => sum + e.value, 0)
                  : 0;
                const progress = isExpanded
                  ? Math.min(100, (entriesSum / challenge.target_value) * 100)
                  : 0;

                return (
                  <div
                    key={challenge.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg"
                  >
                    {/* Card header (clickable) */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() =>
                        setSelectedChallengeId(isExpanded ? null : challenge.id)
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-gray-50 font-medium text-sm truncate">
                              {challenge.title}
                            </h3>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                isActive
                                  ? 'bg-green-600/20 text-green-400'
                                  : 'bg-gray-700 text-gray-400'
                              }`}
                            >
                              {isActive ? 'Active' : 'Ended'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {CHALLENGE_TYPE_LABELS[challenge.challenge_type]} &middot;{' '}
                            {challenge.target_value} {challenge.unit}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {challenge.start_date} to {challenge.end_date}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(challenge.share_token);
                            }}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                          >
                            Share
                          </button>

                          {deleteConfirmId === challenge.id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(challenge.id);
                              }}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                            >
                              Are you sure?
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(challenge.id);
                              }}
                              className="px-2 py-1 bg-gray-700 hover:bg-red-600 text-gray-400 hover:text-white rounded text-xs transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar (shown when expanded) */}
                      {isExpanded && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>
                              {entriesSum} / {challenge.target_value} {challenge.unit} ({Math.round(progress)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded view */}
                    {isExpanded && (
                      <div className="border-t border-gray-700 p-4 space-y-4">
                        {/* Log entry form */}
                        <form onSubmit={handleLogEntry} className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-300">Log Entry</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Your Name</label>
                              <input
                                type="text"
                                required
                                value={participantName}
                                onChange={(e) => setParticipantName(e.target.value)}
                                placeholder="Name"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                Value ({challenge.unit})
                              </label>
                              <input
                                type="number"
                                required
                                step="any"
                                value={entryValue}
                                onChange={(e) =>
                                  setEntryValue(e.target.value === '' ? '' : Number(e.target.value))
                                }
                                placeholder="0"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 text-sm"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Date</label>
                              <input
                                type="date"
                                value={entryDate}
                                onChange={(e) => setEntryDate(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
                              <input
                                type="text"
                                value={entryNotes}
                                onChange={(e) => setEntryNotes(e.target.value)}
                                placeholder="Optional notes"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 text-sm"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={loggingEntry || !participantName.trim() || !entryValue}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {loggingEntry ? 'Logging...' : 'Log Entry'}
                          </button>
                        </form>

                        {/* Entries list */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Entries</h4>
                          {entriesLoading ? (
                            <p className="text-gray-500 text-xs">Loading entries...</p>
                          ) : entries.length === 0 ? (
                            <p className="text-gray-500 text-xs">No entries yet.</p>
                          ) : (
                            <div className="space-y-1">
                              {entries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-gray-900/50"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-400">{entry.entry_date}</span>
                                    <span className="text-gray-200 font-medium">
                                      {entry.participant_name}
                                    </span>
                                    <span className="text-green-400">
                                      {entry.value} {challenge.unit}
                                    </span>
                                  </div>
                                  {entry.notes && (
                                    <span className="text-gray-500 truncate max-w-[200px]">
                                      {entry.notes}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
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
