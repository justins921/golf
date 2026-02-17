'use client';

import { useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { usePracticeSessions } from '@/lib/practice/hooks';
import type { PracticeSession } from '@/lib/practice/types';

export default function PracticePage() {
  return (
    <AuthGuard>
      <Nav />
      <PracticeHome />
    </AuthGuard>
  );
}

function PracticeHome() {
  const { sessions, loading, deleteSession } = usePracticeSessions();

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>;
  }

  const recentSessions = sessions.slice(0, 5);
  const incomplete = sessions.find((s) => !s.completed_at);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Practice</h1>

      {/* Continue incomplete session */}
      {incomplete && (
        <Link
          href={`/practice/session/${incomplete.id}`}
          className="block mb-6 bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4 hover:bg-yellow-600/20 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-400 font-medium">Continue session</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {(incomplete.plan as { title?: string })?.title ?? incomplete.mode} &middot;{' '}
                {new Date(incomplete.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className="text-yellow-400 text-lg">&rarr;</span>
          </div>
        </Link>
      )}

      {/* 3 big actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <ActionCard
          href="/practice/programs"
          title="Start Program"
          description="Structured practice with progressive targets and scoring"
          color="green"
        />
        <ActionCard
          href="/practice/random"
          title="Random Practice"
          description="AI-generated plan based on your time and weak areas"
          color="purple"
        />
        <ActionCard
          href="/practice/timed"
          title="Drill By Time"
          description="Pick a category and time — get a focused workout"
          color="blue"
        />
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/practice/insights"
          className="px-4 py-2 text-sm bg-gray-800 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white"
        >
          Insights
        </Link>
        <Link
          href="/practice/settings"
          className="px-4 py-2 text-sm bg-gray-800 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white"
        >
          Scoring Settings
        </Link>
      </div>

      {/* Recent sessions */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Recent Sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-gray-600 text-sm">No practice sessions yet. Start one above!</p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <SessionRow key={s.id} session={s} onDelete={deleteSession} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  color,
}: {
  href: string;
  title: string;
  description: string;
  color: 'green' | 'purple' | 'blue';
}) {
  const colors = {
    green: 'border-green-600/40 hover:border-green-500 hover:bg-green-600/10',
    purple: 'border-purple-600/40 hover:border-purple-500 hover:bg-purple-600/10',
    blue: 'border-blue-600/40 hover:border-blue-500 hover:bg-blue-600/10',
  };
  const titleColors = {
    green: 'text-green-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
  };

  return (
    <Link
      href={href}
      className={`block bg-gray-900 border rounded-lg p-5 transition-colors ${colors[color]}`}
    >
      <h3 className={`font-semibold mb-1 ${titleColors[color]}`}>{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </Link>
  );
}

function SessionRow({ session, onDelete }: { session: PracticeSession; onDelete: (id: string) => Promise<unknown> }) {
  const plan = session.plan as { title?: string } | null;
  const title = plan?.title ?? session.mode;
  const date = new Date(session.created_at).toLocaleDateString();
  const isComplete = !!session.completed_at;

  return (
    <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <div>
          <Link
            href={`/practice/session/${session.id}`}
            className="text-sm text-white hover:text-green-400"
          >
            {title}
          </Link>
          <p className="text-xs text-gray-500">
            {date} &middot; {session.mode.replace('_', ' ')}
            {session.category ? ` &middot; ${session.category.replace('_', ' ')}` : ''}
          </p>
        </div>
      </div>
      <button
        onClick={() => { if (confirm('Delete this session?')) onDelete(session.id); }}
        className="text-xs text-gray-600 hover:text-red-400"
      >
        Delete
      </button>
    </div>
  );
}
