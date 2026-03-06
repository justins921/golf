'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

const navGroups = [
  {
    label: 'Train',
    items: [
      { href: '/speed', label: 'Speed Training', desc: 'Track clubhead speed progress', lm: false },
      { href: '/fitness', label: 'Golf Fitness', desc: 'Workouts & exercise library', lm: false },
      { href: '/practice', label: 'Practice', desc: 'Structured drills & scoring', lm: false },
      { href: '/warmup', label: 'Pre-Round Warmup', desc: 'Personalized warmup routines', lm: false },
      { href: '/practice/plans', label: 'Practice Plans', desc: 'SG-based weekly practice plans', lm: false },
      { href: '/lessons', label: 'Lessons', desc: 'Coaching sessions & swing feels', lm: false },
    ],
  },
  {
    label: 'Track',
    items: [
      { href: '/play', label: 'Play', desc: 'On-course quick scorer', lm: false },
      { href: '/rounds', label: 'Rounds', desc: 'Scorecards & on-course stats', lm: false },
      { href: '/goals', label: 'Season Goals', desc: 'Track targets & milestones', lm: false },
      { href: '/challenges', label: 'Challenges', desc: 'Compete with friends', lm: false },
      { href: '/debrief', label: 'Post-Round Debrief', desc: 'Insights & action items', lm: false },
      { href: '/mental', label: 'Mental Game', desc: 'Journal, routines & mindset', lm: false },
      { href: '/strategy', label: 'Course Strategy', desc: 'Hole-by-hole game plans', lm: false },
      { href: '/shots', label: 'Shot Data', desc: 'Garmin R50 import & sessions', lm: true },
      { href: '/compare', label: 'Compare', desc: 'Dispersion across sessions', lm: true },
      { href: '/heatmap', label: 'Shot Heatmap', desc: 'Density maps & miss tendencies', lm: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/wedges', label: 'Wedge Lab', desc: 'Matrix, calibration & practice', lm: false },
      { href: '/putters', label: 'Putter Lab', desc: 'Compare putters with drills', lm: false },
      { href: '/yardage', label: 'Yardage Card', desc: 'Data-driven club distances', lm: true },
      { href: '/bag', label: 'My Bag', desc: 'Equipment & club specs', lm: false },
      { href: '/gapping', label: 'Club Gapping', desc: 'Distance gaps & bag simulator', lm: true },
      { href: '/calculator', label: 'Calculator', desc: 'Plays-like adjustments', lm: false },
    ],
  },
];

// Bottom tab bar items for mobile
const tabItems = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/play', label: 'Play', icon: 'play' },
  { href: '/practice', label: 'Practice', icon: 'practice' },
  { href: '/rounds', label: 'Rounds', icon: 'rounds' },
  { href: '/__more__', label: 'More', icon: 'more' },
] as const;

function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  const cls = `w-[22px] h-[22px] ${active ? 'text-green-400' : 'text-gray-500'}`;
  switch (icon) {
    case 'home':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
        </svg>
      );
    case 'play':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h4l10-10a2.121 2.121 0 00-3-3L4 18v3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 5.5l3 3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 3l-1 1" />
        </svg>
      );
    case 'practice':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case 'rounds':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6" />
        </svg>
      );
    case 'more':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenGroup(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!user) return null;

  // Find which group the current page belongs to
  const activeGroup = navGroups.find((g) => g.items.some((item) => isActive(item.href)));

  return (
    <>
      {/* Top navigation bar */}
      <nav className="bg-gray-900/80 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-800/40 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Left: logo + nav groups */}
            <div className="flex items-center gap-1" ref={dropdownRef}>
              <Link href="/" className="text-green-400 font-semibold text-[15px] mr-4 shrink-0 tracking-tight">
                Golf OS
              </Link>

              {/* Desktop grouped nav */}
              <div className="hidden md:flex items-center gap-0.5">
                {navGroups.map((group) => {
                  const isGroupActive = group === activeGroup;
                  const isOpen = openGroup === group.label;

                  return (
                    <div key={group.label} className="relative">
                      <button
                        onClick={() => setOpenGroup(isOpen ? null : group.label)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1 ${
                          isGroupActive
                            ? 'bg-gray-800/60 text-gray-50'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                        }`}
                      >
                        {group.label}
                        <svg
                          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown */}
                      {isOpen && (
                        <div className="absolute top-full left-0 mt-1.5 w-60 bg-gray-900/95 backdrop-blur-xl backdrop-saturate-150 rounded-xl shadow-2xl shadow-black/30 z-50 py-1 ring-1 ring-white/[0.08]">
                          {group.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`block mx-1 px-3 py-2.5 rounded-lg ${
                                isActive(item.href)
                                  ? 'bg-green-500/15 text-gray-50'
                                  : 'text-gray-300 hover:bg-white/[0.06]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium">{item.label}</span>
                                {item.lm && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 whitespace-nowrap">
                                    LM
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">{item.desc}</div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: theme toggle + user info + sign out */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-gray-800/40"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <span className="hidden sm:inline text-sm text-gray-500 truncate max-w-[150px]">{user.email}</span>
              <button
                onClick={signOut}
                className="hidden md:inline text-sm text-gray-400 hover:text-gray-100 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl backdrop-saturate-150 border-t border-gray-800/40">
        <div className="flex items-stretch justify-around px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {tabItems.map((tab) => {
            const isMore = tab.href === '/__more__';
            const active = isMore ? mobileMenuOpen : isActive(tab.href);

            if (isMore) {
              return (
                <button
                  key={tab.label}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="flex flex-col items-center justify-center py-2 px-3 min-w-[64px]"
                >
                  <TabIcon icon={tab.icon} active={active} />
                  <span className={`text-[10px] mt-0.5 ${active ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center py-2 px-3 min-w-[64px]"
              >
                <TabIcon icon={tab.icon} active={active} />
                <span className={`text-[10px] mt-0.5 ${active ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile "More" menu — full screen overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-up sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-2xl max-h-[85vh] overflow-y-auto"
               style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-gray-900 rounded-t-2xl">
              <div className="w-9 h-1 rounded-full bg-gray-700" />
            </div>

            <div className="px-4 pb-6 pt-2">
              {/* Dashboard link */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-3 ${
                  isActive('/') ? 'bg-green-500/10 text-gray-50' : 'text-gray-300 active:bg-gray-800/60'
                }`}
              >
                <TabIcon icon="home" active={isActive('/')} />
                <span className="text-[15px] font-medium">Dashboard</span>
              </Link>

              {navGroups.map((group) => (
                <div key={group.label} className="mb-4">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest px-4 py-1.5">
                    {group.label}
                  </div>
                  <div className="bg-gray-800/30 rounded-xl overflow-hidden">
                    {group.items.map((item, idx) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-4 py-3 ${
                          idx > 0 ? 'border-t border-gray-800/30' : ''
                        } ${
                          isActive(item.href)
                            ? 'bg-green-500/10 text-gray-50'
                            : 'text-gray-300 active:bg-gray-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[15px]">{item.label}</span>
                          {item.lm && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                              LM
                            </span>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {/* Account section */}
              <div className="border-t border-gray-800/40 pt-4 mt-2">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest px-4 py-1.5">
                  Account
                </div>
                <div className="bg-gray-800/30 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[13px] text-gray-400 truncate">{user.email}</span>
                    <button
                      onClick={toggleTheme}
                      className="p-2 text-gray-400 hover:text-gray-100 rounded-lg"
                      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                      {theme === 'dark' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-[15px] text-red-400 border-t border-gray-800/30 active:bg-gray-700/30"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </>
  );
}
