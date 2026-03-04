'use client';

import { useState } from 'react';
import type { EnvironmentConditions } from '@/lib/types';
import { computeAirDensity, computeDensityAltitude, STANDARD_CONDITIONS, DEFAULT_K } from '@/lib/environment';

interface Props {
  conditions: EnvironmentConditions | null;
  onSave: (conditions: EnvironmentConditions) => void;
  editable?: boolean;
}

export default function ConditionsPanel({ conditions, onSave, editable = true }: Props) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<EnvironmentConditions>(
    conditions ?? { elevationFt: 0, temperatureF: 72, relativeHumidityPct: 50 }
  );

  const rho = conditions ? computeAirDensity(conditions) : null;
  const rhoStd = computeAirDensity(STANDARD_CONDITIONS);
  const da = conditions ? computeDensityAltitude(conditions) : null;

  const handleSave = () => {
    onSave(values);
    setEditing(false);
  };

  if (!editing && !conditions) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">No environment data set</span>
          {editable && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-green-400 hover:text-green-300"
            >
              Set Conditions
            </button>
          )}
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-300">Environment Conditions</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Elevation (ft)</label>
            <input
              type="number"
              value={values.elevationFt}
              onChange={(e) => setValues({ ...values, elevationFt: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Temperature (°F)</label>
            <input
              type="number"
              value={values.temperatureF}
              onChange={(e) => setValues({ ...values, temperatureF: parseFloat(e.target.value) || 59 })}
              className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Humidity (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={values.relativeHumidityPct}
              onChange={(e) => setValues({ ...values, relativeHumidityPct: parseFloat(e.target.value) || 50 })}
              className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pressure (inHg, optional)</label>
            <input
              type="number"
              step="0.01"
              value={values.pressureInHg ?? ''}
              onChange={(e) =>
                setValues({ ...values, pressureInHg: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              placeholder="auto from elevation"
              className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-50"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 text-gray-50 rounded">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300">Environment</h3>
        {editable && (
          <button onClick={() => { setValues(conditions!); setEditing(true); }} className="text-xs text-green-400 hover:text-green-300">
            Edit
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-gray-500">Elevation</div>
        <div className="text-gray-300">{conditions!.elevationFt.toLocaleString()} ft</div>
        <div className="text-gray-500">Temperature</div>
        <div className="text-gray-300">{conditions!.temperatureF}°F</div>
        <div className="text-gray-500">Humidity</div>
        <div className="text-gray-300">{conditions!.relativeHumidityPct}%</div>
        {conditions!.pressureInHg && (
          <>
            <div className="text-gray-500">Pressure</div>
            <div className="text-gray-300">{conditions!.pressureInHg.toFixed(2)} inHg</div>
          </>
        )}
        {rho !== null && (
          <>
            <div className="text-gray-500">Air Density</div>
            <div className="text-gray-300">
              {rho.toFixed(4)} kg/m³
              <span className="text-gray-600 ml-1">
                ({((rho / rhoStd - 1) * 100).toFixed(1)}% vs std)
              </span>
            </div>
          </>
        )}
        {da !== null && (
          <>
            <div className="text-gray-500">Density Alt.</div>
            <div className="text-gray-300">{Math.round(da).toLocaleString()} ft</div>
          </>
        )}
      </div>
      <p className="text-[10px] text-gray-600 mt-2">
        Carry model: adjusted = observed × (ρ_obs / ρ_target)^{DEFAULT_K}. This is an estimate.
      </p>
    </div>
  );
}
