import React, { useState, useEffect, useCallback } from 'react';
import FarmMap from '../components/Map/FarmMap';
import FarmSelector from '../components/FarmSelector';
import { farms, analyze } from '../services/api';
import { Map as MapIcon, Refresh, Satellite, AlertTriangle } from '../components/icons';
import {
  getCachedAnalysis,
  setCachedAnalysis,
  invalidateAnalysisCache,
  getSelectedFarmId,
  setSelectedFarmId,
} from '../services/analysisCache';

export default function MapView() {
  const [farmsList, setFarmsList] = useState([]);
  const [selectedFarmId, setSelectedFarmIdState] = useState(() => getSelectedFarmId());
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
        setFarmsList(list || []);
        if (!list?.length) { setLoading(false); return; }
        const stored = getSelectedFarmId();
        const initial = (stored && list.find((f) => f.id === stored)) ? stored : list[0].id;
        setSelectedFarmIdState(initial);
        setSelectedFarmId(initial);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    })();
  }, []);

  const runAnalysis = useCallback(async (farmId, force = false) => {
    if (!farmId) return;
    if (!force) {
      const cached = getCachedAnalysis(farmId);
      if (cached) { setAnalysis(cached); return; }
    } else {
      invalidateAnalysisCache(farmId);
    }
    setAnalysisLoading(true);
    setError('');
    try {
      const result = await analyze.run(farmId);
      setAnalysis(result);
      setCachedAnalysis(farmId, result);
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedFarmId || !farmsList.length) return;
    const current = farmsList.find((f) => f.id === selectedFarmId);
    if (!current) return;
    setFarm(current);
    setAnalysis(null);
    setLoading(false);
    runAnalysis(current.id, false);
  }, [selectedFarmId, farmsList, runAnalysis]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-farm-400 text-sm tracking-widest uppercase">Loading map…</p>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-agri-50 flex items-center justify-center mb-4">
            <MapIcon size={28} className="text-agri-500" />
          </div>
          <p className="text-farm-500 text-sm mb-4">Set up a farm first to see it on the map.</p>
          <FarmSelector
            farms={farmsList}
            selectedId={selectedFarmId}
            onSelect={(id) => { setSelectedFarmIdState(id); setSelectedFarmId(id); }}
            onAdd={(created) => {
              setFarmsList((prev) => [...prev, created]);
              setSelectedFarmIdState(created.id);
              setSelectedFarmId(created.id);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] relative bg-slate-950">
      <FarmMap farm={farm} analysis={analysis} layer={layer} opacity={opacity} />

      {analysisLoading && (
        <div className="pointer-events-none absolute inset-0 z-[600] flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-slate-950/85 px-5 py-3 text-sm font-semibold text-emerald-100 shadow-2xl backdrop-blur">
            <span className="w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
            Analyzing satellite imagery…
          </div>
        </div>
      )}

      <section className="absolute top-4 right-4 z-[700] w-[min(20rem,calc(100%-2rem))] rounded-2xl border border-white/15 bg-slate-950/90 text-white p-4 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <FarmSelector
              farms={farmsList}
              selectedId={selectedFarmId}
              onSelect={(id) => { setSelectedFarmIdState(id); setSelectedFarmId(id); }}
              onAdd={(created) => {
                setFarmsList((prev) => [...prev, created]);
                setSelectedFarmIdState(created.id);
                setSelectedFarmId(created.id);
              }}
              theme="dark"
            />
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
              <Satellite size={11} className="text-emerald-400" />
              {analysis?.satellite_date
                ? `Sentinel-2 · ${new Date(analysis.satellite_date).toLocaleDateString()}`
                : 'Waiting for satellite data…'}
            </p>
            {error && (
              <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-rose-300">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                {error}
              </p>
            )}
          </div>
          <button
            onClick={() => runAnalysis(farm.id, true)}
            disabled={analysisLoading}
            className="text-slate-400 hover:text-emerald-400 disabled:text-slate-600 transition"
            title="Re-analyze (bypass cache)"
          >
            <Refresh size={14} />
          </button>
        </div>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Raster layer</span>
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
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
