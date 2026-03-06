'use client';

import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { useScoringSettings } from '@/lib/practice/hooks';
import { DEFAULT_SCORING, expectedStrokes } from '@/lib/practice/scoring';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Nav />
      <ScoringSettings />
    </AuthGuard>
  );
}

function ScoringSettings() {
  const { settings, setSettings, resetSettings } = useScoringSettings();

  const update = (key: string, value: number | boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  const inputCls = 'w-24 bg-gray-800 border-0 rounded-xl px-4 py-3 text-[15px] text-gray-50 text-center focus:outline-none focus:ring-2 focus:ring-green-500/40';

  // Preview scoring for reference
  const previewDistances = [30, 50, 75, 100, 150];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-2">Scoring Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tune the strokes-gained scoring model. Changes apply to all future practice sessions.
      </p>

      <div className="space-y-6">
        {/* Lateral penalties */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-50 mb-3">Lateral Penalty Factors</h3>
          <p className="text-xs text-gray-500 mb-4">
            How much lateral miss counts relative to distance miss. Higher = lateral misses penalized more.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Wedge Lateral Penalty</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="3"
                value={settings.wedgeLateralPenalty}
                onChange={(e) => update('wedgeLateralPenalty', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
              <p className="text-[10px] text-gray-600 mt-1">Default: {DEFAULT_SCORING.wedgeLateralPenalty}</p>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Swing Lateral Penalty</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="3"
                value={settings.fullSwingLateralPenalty}
                onChange={(e) => update('fullSwingLateralPenalty', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
              <p className="text-[10px] text-gray-600 mt-1">Default: {DEFAULT_SCORING.fullSwingLateralPenalty}</p>
            </div>
          </div>
        </div>

        {/* Points scaling */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-50 mb-3">Points Scaling</h3>
          <p className="text-xs text-gray-500 mb-4">
            Controls how strokes gained translates to points. Points = clamp((SG + offset) &times; scale, min, max).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">SG Offset</label>
              <input
                type="number"
                step="0.05"
                value={settings.sgOffset}
                onChange={(e) => update('sgOffset', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
              <p className="text-[10px] text-gray-600 mt-1">Default: {DEFAULT_SCORING.sgOffset}</p>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Points Scale</label>
              <input
                type="number"
                step="10"
                value={settings.pointsScale}
                onChange={(e) => update('pointsScale', parseInt(e.target.value) || 100)}
                className={inputCls}
              />
              <p className="text-[10px] text-gray-600 mt-1">Default: {DEFAULT_SCORING.pointsScale}</p>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Min Points</label>
              <input
                type="number"
                value={settings.minPoints}
                onChange={(e) => update('minPoints', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
              <p className="text-[10px] text-gray-600 mt-1">Default: {DEFAULT_SCORING.minPoints}</p>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Max Points</label>
              <input
                type="number"
                value={settings.maxPoints}
                onChange={(e) => update('maxPoints', parseInt(e.target.value) || 300)}
                className={inputCls}
              />
              <p className="text-[10px] text-gray-600 mt-1">Default: {DEFAULT_SCORING.maxPoints}</p>
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-50 mb-3">Scoring Mode</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.accuracyOnlyMode}
              onChange={(e) => update('accuracyOnlyMode', e.target.checked)}
              className="accent-green-500 w-4 h-4"
            />
            <div>
              <span className="text-sm text-gray-300">Accuracy-only mode</span>
              <p className="text-xs text-gray-500">Only distance error counts -- lateral misses are ignored.</p>
            </div>
          </label>
        </div>

        {/* Expected strokes reference */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-gray-50 mb-3">Expected Strokes Model</h3>
          <p className="text-xs text-gray-500 mb-3">
            Reference: expected strokes to hole out from each distance. Used as the baseline for SG calculations.
          </p>
          <div className="grid grid-cols-5 gap-2 text-center">
            {previewDistances.map((d) => (
              <div key={d}>
                <div className="text-xs text-gray-500">{d} yds</div>
                <div className="text-sm text-gray-50 font-mono">{expectedStrokes(d).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={resetSettings}
            className="px-4 py-3 text-sm bg-gray-900 text-gray-400 rounded-2xl hover:bg-gray-800"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
