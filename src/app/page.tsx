'use client';

import Link from 'next/link';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';

const modules = [
  {
    group: 'Train',
    items: [
      {
        href: '/speed',
        title: 'Speed Training',
        desc: 'Log TheStack, SuperSpeed, or any protocol. Track clubhead speed over time and see your gains.',
        color: 'bg-orange-500/10 border-orange-500/20',
        accent: 'text-orange-400',
        badge: null,
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        href: '/fitness',
        title: 'Golf Fitness',
        desc: 'Workout logging with 70+ golf-specific exercises. Track streaks, time, and workout types.',
        color: 'bg-red-500/10 border-red-500/20',
        accent: 'text-red-400',
        badge: null,
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ),
      },
      {
        href: '/practice',
        title: 'Practice',
        desc: 'Structured programs, random drills, and timed sessions scored with strokes-gained.',
        color: 'bg-purple-500/10 border-purple-500/20',
        accent: 'text-purple-400',
        badge: null,
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Track',
    items: [
      {
        href: '/rounds',
        title: 'Rounds',
        desc: 'Hole-by-hole scorecards with FIR, GIR, putts, and penalties. See scoring trends over time.',
        color: 'bg-green-500/10 border-green-500/20',
        accent: 'text-green-400',
        badge: null,
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
        ),
      },
      {
        href: '/shots',
        title: 'Shot Data',
        desc: 'Import Garmin R50 CSVs. View sessions, shot patterns, and club-by-club breakdown.',
        color: 'bg-blue-500/10 border-blue-500/20',
        accent: 'text-blue-400',
        badge: 'Launch Monitor',
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        ),
      },
      {
        href: '/compare',
        title: 'Compare',
        desc: 'Overlay sessions with dispersion ellipses. Spot changes in carry and lateral patterns.',
        color: 'bg-cyan-500/10 border-cyan-500/20',
        accent: 'text-cyan-400',
        badge: 'Launch Monitor',
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Tools',
    items: [
      {
        href: '/wedges',
        title: 'Wedge Lab',
        desc: 'Build your wedge matrix, calibrate with range sessions, and practice random targets.',
        color: 'bg-yellow-500/10 border-yellow-500/20',
        accent: 'text-yellow-400',
        badge: null,
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        ),
      },
      {
        href: '/putters',
        title: 'Putter Lab',
        desc: 'Compare putters head-to-head with standardized drills and make-rate tracking.',
        color: 'bg-pink-500/10 border-pink-500/20',
        accent: 'text-pink-400',
        badge: null,
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        ),
      },
      {
        href: '/yardage',
        title: 'Yardage Card',
        desc: 'Data-driven club distances with percentile ranges. Adjust for elevation, temp, and humidity.',
        color: 'bg-emerald-500/10 border-emerald-500/20',
        accent: 'text-emerald-400',
        badge: 'Launch Monitor',
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        href: '/calculator',
        title: 'Calculator',
        desc: 'Plays-like distance adjustments for elevation, wind, temperature, and altitude.',
        color: 'bg-indigo-500/10 border-indigo-500/20',
        accent: 'text-indigo-400',
        badge: null,
        icon: (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      },
    ],
  },
];

export default function HomePage() {
  return (
    <AuthGuard>
      <Nav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Golf OS</h1>
          <p className="text-gray-400">Everything you need to improve your game — pick any tool to get started.</p>
        </div>

        {modules.map((section) => (
          <div key={section.group} className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
              {section.group}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.items.map((mod) => (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className={`group block rounded-lg border p-4 transition-all hover:scale-[1.01] hover:shadow-lg ${mod.color}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 mt-0.5 ${mod.accent}`}>
                      {mod.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">
                          {mod.title}
                        </h3>
                        {mod.badge && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                            {mod.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        {mod.desc}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AuthGuard>
  );
}
