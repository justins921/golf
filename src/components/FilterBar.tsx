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
    <div className="flex flex-wrap items-center gap-4 py-2">
      <label className="flex items-center gap-2.5 text-[13px] text-gray-300 cursor-pointer">
        <button
          type="button"
          className="toggle-switch"
          data-on={filter.fullShotsOnly ? "true" : "false"}
          onClick={() => update({ fullShotsOnly: !filter.fullShotsOnly, includePartials: filter.fullShotsOnly })}
          aria-label="Full shots only"
        />
        Full shots only
      </label>

      <label className="flex items-center gap-2.5 text-[13px] text-gray-300 cursor-pointer">
        <button
          type="button"
          className="toggle-switch"
          data-on={filter.includePartials ? "true" : "false"}
          onClick={() => update({ includePartials: !filter.includePartials, fullShotsOnly: filter.includePartials })}
          aria-label="Include partials"
        />
        Include partials
      </label>

      <label className="flex items-center gap-2.5 text-[13px] text-gray-300 cursor-pointer">
        <button
          type="button"
          className="toggle-switch"
          data-on={filter.onlyWithTargets ? "true" : "false"}
          onClick={() => update({ onlyWithTargets: !filter.onlyWithTargets })}
          aria-label="With targets only"
        />
        With targets only
      </label>

      {filter.onlyWithTargets && (
        <div className="flex items-center gap-1.5 text-[13px] text-gray-400">
          <span>&plusmn;</span>
          <input
            type="number"
            value={filter.targetWindow ?? ''}
            onChange={(e) => update({ targetWindow: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="any"
            className="w-16 bg-gray-800/60 rounded-lg px-3 py-1.5 text-[13px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
          <span>yd window</span>
        </div>
      )}

      {clubs && clubs.length > 1 && (
        <select
          value={filter.clubNames?.[0] ?? ''}
          onChange={(e) => update({ clubNames: e.target.value ? [e.target.value] : undefined })}
          className="bg-gray-800/60 rounded-lg px-3 py-1.5 text-[13px] text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 appearance-none pr-7"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
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
