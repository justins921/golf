'use client';

import { useState, useMemo } from 'react';
import Nav from '@/components/Nav';
import AuthGuard from '@/components/AuthGuard';
import { computePlaysLike, type PlaysLikeInput } from '@/lib/environment';

export default function CalculatorPage() {
  return (
    <AuthGuard>
      <Nav />
      <PlaysLikeCalculator />
    </AuthGuard>
  );
}

function PlaysLikeCalculator() {
  const [yardage, setYardage] = useState(150);
  const [elevationChange, setElevationChange] = useState(0);
  const [wind, setWind] = useState(0);
  const [temperature, setTemperature] = useState(72);
  const [humidity, setHumidity] = useState(50);
  const [elevation, setElevation] = useState(0);

  const result = useMemo(() => {
    const input: PlaysLikeInput = {
      yardage,
      elevationChangeFt: elevationChange,
      windMph: wind,
      temperatureF: temperature,
      relativeHumidityPct: humidity,
      elevationFt: elevation,
    };
    return computePlaysLike(input);
  }, [yardage, elevationChange, wind, temperature, humidity, elevation]);

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-[28px] font-bold text-gray-50 tracking-tight mb-2">Plays-Like Calculator</h1>
      <p className="text-sm text-gray-500 mb-6">
        Estimate how a yardage plays based on conditions. Separate from dispersion stats — for on-course planning.
      </p>

      <div className="bg-gray-900 rounded-2xl p-6 space-y-4">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Actual Yardage</label>
            <input
              type="number"
              value={yardage}
              onChange={(e) => setYardage(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-50 text-lg font-medium"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Elevation Change (ft)</label>
            <input
              type="number"
              value={elevationChange}
              onChange={(e) => setElevationChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-50"
              placeholder="+ uphill, - downhill"
            />
            <p className="text-[10px] text-gray-600 mt-0.5">Positive = uphill, negative = downhill</p>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Wind (mph)</label>
            <input
              type="number"
              value={wind}
              onChange={(e) => setWind(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-50"
              placeholder="+ headwind, - tailwind"
            />
            <p className="text-[10px] text-gray-600 mt-0.5">Positive = headwind, negative = tailwind</p>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Temperature (°F)</label>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value) || 72)}
              className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-50"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Humidity (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={humidity}
              onChange={(e) => setHumidity(parseFloat(e.target.value) || 50)}
              className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-50"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Course Elevation (ft)</label>
            <input
              type="number"
              value={elevation}
              onChange={(e) => setElevation(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800/60 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-green-500/30 text-gray-50"
            />
          </div>
        </div>

        {/* Result */}
        <div className="border-t border-gray-800/60 pt-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Plays like</p>
            <p className="text-4xl font-bold text-green-400">{result.playsLikeYardage}</p>
            <p className="text-sm text-gray-500">yards</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-800 rounded-xl p-2">
              <span className="text-gray-500">Elevation effect:</span>
              <span className={`ml-1 ${result.elevationEffect > 0 ? 'text-red-400' : result.elevationEffect < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {result.elevationEffect > 0 ? '+' : ''}{result.elevationEffect} yd
              </span>
            </div>
            <div className="bg-gray-800 rounded-xl p-2">
              <span className="text-gray-500">Wind effect:</span>
              <span className={`ml-1 ${result.windEffect > 0 ? 'text-red-400' : result.windEffect < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {result.windEffect > 0 ? '+' : ''}{result.windEffect} yd
              </span>
            </div>
            <div className="bg-gray-800 rounded-xl p-2">
              <span className="text-gray-500">Altitude effect:</span>
              <span className={`ml-1 ${result.altitudeEffect > 0 ? 'text-green-400' : result.altitudeEffect < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {result.altitudeEffect > 0 ? '+' : ''}{result.altitudeEffect} yd
              </span>
            </div>
            <div className="bg-gray-800 rounded-xl p-2">
              <span className="text-gray-500">Temp effect:</span>
              <span className={`ml-1 ${result.tempEffect > 0 ? 'text-green-400' : result.tempEffect < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {result.tempEffect > 0 ? '+' : ''}{result.tempEffect} yd
              </span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-600 text-center">
          This is an approximation. Elevation: ~1 yd per 3 ft. Wind: ~1% per mph. Altitude &amp; temp via air density model.
        </p>
      </div>
    </div>
  );
}
