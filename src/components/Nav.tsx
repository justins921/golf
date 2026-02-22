'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const navGroups = [
  {
    label: 'Train',
    items: [
      { href: '/speed', label: 'Speed Training', desc: 'Track clubhead speed progress' },
      { href: '/fitness', label: 'Golf Fitness', desc: 'Workouts & exercise library' },
      { href: '/practice', label: 'Practice', desc: 'Structured drills & scoring' },
    ],
  },
  {
    label: 'Track',
    items: [
      { href: '/rounds', label: 'Rounds', desc: 'Scorecards & on-course stats' },
      { href: '/shots', label: 'Shot Data', desc: 'Garmin R50 import & sessions' },
      { href: '/compare', label: 'Compare', desc: 'Dispersion across sessions' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/wedges', label: 'Wedge Lab', desc: 'Matrix, calibration & practice' },
      { href: '/putters', label: 'Putter Lab', desc: 'Compare putters with drills' },
      { href: '/yardage', label: 'Yardage Card', desc: 'Data-driven club distances' },
      { href: '/calculator', label: 'Calculator', desc: 'Plays-like adjustments' },
    ],
  },
];

const allLinks = navGroups.flatMap((g) => g.items);

export default function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
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
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
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
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                          >
                            <div className="text-sm font-medium">{item.label}</div>
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
            <span className="hidden sm:inline text-sm text-gray-500 truncate max-w-[150px]">{user.email}</span>
            <button
              onClick={signOut}
              className="hidden md:inline text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
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
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="border-t border-gray-800 pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500 truncate">{user.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
