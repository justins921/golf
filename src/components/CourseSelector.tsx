'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useCourses } from '@/lib/hooks';
import type { Course, TeeSet } from '@/lib/types';

interface CourseSelectorProps {
  onSelect: (info: {
    courseName: string;
    tees: string;
    courseRating: number | null;
    slopeRating: number | null;
    courseId: string | null;
  }) => void;
  initialCourse?: string;
  initialTees?: string;
  compact?: boolean; // smaller variant for mobile
}

export default function CourseSelector({ onSelect, initialCourse, initialTees, compact }: CourseSelectorProps) {
  const { courses, addCourse } = useCourses();
  const [query, setQuery] = useState(initialCourse ?? '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTee, setSelectedTee] = useState<string>(initialTees ?? '');
  const [showSaveCourse, setShowSaveCourse] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New tee set form
  const [newTeeName, setNewTeeName] = useState('');
  const [newRating, setNewRating] = useState('');
  const [newSlope, setNewSlope] = useState('');
  const [newPar, setNewPar] = useState('72');

  // Filter courses by query
  const filtered = useMemo(() => {
    if (!query.trim()) return courses.slice(0, 10);
    const lower = query.toLowerCase();
    return courses
      .filter((c) => c.name.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [courses, query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectCourse = (course: Course) => {
    setQuery(course.name);
    setSelectedCourse(course);
    setShowDropdown(false);

    // Auto-select first tee set or match initialTees
    const tees = course.tee_sets || [];
    const match = initialTees
      ? tees.find((t) => t.name.toLowerCase() === initialTees.toLowerCase())
      : tees[0];

    if (match) {
      setSelectedTee(match.name);
      onSelect({
        courseName: course.name,
        tees: match.name,
        courseRating: match.course_rating,
        slopeRating: match.slope_rating,
        courseId: course.id,
      });
    } else {
      setSelectedTee('');
      onSelect({
        courseName: course.name,
        tees: '',
        courseRating: null,
        slopeRating: null,
        courseId: course.id,
      });
    }
  };

  const handleSelectTee = (tee: TeeSet) => {
    setSelectedTee(tee.name);
    onSelect({
      courseName: selectedCourse?.name ?? query,
      tees: tee.name,
      courseRating: tee.course_rating,
      slopeRating: tee.slope_rating,
      courseId: selectedCourse?.id ?? null,
    });
  };

  const handleManualEntry = () => {
    setShowDropdown(false);
    onSelect({
      courseName: query,
      tees: selectedTee,
      courseRating: null,
      slopeRating: null,
      courseId: null,
    });
  };

  const handleSaveCourse = async () => {
    if (!query.trim()) return;
    setSaving(true);

    const teeSets: TeeSet[] = [];
    if (newTeeName && newRating && newSlope) {
      teeSets.push({
        name: newTeeName,
        course_rating: parseFloat(newRating),
        slope_rating: parseInt(newSlope),
        par: parseInt(newPar) || 72,
        yardage: null,
      });
    }

    const { data } = await addCourse({
      name: query.trim(),
      city: null,
      state: null,
      tee_sets: teeSets,
    });

    if (data) {
      setSelectedCourse(data);
      if (teeSets.length > 0) {
        setSelectedTee(teeSets[0].name);
        onSelect({
          courseName: data.name,
          tees: teeSets[0].name,
          courseRating: teeSets[0].course_rating,
          slopeRating: teeSets[0].slope_rating,
          courseId: data.id,
        });
      }
    }

    setSaving(false);
    setShowSaveCourse(false);
    setNewTeeName('');
    setNewRating('');
    setNewSlope('');
    setNewPar('72');
  };

  const handleAddTee = async () => {
    if (!selectedCourse || !newTeeName || !newRating || !newSlope) return;
    setSaving(true);

    const updatedTees = [
      ...(selectedCourse.tee_sets || []),
      {
        name: newTeeName,
        course_rating: parseFloat(newRating),
        slope_rating: parseInt(newSlope),
        par: parseInt(newPar) || 72,
        yardage: null,
      },
    ];

    const { updateCourse } = await import('@/lib/hooks').then((m) => {
      // We need to use the supabase client directly here
      return { updateCourse: async () => {} };
    });

    // Use courses hook update - but we don't have it directly. Use addCourse's pattern
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('courses').update({ tee_sets: updatedTees }).eq('id', selectedCourse.id);

    // Update local state
    setSelectedCourse({ ...selectedCourse, tee_sets: updatedTees });
    const newTee = updatedTees[updatedTees.length - 1];
    setSelectedTee(newTee.name);
    onSelect({
      courseName: selectedCourse.name,
      tees: newTee.name,
      courseRating: newTee.course_rating,
      slopeRating: newTee.slope_rating,
      courseId: selectedCourse.id,
    });

    setSaving(false);
    setShowSaveCourse(false);
    setNewTeeName('');
    setNewRating('');
    setNewSlope('');
  };

  const py = compact ? 'py-2' : 'py-3';
  const textSize = compact ? 'text-sm' : 'text-[15px]';

  return (
    <div className="space-y-3">
      {/* Course name input with autocomplete */}
      <div className="relative" ref={dropdownRef}>
        <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Course</label>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedCourse(null);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search or enter course name"
          className={`w-full px-3 ${py} ${textSize} bg-gray-800 border-0 rounded-xl text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40`}
        />

        {/* Dropdown */}
        {showDropdown && query.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-gray-900/95 backdrop-blur-lg rounded-2xl border border-gray-800 shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCourse(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-800 transition-colors"
                >
                  <div className="text-sm text-gray-50">{c.name}</div>
                  {c.city && (
                    <div className="text-[10px] text-gray-500">{c.city}{c.state ? `, ${c.state}` : ''}</div>
                  )}
                  {c.tee_sets?.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {c.tee_sets.map((t, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400">
                          {t.name} {t.course_rating}/{t.slope_rating}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-2.5 text-[15px] text-gray-500">No saved courses match</div>
            )}
            <button
              onClick={handleManualEntry}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-800 border-t border-gray-800/60 text-[15px] text-green-400"
            >
              Use &quot;{query}&quot; without lookup
            </button>
          </div>
        )}
      </div>

      {/* Tee selector (when course is selected and has tees) */}
      {selectedCourse && selectedCourse.tee_sets?.length > 0 && (
        <div>
          <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Tees</label>
          <div className="flex flex-wrap gap-1">
            {selectedCourse.tee_sets.map((tee, i) => (
              <button
                key={i}
                onClick={() => handleSelectTee(tee)}
                className={`px-3 ${compact ? 'py-1' : 'py-1.5'} text-xs rounded-full ${
                  selectedTee === tee.name
                    ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <span className="font-medium">{tee.name}</span>
                <span className="ml-1 text-gray-300 opacity-70">{tee.course_rating}/{tee.slope_rating}</span>
              </button>
            ))}
            <button
              onClick={() => setShowSaveCourse(true)}
              className={`px-2 ${compact ? 'py-1' : 'py-1.5'} text-xs rounded-full bg-gray-800 text-gray-500 hover:text-gray-400`}
            >
              + Tee
            </button>
          </div>
        </div>
      )}

      {/* Auto-filled rating display */}
      {selectedCourse && selectedTee && (
        <div className="flex gap-2 text-xs">
          {(() => {
            const tee = selectedCourse.tee_sets?.find((t) => t.name === selectedTee);
            if (!tee) return null;
            return (
              <>
                <span className="text-green-400">Rating: {tee.course_rating}</span>
                <span className="text-green-400">Slope: {tee.slope_rating}</span>
                <span className="text-gray-500">Par {tee.par}</span>
              </>
            );
          })()}
        </div>
      )}

      {/* Save new course / add tee form */}
      {!selectedCourse && query.length > 2 && !showSaveCourse && (
        <button
          onClick={() => setShowSaveCourse(true)}
          className="text-[13px] text-green-400 hover:text-green-300"
        >
          Save &quot;{query}&quot; to your courses with rating/slope
        </button>
      )}

      {showSaveCourse && (
        <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <div className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">
            {selectedCourse ? `Add tee to ${selectedCourse.name}` : `Save "${query}" to your courses`}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <input
                type="text"
                value={newTeeName}
                onChange={(e) => setNewTeeName(e.target.value)}
                placeholder="Tee name"
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <input
                type="number"
                step="0.1"
                value={newRating}
                onChange={(e) => setNewRating(e.target.value)}
                placeholder="Rating"
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <input
                type="number"
                value={newSlope}
                onChange={(e) => setNewSlope(e.target.value)}
                placeholder="Slope"
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <input
                type="number"
                value={newPar}
                onChange={(e) => setNewPar(e.target.value)}
                placeholder="Par"
                className="w-full bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectedCourse ? handleAddTee : handleSaveCourse}
              disabled={!newTeeName || !newRating || !newSlope || saving}
              className="bg-green-500 hover:bg-green-400 rounded-2xl active:scale-[0.98] px-4 py-2 text-[13px] font-semibold disabled:opacity-50 text-gray-50"
            >
              {saving ? 'Saving...' : selectedCourse ? 'Add Tee' : 'Save Course'}
            </button>
            <button
              onClick={() => setShowSaveCourse(false)}
              className="bg-gray-800 text-gray-400 rounded-2xl px-4 py-2 text-[13px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
