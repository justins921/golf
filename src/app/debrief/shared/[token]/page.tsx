'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useDebriefByToken } from '@/lib/hooks';
import { generateDebrief, type RoundDebrief } from '@/lib/debrief';

export default function SharedDebriefPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : null;
  const { share, round, holes, coachNotes, loading, addCoachNote } = useDebriefByToken(token);
  const [debrief, setDebrief] = useState<RoundDebrief | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (round && holes.length > 0) {
      const d = generateDebrief(round, holes, [], null);
      setDebrief(d);
    }
  }, [round, holes]);

  const handleSubmitNote = async () => {
    if (!authorName.trim() || !noteText.trim()) return;
    setSubmitting(true);
    await addCoachNote(authorName.trim(), noteText.trim());
    setNoteText('');
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-48" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (!share || !round) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-3xl mb-3">🔗</div>
        <h1 className="text-xl font-bold text-gray-50 mb-2">Debrief Not Found</h1>
        <p className="text-sm text-gray-400">This share link may have expired or been removed.</p>
      </div>
    );
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-3xl mb-3">⏰</div>
        <h1 className="text-xl font-bold text-gray-50 mb-2">Link Expired</h1>
        <p className="text-sm text-gray-400">This share link has expired. Ask the golfer to create a new one.</p>
      </div>
    );
  }

  const score = round.total_score ?? 0;
  const analysis = debrief?.analysis;
  const par = analysis ? analysis.holes.reduce((s, h) => s + h.par, 0) || 72 : 72;
  const toPar = score - par;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Shared Debrief</div>
        <h1 className="text-xl font-bold text-gray-50">{round.course_name}</h1>
        <p className="text-sm text-gray-400">{round.round_date} &middot; {round.holes_played} holes</p>
      </div>

      {/* Score */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 text-center">
        <div className="text-3xl font-bold text-gray-50 mb-1">
          {score} <span className={`text-lg ${toPar <= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ({toPar >= 0 ? '+' : ''}{toPar})
          </span>
        </div>
        {debrief && <p className="text-sm text-gray-400">{debrief.overallVerdict}</p>}
      </div>

      {/* SG breakdown */}
      {analysis && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-50">Strokes Gained</h3>
          {[
            { label: 'Off the Tee', val: analysis.sgOtt },
            { label: 'Approach', val: analysis.sgApproach },
            { label: 'Short Game', val: analysis.sgShortGame },
            { label: 'Putting', val: analysis.sgPutting },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-400">{label}</span>
              <span className={val >= 0 ? 'text-green-400' : 'text-red-400'}>
                {val >= 0 ? '+' : ''}{val.toFixed(1)}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-medium">
            <span className="text-gray-300">Total</span>
            <span className={analysis.totalSG >= 0 ? 'text-green-400' : 'text-red-400'}>
              {analysis.totalSG >= 0 ? '+' : ''}{analysis.totalSG.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* Key stats */}
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Putts', value: String(analysis.totalPutts) },
            { label: 'GIR', value: `${analysis.girPct}%` },
            { label: 'Fairways', value: `${analysis.firPct}%` },
            { label: 'Penalties', value: String(analysis.totalPenalties) },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">{stat.label}</div>
              <div className="text-lg font-bold text-gray-50">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {debrief && debrief.insights.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-50">Insights</h3>
          {debrief.insights.map((ins, i) => (
            <div key={i} className={`bg-gray-800 border rounded-lg p-3 ${
              ins.category === 'positive' ? 'border-green-500/30' : ins.category === 'negative' ? 'border-red-500/30' : 'border-gray-700'
            }`}>
              <div className="text-sm font-medium text-gray-50">{ins.title}</div>
              <p className="text-xs text-gray-400">{ins.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Coach Notes */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-50">Coach Notes</h3>

        {coachNotes.length > 0 && (
          <div className="space-y-3">
            {coachNotes.map(note => (
              <div key={note.id} className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-green-400">{note.author_name}</span>
                  <span className="text-[10px] text-gray-600">{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-300">{note.note_text}</p>
              </div>
            ))}
          </div>
        )}

        {share.can_add_notes && (
          <div className="space-y-2 border-t border-gray-700 pt-3">
            <input
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-500/40"
            />
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note for the golfer..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-green-500/40"
            />
            <button onClick={handleSubmitNote} disabled={submitting || !authorName.trim() || !noteText.trim()}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition-colors">
              {submitting ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
