'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Shot } from '@/lib/types';
import { createClient } from '@/lib/supabase';

interface Props {
  shots: Shot[];
  onUpdate: () => void;
}

const TAG_PRESETS = ['Full', '3/4', 'Half', 'Chip', 'Knockdown', 'Warmup'];

export default function ShotTable({ shots, onUpdate }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Shot>>({});
  const [bulkTarget, setBulkTarget] = useState('');
  const [bulkTag, setBulkTag] = useState('');
  const [bulkFullShot, setBulkFullShot] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === shots.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(shots.map((s) => s.id)));
    }
  };

  const startEdit = (shot: Shot) => {
    setEditingId(shot.id);
    setEditValues({
      is_full_shot: shot.is_full_shot,
      target_distance_yd: shot.target_distance_yd,
      tags: shot.tags,
      notes: shot.notes,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    await supabase.from('shots').update(editValues).eq('id', editingId);
    setEditingId(null);
    setEditValues({});
    setSaving(false);
    onUpdate();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const bulkApply = async () => {
    if (selected.size === 0) return;
    setSaving(true);

    const updates: Partial<Shot> = {};
    if (bulkTarget !== '') {
      updates.target_distance_yd = bulkTarget === 'clear' ? null : parseFloat(bulkTarget);
    }
    if (bulkFullShot !== null) {
      updates.is_full_shot = bulkFullShot;
    }

    const ids = Array.from(selected);

    if (Object.keys(updates).length > 0) {
      await supabase.from('shots').update(updates).in('id', ids);
    }

    if (bulkTag && bulkTag !== '') {
      // Fetch current shots to merge tags
      const { data: currentShots } = await supabase.from('shots').select('id, tags').in('id', ids);
      if (currentShots) {
        for (const cs of currentShots) {
          const currentTags: string[] = cs.tags || [];
          if (!currentTags.includes(bulkTag)) {
            await supabase.from('shots').update({ tags: [...currentTags, bulkTag] }).eq('id', cs.id);
          }
        }
      }
    }

    setBulkTarget('');
    setBulkTag('');
    setBulkFullShot(null);
    setSelected(new Set());
    setSaving(false);
    onUpdate();
  };

  return (
    <div className="space-y-3">
      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="text-sm text-gray-400 mb-2">
            {selected.size} shot{selected.size > 1 ? 's' : ''} selected — Bulk Edit:
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target (yd)</label>
              <input
                type="text"
                value={bulkTarget}
                onChange={(e) => setBulkTarget(e.target.value)}
                placeholder="e.g., 150"
                className="w-24 px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setBulkFullShot(true)}
                  className={`px-2 py-1 text-xs rounded ${bulkFullShot === true ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                >
                  Full
                </button>
                <button
                  onClick={() => setBulkFullShot(false)}
                  className={`px-2 py-1 text-xs rounded ${bulkFullShot === false ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                >
                  Partial
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Add Tag</label>
              <select
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                className="px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-white"
              >
                <option value="">—</option>
                {TAG_PRESETS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              onClick={bulkApply}
              disabled={saving}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Quick preset buttons */}
      {selected.size > 0 && (
        <div className="flex gap-2">
          <span className="text-xs text-gray-500 self-center">Quick:</span>
          {[
            { label: 'Mark Full', action: () => { setBulkFullShot(true); } },
            { label: 'Mark 3/4', action: () => { setBulkFullShot(false); setBulkTag('3/4'); } },
            { label: 'Mark Half', action: () => { setBulkFullShot(false); setBulkTag('Half'); } },
            { label: 'Mark Chip', action: () => { setBulkFullShot(false); setBulkTag('Chip'); } },
          ].map((p) => (
            <button
              key={p.label}
              onClick={p.action}
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
              <th className="p-2 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === shots.length && shots.length > 0}
                  onChange={selectAll}
                  className="accent-green-500"
                />
              </th>
              <th className="p-2 text-left">Club</th>
              <th className="p-2 text-right">Carry</th>
              <th className="p-2 text-right">Lateral</th>
              <th className="p-2 text-right hidden sm:table-cell">Total</th>
              <th className="p-2 text-center hidden md:table-cell">Full</th>
              <th className="p-2 text-right hidden md:table-cell">Target</th>
              <th className="p-2 text-left hidden lg:table-cell">Tags</th>
              <th className="p-2 text-left hidden lg:table-cell">Notes</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shots.map((shot) => (
              <tr
                key={shot.id}
                className={`border-b border-gray-800/50 hover:bg-gray-900/50 ${
                  selected.has(shot.id) ? 'bg-gray-800/30' : ''
                }`}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.has(shot.id)}
                    onChange={() => toggleSelect(shot.id)}
                    className="accent-green-500"
                  />
                </td>
                <td className="p-2 text-gray-200 font-medium">{shot.club_name}</td>
                <td className="p-2 text-right text-gray-300">{shot.carry_distance_yd.toFixed(1)}</td>
                <td className="p-2 text-right">
                  <span className={shot.carry_lateral_yd > 2 ? 'text-yellow-400' : shot.carry_lateral_yd < -2 ? 'text-blue-400' : 'text-gray-400'}>
                    {shot.carry_lateral_yd > 0 ? '+' : ''}{shot.carry_lateral_yd.toFixed(1)}
                    {shot.carry_lateral_yd > 0 ? ' R' : shot.carry_lateral_yd < 0 ? ' L' : ''}
                  </span>
                </td>
                <td className="p-2 text-right text-gray-300 hidden sm:table-cell">{shot.total_distance_yd.toFixed(1)}</td>
                {editingId === shot.id ? (
                  <>
                    <td className="p-2 text-center hidden md:table-cell">
                      <input
                        type="checkbox"
                        checked={editValues.is_full_shot ?? true}
                        onChange={(e) => setEditValues({ ...editValues, is_full_shot: e.target.checked })}
                        className="accent-green-500"
                      />
                    </td>
                    <td className="p-2 hidden md:table-cell">
                      <input
                        type="number"
                        value={editValues.target_distance_yd ?? ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            target_distance_yd: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        className="w-16 px-1 py-0.5 text-sm bg-gray-900 border border-gray-600 rounded text-white text-right"
                      />
                    </td>
                    <td className="p-2 hidden lg:table-cell">
                      <input
                        type="text"
                        value={(editValues.tags ?? []).join(', ')}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                          })
                        }
                        className="w-24 px-1 py-0.5 text-sm bg-gray-900 border border-gray-600 rounded text-white"
                        placeholder="tag1, tag2"
                      />
                    </td>
                    <td className="p-2 hidden lg:table-cell">
                      <input
                        type="text"
                        value={editValues.notes ?? ''}
                        onChange={(e) => setEditValues({ ...editValues, notes: e.target.value || null })}
                        className="w-24 px-1 py-0.5 text-sm bg-gray-900 border border-gray-600 rounded text-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={saveEdit} disabled={saving} className="text-green-400 hover:text-green-300 text-xs mr-2">
                        Save
                      </button>
                      <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-300 text-xs">
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 text-center hidden md:table-cell">
                      {shot.is_full_shot ? (
                        <span className="text-green-400 text-xs">Full</span>
                      ) : (
                        <span className="text-yellow-400 text-xs">Partial</span>
                      )}
                    </td>
                    <td className="p-2 text-right text-gray-400 hidden md:table-cell">
                      {shot.target_distance_yd ?? '—'}
                    </td>
                    <td className="p-2 text-gray-500 text-xs hidden lg:table-cell">
                      {shot.tags.length > 0 ? shot.tags.join(', ') : '—'}
                    </td>
                    <td className="p-2 text-gray-500 text-xs truncate max-w-[100px] hidden lg:table-cell">
                      {shot.notes ?? '—'}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => startEdit(shot)}
                        className="text-gray-500 hover:text-white text-xs"
                      >
                        Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shots.length === 0 && (
        <div className="text-center text-gray-600 py-8">No shots to display</div>
      )}
    </div>
  );
}
