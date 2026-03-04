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
    ],
  },
  {
    label: 'Track',
    items: [
      { href: '/rounds', label: 'Rounds', desc: 'Scorecards & on-course stats', lm: false },
      { href: '/shots', label: 'Shot Data', desc: 'Garmin R50 import & sessions', lm: true },
      { href: '/compare', label: 'Compare', desc: 'Dispersion across sessions', lm: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/wedges', label: 'Wedge Lab', desc: 'Matrix, calibration & practice', lm: false },
      { href: '/putters', label: 'Putter Lab', desc: 'Compare putters with drills', lm: false },
      { href: '/yardage', label: 'Yardage Card', desc: 'Data-driven club distances', lm: true },
      { href: '/calculator', label: 'Calculator', desc: 'Plays-like adjustments', lm: false },
    ],
  },
];

const allLinks = navGroups.flatMap((g) => g.items);

export default function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // Close dropdown on route change
  useEffect(() => {
    setOpenGroup(null);
    setMobileOpen(false);
  }, [pathname]);

  if (!user) return null;

  // Find which group the current page belongs to
  const activeGroup = navGroups.find((g) => g.items.some((item) => isActive(item.href)));

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: logo + nav groups */}
          <div className="flex items-center gap-1" ref={dropdownRef}>
            <Link href="/" className="text-green-400 font-bold text-lg mr-4 shrink-0">
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
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                        isGroupActive
                          ? 'bg-gray-800 text-gray-50'
                          : 'text-gray-400 hover:text-gray-50 hover:bg-gray-800'
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
                      <div className="absolute top-full left-0 mt-1 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block px-4 py-2.5 transition-colors ${
                              isActive(item.href)
                                ? 'bg-gray-800 text-gray-50'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{item.label}</span>
                              {item.lm && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                                  LM
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{item.desc}</div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: user + mobile toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-100 transition-colors rounded-md hover:bg-gray-800"
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
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-50"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — grouped */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-800 px-4 pb-3 pt-2">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold px-3 py-1">
                {group.label}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-gray-800 text-gray-50'
                      : 'text-gray-400 hover:text-gray-50 hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                  {item.lm && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      LM
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
          <div className="border-t border-gray-800 pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500 truncate">{user.email}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-gray-100 transition-colors"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
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
              <button
                onClick={signOut}
                className="text-sm text-gray-400 hover:text-gray-100 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
