'use client';

import Link from 'next/link';
import { useState } from 'react';

const FEATURES = [
  {
    title: 'Yardage Cards You Can Trust',
    desc: 'Built from your actual shot data — not manufacturer specs. See your real carry distances with P20–P80 ranges, dispersion arcs, and lateral tendency per club.',
    detail: 'Adjust for elevation, temperature, and humidity. Print a 4×6 card for your destination course.',
    lm: true,
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'See Your Real Dispersion',
    desc: 'D3-powered scatter plots with 1σ/2σ ellipses show exactly where your shots land — not just averages. Compare sessions, overlay clubs, spot patterns.',
    detail: 'Dispersion arc tells you total lateral spread per club and which direction you miss.',
    lm: true,
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    title: 'Practice With Purpose',
    desc: 'Structured programs, AI-generated random plans, and timed drills — all scored with a strokes-gained engine. Track every session and see trends over time.',
    detail: 'Voice input lets you speak your numbers hands-free. 12 built-in drills across every category.',
    lm: false,
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Putter Lab',
    desc: 'Compare putters head-to-head with 15 standardized drills. Track make rates, see trends, and know which putter actually performs — not which one feels right.',
    detail: 'Random drill generator with setup instructions and space requirements for any practice area.',
    lm: false,
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    title: 'Wedge Lab',
    desc: 'Build your wedge distance matrix with any swing system — clock, percentage, body reference, thirds, or custom. Know every partial swing distance.',
    detail: 'TheStack-inspired random target practice with proximity scoring. Matrix prints on your yardage card.',
    lm: false,
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
  {
    title: 'Plays-Like Calculator',
    desc: 'Input elevation change, wind, temperature, altitude, and humidity — get the adjusted yardage instantly. No more guessing at mountain courses.',
    detail: 'Air density model accounts for all variables. Quick access during rounds.',
    lm: false,
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Speed Training Log',
    desc: 'Track TheStack, SuperSpeed, Rypstick, or any speed protocol. Log clubhead speed per set and rep, see max and average trends over time.',
    detail: 'No launch monitor needed — just enter your numbers. Progress charts show your speed gains session over session.',
    lm: false,
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Golf Fitness',
    desc: 'Log workouts with a built-in library of 70+ golf-specific exercises — mobility, rotational strength, core, and power. Track streaks and weekly volume.',
    detail: 'Browse by category, build workouts, rate difficulty. Works standalone as your golf fitness tracker.',
    lm: false,
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    title: 'Round Tracking',
    desc: 'Enter hole-by-hole scorecards with par, score, putts, fairways hit, and greens in regulation. Color-coded scoring shows your patterns instantly.',
    detail: 'Scoring average, best round, putting stats, FIR%, GIR%, and scoring trend charts. No other app needed.',
    lm: false,
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
  },
];

const FAQ = [
  {
    q: 'What launch monitors does Golf OS support?',
    a: 'Currently Golf OS imports CSV files from the Garmin Approach R50. If your launch monitor exports CSV data with carry distance, lateral, and club info, it may work too. We\'re expanding device support.',
  },
  {
    q: 'How is this different from the Garmin Golf app?',
    a: 'The Garmin app shows individual shots. Golf OS analyzes your patterns — dispersion ellipses, percentile-based yardage ranges, environment-adjusted distances, and structured practice with strokes-gained scoring. It turns raw data into decisions.',
  },
  {
    q: 'Can I use this without a launch monitor?',
    a: 'Most of Golf OS works without a launch monitor. Speed Training, Golf Fitness, Round Tracking, Wedge Lab calibration, Putter Lab, Practice drills, and the Calculator are all standalone. Only the Shot Data import, dispersion analysis, and data-driven yardage cards require a Garmin R50 or compatible launch monitor.',
  },
  {
    q: 'Will my data be private?',
    a: 'Yes. Every user\'s data is isolated with row-level security in Supabase. No one can see your sessions, shots, or equipment data except you.',
  },
  {
    q: 'Does this work on my phone?',
    a: 'Yes. Golf OS is a responsive web app that works on any device. Yardage cards are sized for phone screens and 4×6 print cards. Voice input during practice sessions is optimized for mobile.',
  },
  {
    q: 'Which plan is right for me?',
    a: 'If you just want the calculator, basic practice drills, and to try out the putter/wedge labs — Free works great. If you use a Garmin R50 and want yardage cards, dispersion analysis, practice scoring, and full exports — go Pro.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no cancellation fees. Your data stays available on the Free tier if you downgrade.',
  },
];

const STATS = [
  { value: '25+', label: 'Data points per shot' },
  { value: '15', label: 'Built-in putting drills' },
  { value: '5', label: 'Wedge swing systems' },
  { value: '4×6"', label: 'Printable yardage card' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <span className="text-green-400 font-bold text-lg">Golf OS</span>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="hidden sm:inline text-sm text-gray-400 hover:text-gray-50 transition-colors">
              Pricing
            </a>
            <Link href="/auth/signin" className="text-sm text-gray-400 hover:text-gray-50 transition-colors">
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-gray-50 font-medium rounded-md transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <p className="text-green-400 text-sm font-medium tracking-wide uppercase mb-4">
          For Garmin R50 owners who want more from their data
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-50 leading-tight max-w-3xl mx-auto">
          Your range data is worth more than averages.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Golf OS turns Garmin R50 shot data into precise yardage cards, dispersion analysis, and structured practice plans — so you know your real distances and practice with purpose.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-500 text-gray-50 font-semibold rounded-lg text-lg transition-colors"
          >
            Start Free — No Credit Card
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg text-lg transition-colors text-center"
          >
            See How It Works
          </a>
        </div>
        <p className="mt-4 text-xs text-gray-600">
          Free tier available forever. Pro from $4.08/mo. Your data stays yours.
        </p>
      </section>

      {/* Stats bar — social proof / credibility */}
      <section className="border-y border-gray-800 bg-gray-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-2xl sm:text-3xl font-bold text-green-400">{s.value}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-50 mb-6">
            You have the data. You just can&apos;t use it yet.
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 text-left mt-10">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wide mb-3">Without Golf OS</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex gap-2"><span className="text-red-400/60 shrink-0">-</span> CSVs sit on your phone, unanalyzed</li>
                <li className="flex gap-2"><span className="text-red-400/60 shrink-0">-</span> You guess at yardages from averages</li>
                <li className="flex gap-2"><span className="text-red-400/60 shrink-0">-</span> No idea how elevation or temp affects your clubs</li>
                <li className="flex gap-2"><span className="text-red-400/60 shrink-0">-</span> Practice is aimless — hit balls, hope for improvement</li>
                <li className="flex gap-2"><span className="text-red-400/60 shrink-0">-</span> Putter and wedge decisions based on feel, not data</li>
              </ul>
            </div>
            <div className="bg-gray-900 border border-green-900/50 rounded-lg p-5">
              <h3 className="text-green-400 font-semibold text-sm uppercase tracking-wide mb-3">With Golf OS</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex gap-2"><span className="text-green-400 shrink-0">+</span> Import CSVs and see dispersion patterns instantly</li>
                <li className="flex gap-2"><span className="text-green-400 shrink-0">+</span> Percentile-based yardage cards from real shot data</li>
                <li className="flex gap-2"><span className="text-green-400 shrink-0">+</span> Environment-adjusted distances for any course</li>
                <li className="flex gap-2"><span className="text-green-400 shrink-0">+</span> Structured practice with strokes-gained scoring</li>
                <li className="flex gap-2"><span className="text-green-400 shrink-0">+</span> Objective putter and wedge comparisons</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-50">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Six tools that work together — import your data once and every feature uses it.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                {f.icon}
                {f.lm ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    Launch Monitor
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    No Equipment
                  </span>
                )}
              </div>
              <h3 className="text-gray-50 font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              <p className="text-xs text-gray-500 mt-2">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-gray-800 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-50 text-center mb-12">
            Up and running in 30 seconds
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: '1', title: 'Create an account', desc: 'Email and password. Free tier starts instantly — no credit card.' },
              { step: '2', title: 'Import your R50 CSV', desc: 'Drag and drop your DrivingRange CSV file. All 25+ data points are captured.' },
              { step: '3', title: 'See your real numbers', desc: 'Dispersion charts, yardage card, and practice recommendations — instantly.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-green-600/20 border border-green-600/40 text-green-400 font-bold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-gray-50 font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-50">
            Simple pricing. Start free.
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Use the free tools forever. Upgrade when you want the full picture.
          </p>
          {/* Billing toggle */}
          <div className="mt-6 inline-flex items-center bg-gray-900 border border-gray-800 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                billingCycle === 'monthly' ? 'bg-gray-800 text-gray-50' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                billingCycle === 'annual' ? 'bg-gray-800 text-gray-50' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Annual <span className="text-green-400 text-xs ml-1">Save 18%</span>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free tier */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-gray-50 font-semibold text-lg">Free</h3>
            <div className="mt-3 mb-5">
              <span className="text-3xl font-bold text-gray-50">$0</span>
              <span className="text-gray-500 text-sm ml-1">forever</span>
            </div>
            <p className="text-sm text-gray-400 mb-6">Try the core tools — no credit card, no time limit.</p>
            <Link
              href="/auth/signup"
              className="block w-full text-center px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors text-sm"
            >
              Get Started Free
            </Link>
            <ul className="mt-6 space-y-2.5 text-sm">
              <li className="flex gap-2.5 text-gray-400">
                <svg className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Plays-like yardage calculator
              </li>
              <li className="flex gap-2.5 text-gray-400">
                <svg className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Practice drills (no scoring)
              </li>
              <li className="flex gap-2.5 text-gray-400">
                <svg className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Putter Lab (2 putters)
              </li>
              <li className="flex gap-2.5 text-gray-400">
                <svg className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Wedge Lab (basic matrix)
              </li>
              <li className="flex gap-2.5 text-gray-400">
                <svg className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                1 session import
              </li>
            </ul>
          </div>

          {/* Pro tier — highlighted */}
          <div className="bg-gray-900 border-2 border-green-600 rounded-lg p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-green-600 text-gray-50 text-xs font-semibold px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>
            <h3 className="text-gray-50 font-semibold text-lg">Pro</h3>
            <div className="mt-3 mb-5">
              <span className="text-3xl font-bold text-gray-50">
                {billingCycle === 'annual' ? '$49' : '$5'}
              </span>
              <span className="text-gray-500 text-sm ml-1">
                {billingCycle === 'annual' ? '/year' : '/month'}
              </span>
              {billingCycle === 'annual' && (
                <span className="text-green-400 text-xs ml-2">$4.08/mo</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-6">Full access to everything Golf OS offers.</p>
            <Link
              href="/auth/signup"
              className="block w-full text-center px-4 py-2.5 bg-green-600 hover:bg-green-500 text-gray-50 font-semibold rounded-lg transition-colors text-sm"
            >
              Start Pro — 7-Day Free Trial
            </Link>
            <ul className="mt-6 space-y-2.5 text-sm">
              <li className="flex gap-2.5 text-gray-300">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Everything in Free
              </li>
              <li className="flex gap-2.5 text-gray-300">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Unlimited session imports
              </li>
              <li className="flex gap-2.5 text-gray-300">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Full yardage card builder + environment adjust
              </li>
              <li className="flex gap-2.5 text-gray-300">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Dispersion analysis with ellipses + arcs
              </li>
              <li className="flex gap-2.5 text-gray-300">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Strokes-gained practice scoring + insights
              </li>
              <li className="flex gap-2.5 text-gray-300">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Voice input for hands-free logging
              </li>
              <li className="flex gap-2.5 text-gray-300">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Unlimited putters + full Wedge Lab
              </li>
              <li className="flex gap-2.5 text-gray-300">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                PDF + PNG export
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Objection handling / FAQ */}
      <section id="faq" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-50 text-center mb-10">
          Common questions
        </h2>
        <div className="max-w-2xl mx-auto space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="border border-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-900/50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-200">{item.q}</span>
                <svg
                  className={`w-4 h-4 text-gray-500 shrink-0 ml-4 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-50 mb-4">
            Stop guessing. Start knowing.
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Import your first CSV and see what your data has been trying to tell you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-500 text-gray-50 font-semibold rounded-lg text-lg transition-colors"
            >
              Try Pro Free for 7 Days
            </Link>
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg text-lg transition-colors text-center"
            >
              Start with Free
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-600">No credit card for Free. Cancel anytime on Pro.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-bold">Golf OS</span>
            <span className="text-gray-600 text-sm">by Sobojinski Solutions</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/auth/signin" className="hover:text-gray-300 transition-colors">Sign In</Link>
            <Link href="/auth/signup" className="hover:text-gray-300 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>

      {/* JSON-LD Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'Sobojinski Solutions',
                url: 'https://golfos.app',
                logo: 'https://golfos.app/logo.png',
              },
              {
                '@type': 'SoftwareApplication',
                name: 'Golf OS',
                applicationCategory: 'SportsApplication',
                operatingSystem: 'Web',
                description: 'Golf performance analytics and practice companion. Import Garmin R50 data, build yardage cards, analyze dispersion, and practice with purpose.',
                offers: [
                  {
                    '@type': 'Offer',
                    name: 'Free',
                    price: '0',
                    priceCurrency: 'USD',
                    availability: 'https://schema.org/InStock',
                  },
                  {
                    '@type': 'Offer',
                    name: 'Pro',
                    price: '5',
                    priceCurrency: 'USD',
                    availability: 'https://schema.org/InStock',
                    priceSpecification: {
                      '@type': 'UnitPriceSpecification',
                      price: '5',
                      priceCurrency: 'USD',
                      billingDuration: 'P1M',
                    },
                  },
                ],
                creator: {
                  '@type': 'Organization',
                  name: 'Sobojinski Solutions',
                },
              },
              {
                '@type': 'FAQPage',
                mainEntity: FAQ.map((item) => ({
                  '@type': 'Question',
                  name: item.q,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.a,
                  },
                })),
              },
            ],
          }),
        }}
      />
    </div>
  );
}
