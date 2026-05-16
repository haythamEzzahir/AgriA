import React, { useState, useEffect } from 'react';
import FarmMap from '../components/Map/FarmMap';
import { farms, analyze } from '../services/api';

export default function MapView() {
  const [farm, setFarm] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState('');
  const [layer, setLayer] = useState('ndvi');
  const [opacity, setOpacity] = useState(0.7);

  useEffect(() => {
    (async () => {
      try {
        const list = await farms.list();
        if (!list?.length) { setLoading(false); return; }
        const current = list[0];
        setFarm(current);
        setAnalysisLoading(true);
        try {
          const result = await analyze.run(current.id);
          setAnalysis(result);
        } catch (err) {
          setError(err.message || 'Analysis failed');
        } finally {
          setAnalysisLoading(false);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-agri-500 text-sm tracking-widest uppercase">Loading map…</p>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <span className="text-5xl block mb-4">🗺️</span>
          <p className="text-agri-500 text-sm">Set up a farm first to see it on the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 h-[calc(100vh-2.5rem)] relative bg-slate-950">
      <FarmMap farm={farm} analysis={analysis} layer={layer} opacity={opacity} />

      {/* Analyzing overlay */}
      {analysisLoading && (
        <div className="pointer-events-none absolute inset-0 z-[600] flex items-center justify-center">
          <div className="rounded-md border border-emerald-400/30 bg-slate-950/85 px-5 py-3 text-sm font-semibold text-emerald-100 shadow-2xl backdrop-blur">
            <span className="inline-block w-3 h-3 mr-2 align-middle border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
            Analyzing satellite imagery…
          </div>
        </div>
      )}

      {/* Floating control panel */}
      <section className="absolute top-4 right-4 z-[700] w-[min(20rem,calc(100%-2rem))] rounded-md border border-white/15 bg-slate-950/90 text-white p-4 shadow-2xl backdrop-blur">
        <div className="mb-3">
          <h2 className="text-sm font-bold">{farm.name}</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {analysis?.satellite_date
              ? `Sentinel-2 · ${new Date(analysis.satellite_date).toLocaleDateString()}`
              : 'Waiting for satellite data…'}
          </p>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Raster layer</span>
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
          >
            <option value="ndvi">NDVI — Vegetation</option>
            <option value="ndwi">NDWI — Water</option>
          </select>
        </label>

        <label className="mt-4 block">
          <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
            <span className="text-slate-400">Opacity</span>
            <span className="text-slate-200">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.25"
            max="0.9"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </label>

        {analysis?.summary && (
          <div className="mt-4 pt-3 border-t border-white/10 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-400">Healthy zones</span><span className="text-emerald-400 font-semibold">{analysis.summary.healthy ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Moderate</span><span className="text-amber-300 font-semibold">{analysis.summary.moderate ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Stressed</span><span className="text-orange-400 font-semibold">{analysis.summary.stressed ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Critical</span><span className="text-red-400 font-semibold">{analysis.summary.critical ?? 0}</span></div>
          </div>
        )}
      </section>
    </div>
  );
}
