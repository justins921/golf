'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useBagClubs, useAllShots } from '@/lib/hooks';
import { CLUB_ORDER, sortClubs } from '@/lib/types';
import type { BagClub } from '@/lib/types';
import Link from 'next/link';

// ============================================================
// Common club name suggestions
// ============================================================

const CLUB_SUGGESTIONS = [
  'Driver', '3 Wood', '5 Wood', '7 Wood',
  '3 Hybrid', '4 Hybrid', '5 Hybrid',
  '3 Iron', '4 Iron', '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron',
  'PW', '50\u00b0', '52\u00b0', '54\u00b0', '56\u00b0', '58\u00b0', '60\u00b0',
  'Putter',
];

// ============================================================
// Club categories for grouping
// ============================================================

function getCategory(clubName: string): string {
  const order = CLUB_ORDER[clubName] ?? CLUB_ORDER[clubName.replace('\u00b0', '')] ?? 50;
  if (order <= 4) return 'Woods';
  if (order <= 7) return 'Hybrids';
  if (order <= 15) return 'Irons';
  if (order <= 21) return 'Wedges';
  if (clubName.toLowerCase().includes('putter')) return 'Putter';
  // fallback based on name heuristics
  const lower = clubName.toLowerCase();
  if (lower.includes('wood') || lower === 'driver') return 'Woods';
  if (lower.includes('hybrid') || lower.includes('h')) return 'Hybrids';
  if (lower.includes('iron') || /^\d+i$/i.test(clubName)) return 'Irons';
  if (lower.includes('wedge') || /^\d{2}\u00b0?$/.test(clubName) || ['pw', 'gw', 'sw', 'lw', 'aw'].includes(lower)) return 'Wedges';
  if (lower.includes('putter')) return 'Putter';
  return 'Other';
}

const CATEGORY_ORDER = ['Woods', 'Hybrids', 'Irons', 'Wedges', 'Putter', 'Other'];

// ============================================================
// Page
// ============================================================

export default function BagPage() {
  return (
    <AuthGuard>
      <Nav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-1">Equipment Bag</h1>
        <p className="text-sm text-gray-500 mb-6">
          Manage the clubs in your bag, track specs, and see carry distances from shot data.
        </p>
        <BagManager />
      </div>
    </AuthGuard>
  );
}

// ============================================================
// Main component
// ============================================================

function BagManager() {
  const { clubs, loading, upsertClub, deleteClub } = useBagClubs();
  const { shots, loading: shotsLoading } = useAllShots();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Compute median carry distances from shot data
  const clubDistances = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const s of shots.filter(s => s.is_full_shot && !s.excluded_from_card)) {
      (map[s.club_name] ??= []).push(s.carry_distance_yd);
    }
    const result: Record<string, number> = {};
    for (const [name, carries] of Object.entries(map)) {
      carries.sort((a, b) => a - b);
      result[name] = Math.round(carries[Math.floor(carries.length / 2)]);
    }
    return result;
  }, [shots]);

  // Sort clubs by CLUB_ORDER
  const sortedClubs = useMemo(() => {
    const names = clubs.map(c => c.club_name);
    const sorted = sortClubs(names);
    return sorted.map(name => clubs.find(c => c.club_name === name)!);
  }, [clubs]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, BagClub[]> = {};
    for (const club of sortedClubs) {
      const cat = getCategory(club.club_name);
      (groups[cat] ??= []).push(club);
    }
    return groups;
  }, [sortedClubs]);

  // Distance coverage
  const distanceCoverage = useMemo(() => {
    const clubNames = clubs.map(c => c.club_name);
    const distances = clubNames
      .map(n => clubDistances[n])
      .filter((d): d is number => d != null);
    if (distances.length === 0) return null;
    return { min: Math.min(...distances), max: Math.max(...distances) };
  }, [clubs, clubDistances]);

  // Gaps detection — simple check for >20yd gap between consecutive clubs
  const hasGaps = useMemo(() => {
    const clubNames = sortClubs(clubs.map(c => c.club_name));
    const dists = clubNames
      .map(n => ({ name: n, dist: clubDistances[n] }))
      .filter(d => d.dist != null) as { name: string; dist: number }[];
    dists.sort((a, b) => b.dist - a.dist);
    for (let i = 0; i < dists.length - 1; i++) {
      if (dists[i].dist - dists[i + 1].dist > 20) return true;
    }
    return false;
  }, [clubs, clubDistances]);

  if (loading || shotsLoading) {
    return <div className="text-center text-gray-500 py-8 text-[13px]">Loading bag data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Bag Summary */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <span className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest">Clubs</span>
            <p className="text-lg font-bold text-gray-50">
              {clubs.length}<span className="text-gray-500 font-normal">/14</span>
            </p>
          </div>
          {distanceCoverage && (
            <div>
              <span className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest">Distance Coverage</span>
              <p className="text-lg font-bold text-gray-50">
                {distanceCoverage.min}<span className="text-gray-500 font-normal"> &ndash; </span>{distanceCoverage.max}
                <span className="text-sm text-gray-500 font-normal ml-1">yd</span>
              </p>
            </div>
          )}
          {hasGaps && (
            <div>
              <span className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest">Gaps</span>
              <p className="text-sm">
                <Link href="/gapping" className="text-green-400 hover:text-green-300 underline underline-offset-2">
                  Gaps detected &rarr;
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Club toggle */}
      <div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white text-[15px] font-medium rounded-2xl active:scale-[0.98] transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Club'}
        </button>
      </div>

      {/* Add Club form */}
      {showAddForm && (
        <AddClubForm
          existingNames={clubs.map(c => c.club_name)}
          onSave={async (club) => {
            const err = await upsertClub(club);
            if (!err) setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Club cards grouped by category */}
      {clubs.length === 0 && !showAddForm && (
        <div className="text-center py-16 text-[15px] text-gray-400">
          <div className="mb-2">No clubs in your bag yet</div>
          <div className="text-xs text-gray-500">Click &ldquo;+ Add Club&rdquo; to start building your bag.</div>
        </div>
      )}

      {CATEGORY_ORDER.map(cat => {
        const catClubs = grouped[cat];
        if (!catClubs || catClubs.length === 0) return null;
        return (
          <div key={cat}>
            <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{cat}</h2>
            <div className="space-y-2">
              {catClubs.map(club => (
                <ClubCard
                  key={club.id}
                  club={club}
                  medianCarry={clubDistances[club.club_name] ?? null}
                  expanded={expandedId === club.id}
                  onToggle={() => setExpandedId(expandedId === club.id ? null : club.id)}
                  onSave={async (updated) => {
                    await upsertClub({ ...updated, id: club.id });
                    setExpandedId(null);
                  }}
                  onDelete={async () => {
                    await deleteClub(club.id);
                    setExpandedId(null);
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Club Card
// ============================================================

function ClubCard({
  club,
  medianCarry,
  expanded,
  onToggle,
  onSave,
  onDelete,
}: {
  club: BagClub;
  medianCarry: number | null;
  expanded: boolean;
  onToggle: () => void;
  onSave: (club: Partial<BagClub> & { club_name: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editName, setEditName] = useState(club.club_name);
  const [editBrand, setEditBrand] = useState(club.brand ?? '');
  const [editModel, setEditModel] = useState(club.model ?? '');
  const [editLoft, setEditLoft] = useState(club.loft_deg?.toString() ?? '');
  const [editShaft, setEditShaft] = useState(club.shaft ?? '');
  const [editFlex, setEditFlex] = useState(club.flex ?? '');
  const [editNotes, setEditNotes] = useState(club.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      club_name: editName,
      brand: editBrand || null,
      model: editModel || null,
      loft_deg: editLoft ? parseFloat(editLoft) : null,
      shaft: editShaft || null,
      flex: editFlex || null,
      notes: editNotes || null,
    });
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    await onDelete();
    setSaving(false);
  };

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-gray-50 truncate">{club.club_name}</span>
          {(club.brand || club.model) && (
            <span className="text-xs text-gray-500 truncate">
              {[club.brand, club.model].filter(Boolean).join(' ')}
            </span>
          )}
          {club.loft_deg != null && (
            <span className="text-xs text-gray-600">{club.loft_deg}&deg;</span>
          )}
          {(club.shaft || club.flex) && (
            <span className="text-xs text-gray-600 hidden sm:inline">
              {[club.shaft, club.flex].filter(Boolean).join(' / ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {medianCarry != null && (
            <span className="text-sm font-mono text-green-400">{medianCarry} yd</span>
          )}
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded edit form */}
      {expanded && (
        <div className="border-t border-gray-800/60 px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Club Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Brand</label>
              <input
                type="text"
                value={editBrand}
                onChange={e => setEditBrand(e.target.value)}
                placeholder="e.g. Titleist"
                className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Model</label>
              <input
                type="text"
                value={editModel}
                onChange={e => setEditModel(e.target.value)}
                placeholder="e.g. T200"
                className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Loft (&deg;)</label>
              <input
                type="number"
                step="0.5"
                value={editLoft}
                onChange={e => setEditLoft(e.target.value)}
                placeholder="e.g. 10.5"
                className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Shaft</label>
              <input
                type="text"
                value={editShaft}
                onChange={e => setEditShaft(e.target.value)}
                placeholder="e.g. Project X 6.0"
                className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Flex</label>
              <select
                value={editFlex}
                onChange={e => setEditFlex(e.target.value)}
                className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                <option value="">--</option>
                <option value="X">X (Extra Stiff)</option>
                <option value="S">S (Stiff)</option>
                <option value="R">R (Regular)</option>
                <option value="A">A (Senior)</option>
                <option value="L">L (Ladies)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Notes</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about this club..."
              className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-red-500 hover:text-red-400 transition-colors"
                >
                  Remove from bag
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Are you sure?</span>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-xs text-red-400 hover:text-red-300 font-medium"
                  >
                    Yes, remove
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-gray-500 hover:text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggle}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="px-4 py-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-xs font-medium rounded-2xl active:scale-[0.98] transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Add Club Form
// ============================================================

function AddClubForm({
  existingNames,
  onSave,
  onCancel,
}: {
  existingNames: string[];
  onSave: (club: Partial<BagClub> & { club_name: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [clubName, setClubName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [loft, setLoft] = useState('');
  const [shaft, setShaft] = useState('');
  const [flex, setFlex] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = useMemo(() => {
    if (!clubName.trim()) return CLUB_SUGGESTIONS.filter(s => !existingNames.includes(s));
    const lower = clubName.toLowerCase();
    return CLUB_SUGGESTIONS.filter(
      s => s.toLowerCase().includes(lower) && !existingNames.includes(s)
    );
  }, [clubName, existingNames]);

  const handleSubmit = async () => {
    if (!clubName.trim()) return;
    setSaving(true);
    await onSave({
      club_name: clubName.trim(),
      brand: brand || null,
      model: model || null,
      loft_deg: loft ? parseFloat(loft) : null,
      shaft: shaft || null,
      flex: flex || null,
    });
    setSaving(false);
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-50">Add a Club</h3>

      {/* Club name with suggestions */}
      <div className="relative">
        <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Club Name *</label>
        <input
          type="text"
          value={clubName}
          onChange={e => { setClubName(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="e.g. 7 Iron"
          className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-gray-800 rounded-xl shadow-lg">
            {filteredSuggestions.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => { setClubName(suggestion); setShowSuggestions(false); }}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Brand</label>
          <input
            type="text"
            value={brand}
            onChange={e => setBrand(e.target.value)}
            placeholder="e.g. Callaway"
            className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Model</label>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="e.g. Paradym"
            className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Loft (&deg;)</label>
          <input
            type="number"
            step="0.5"
            value={loft}
            onChange={e => setLoft(e.target.value)}
            placeholder="e.g. 28"
            className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Shaft</label>
          <input
            type="text"
            value={shaft}
            onChange={e => setShaft(e.target.value)}
            placeholder="e.g. KBS Tour 120"
            className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Flex</label>
          <select
            value={flex}
            onChange={e => setFlex(e.target.value)}
            className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          >
            <option value="">--</option>
            <option value="X">X (Extra Stiff)</option>
            <option value="S">S (Stiff)</option>
            <option value="R">R (Regular)</option>
            <option value="A">A (Senior)</option>
            <option value="L">L (Ladies)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !clubName.trim()}
          className="px-4 py-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-xs font-medium rounded-2xl active:scale-[0.98] transition-colors"
        >
          {saving ? 'Adding...' : 'Add to Bag'}
        </button>
      </div>
    </div>
  );
}
