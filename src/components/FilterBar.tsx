'use client';

import type { ShotFilter } from '@/lib/types';

interface Props {
  filter: ShotFilter;
  onChange: (filter: ShotFilter) => void;
  clubs?: string[];
}

export default function FilterBar({ filter, onChange, clubs }: Props) {
  const update = (patch: Partial<ShotFilter>) => onChange({ ...filter, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={filter.fullShotsOnly}
          onChange={(e) => update({ fullShotsOnly: e.target.checked, includePartials: !e.target.checked })}
          className="accent-green-500"
        />
        Full shots only
      </label>

      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={filter.includePartials}
          onChange={(e) => update({ includePartials: e.target.checked, fullShotsOnly: !e.target.checked })}
          className="accent-green-500"
        />
        Include partials
      </label>

      <label className="flex items-center gap-1.5 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={filter.onlyWithTargets}
          onChange={(e) => update({ onlyWithTargets: e.target.checked })}
          className="accent-green-500"
        />
        With targets only
      </label>

      {filter.onlyWithTargets && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>&plusmn;</span>
          <input
            type="number"
            value={filter.targetWindow ?? ''}
            onChange={(e) => update({ targetWindow: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="any"
            className="w-14 bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
          />
          <span>yd window</span>
        </div>
      )}

      {clubs && clubs.length > 1 && (
        <select
          value={filter.clubNames?.[0] ?? ''}
          onChange={(e) => update({ clubNames: e.target.value ? [e.target.value] : undefined })}
          className="bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
        >
          <option value="">All clubs</option>
          {clubs.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
    </div>
  );
}
