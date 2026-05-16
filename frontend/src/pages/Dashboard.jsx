import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/context';
import { farms, ndvi, weather, soil, alerts, recommendations, analyze } from '../services/api';
import FarmSatelliteMap from '../components/Dashboard/FarmSatelliteMap';
import HistoryChart from '../components/Dashboard/HistoryChart';
import FarmSelector from '../components/FarmSelector';
import { Refresh, Sparkles, Satellite, Sprout, Cloud, AlertTriangle, X } from '../components/icons';
import {
  getCachedAnalysis,
  setCachedAnalysis,
  invalidateAnalysisCache,
  getSelectedFarmId,
  setSelectedFarmId,
} from '../services/analysisCache';

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const STATUS_COLORS = {
  healthy:  'bg-emerald-500',
  moderate: 'bg-amber-400',
  stressed: 'bg-orange-500',
  critical: 'bg-rose-500',
};

const DECISION_LABEL = {
  HEALTHY: 'Healthy',
  URGENT_IRRIGATION: 'Urgent irrigation',
  IRRIGATE_SOON: 'Irrigate soon',
  MONITOR_WATER: 'Monitor water',
  HEAT_PROTECTION: 'Heat protection',
  INVESTIGATE: 'Investigate',
};

function Card({ title, children, className = '' }) {
  return (
    <section className={`bg-white rounded-2xl border border-farm-100 shadow-sm p-4 ${className}`}>
      {title && (
        <h2 className="text-[10px] uppercase tracking-widest text-farm-400 font-semibold mb-3">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-farm-400">{label}</span>
      <span className="text-agri-800 font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ZoneRow({ count, label, color }) {
  if (!count && count !== 0) return null;
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-farm-500 uppercase tracking-wide text-[10px]">{label}</span>
      </div>
      <span className="text-agri-800 font-semibold tabular-nums">{count}</span>
    </div>
  );
}

export default function Dashboard() {
  const { isRTL } = useLanguage();
  const [farmsList, setFarmsList] = useState([]);
  const [selectedFarmId, setSelectedFarmIdState] = useState(() => getSelectedFarmId());
  const [farm, setFarm] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  const [alertList, setAlertList] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [historyData, setHistoryData] = useState(null);

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

  useEffect(() => {
    if (!selectedFarmId || !farmsList.length) return;
    const currentFarm = farmsList.find((f) => f.id === selectedFarmId);
    if (!currentFarm) return;

    setFarm(currentFarm);
    setAnalysis(null);
    setAnalysisError('');
    setForecast(null);
    setLoading(true);

    // Derive lat/lng from polygon if not stored on the farm
    let lat = currentFarm.latitude;
    let lng = currentFarm.longitude;
    if ((lat == null || lng == null) && currentFarm.polygon) {
      const ring = currentFarm.polygon.coordinates?.[0]
        || currentFarm.polygon.geometry?.coordinates?.[0];
      if (ring?.length) {
        const lats = ring.map((p) => p[1]);
        const lngs = ring.map((p) => p[0]);
        lat = lats.reduce((a, b) => a + b, 0) / lats.length;
        lng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      }
    }

    (async () => {
      try {
        const [ndviResult, alertResult, , soilResult, histResult] = await Promise.allSettled([
          ndvi.get(currentFarm.id).catch(() => null),
          alerts.list(currentFarm.id).catch(() => []),
          recommendations.get(currentFarm.id).catch(() => []),
          soil.get(currentFarm.id).catch(() => null),
          ndvi.history(currentFarm.id).catch(() => null),
        ]);
        if (ndviResult.status === 'fulfilled') setNdviData(ndviResult.value);
        if (alertResult.status === 'fulfilled') setAlertList(alertResult.value);
        if (soilResult.status === 'fulfilled') setSoilData(soilResult.value);
        if (histResult.status === 'fulfilled') setHistoryData(histResult.value);

        if (lat != null && lng != null) {
          weather.forecast(lat, lng)
            .then(setForecast)
            .catch((err) => console.warn('Forecast failed:', err.message));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedFarmId, farmsList]);

  const runAnalysis = useCallback(async (force = false) => {
    if (!farm) return;
    if (!force) {
      const cached = getCachedAnalysis(farm.id);
      if (cached) { setAnalysis(cached); return; }
    } else {
      invalidateAnalysisCache(farm.id);
    }
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const result = await analyze.run(farm.id);
      setAnalysis(result);
      setCachedAnalysis(farm.id, result);
    } catch (err) {
      setAnalysisError(err.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  }, [farm]);

  useEffect(() => {
    if (farm && !analysis && !analysisLoading) runAnalysis();
  }, [farm, analysis, analysisLoading, runAnalysis]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-farm-400 text-sm tracking-widest uppercase">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-rose-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-agri-50 flex items-center justify-center mb-4">
            <Sprout size={28} className="text-agri-500" />
          </div>
          <h2 className="text-xl font-bold text-agri-900 mb-2">Welcome to AgriCopilot</h2>
          <p className="text-farm-400 text-sm mb-6">Set up your farm profile to get started.</p>
          <Link to="/register" className="inline-block px-6 py-2.5 bg-agri-500 text-white rounded-xl text-sm font-semibold hover:bg-agri-400 transition shadow-md">
            Set up your farm
          </Link>
        </div>
      </div>
    );
  }

  const ndviVal = ndviData?.ndvi ?? soilData?.ndvi;
  const soilMoisture = soilData?.soil_moisture ?? ndviData?.soil_moisture;
  const temp = soilData?.soil_temperature ?? ndviData?.temperature;

  const summary = analysis?.summary;
  const zones = analysis?.zones;
  const farmContext = analysis?.farm_context;
  const stats = analysis?.statistics;
  const pixels = analysis?.pixels;
  const farmPolygon = farm?.polygon;
  const farmCenter = farm?.latitude ? [farm.latitude, farm.longitude] : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FarmSelector
            farms={farmsList}
            selectedId={selectedFarmId}
            onSelect={(id) => { setSelectedFarmIdState(id); setSelectedFarmId(id); }}
            onAdd={(created) => {
              setFarmsList((prev) => [...prev, created]);
              setSelectedFarmIdState(created.id);
              setSelectedFarmId(created.id);
            }}
            theme="light"
          />
          {analysis?.satellite_date && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-farm-500 bg-white px-2.5 py-1 rounded-lg border border-farm-100">
              <Satellite size={12} className="text-agri-500" />
              Sentinel-2 · {new Date(analysis.satellite_date).toLocaleDateString()}
            </span>
          )}
        </div>
        <button
          onClick={() => runAnalysis(true)}
          disabled={analysisLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-agri-500 hover:bg-agri-400 disabled:bg-farm-200 disabled:text-farm-400 text-white text-xs font-semibold rounded-xl transition shadow-sm"
        >
          {analysisLoading ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Refresh size={13} />
              {analysis ? 'Re-analyze' : 'Analyze farm'}
            </>
          )}
        </button>
      </div>

      {analysisError && (
        <div className="flex items-start justify-between gap-3 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <div className="flex items-start gap-2 flex-1">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <span><span className="font-semibold">Analysis failed:</span> {analysisError}</span>
          </div>
          <button onClick={() => setAnalysisError('')} className="text-rose-400 hover:text-rose-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main: left column (map + advisor + history + actions + forecast) + right side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5 min-w-0">
        <div className="rounded-2xl bg-white border border-farm-100 shadow-sm overflow-hidden relative h-[520px]">
          {analysis ? (
            <FarmSatelliteMap
              heatmapUrls={analysis?.imagery?.heatmap}
              pixels={pixels}
              farmPolygon={farmPolygon}
              farmCenter={farmCenter}
              satelliteDate={analysis?.satellite_date}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-farm-50">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-white border border-farm-100 flex items-center justify-center mb-3 shadow-sm">
                  <Satellite size={32} className="text-agri-500" />
                </div>
                <p className="text-agri-800 text-sm font-semibold">{farm.name}</p>
                <p className="text-farm-400 text-xs mt-1">
                  {farm.size || '—'} · {farm.crops?.join(', ') || 'No crops'} · {farm.custom_area || '—'} ha
                </p>
                <div className="flex gap-4 justify-center mt-3 text-xs text-farm-500">
                  <span>NDVI: <span className="text-agri-700 font-semibold">{ndviVal != null ? ndviVal.toFixed(2) : '—'}</span></span>
                  <span>Moisture: <span className="text-agri-700 font-semibold">{soilMoisture != null ? Math.round(soilMoisture * 100) + '%' : '—'}</span></span>
                  <span>Temp: <span className="text-agri-700 font-semibold">{temp != null ? temp + '°' : '—'}</span></span>
                </div>
                <button
                  onClick={() => runAnalysis()}
                  disabled={analysisLoading}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-agri-500 hover:bg-agri-400 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  <Sparkles size={14} />
                  Run satellite analysis
                </button>
              </div>
            </div>
          )}
          {analysisLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-[2000]">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto border-2 border-agri-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-3 text-xs text-farm-500">Processing satellite data…</p>
              </div>
            </div>
          )}
        </div>

        {analysis?.narrative && (
          <Card title="AI advisor">
            <p className="text-sm text-agri-800 leading-relaxed whitespace-pre-line">
              {analysis.narrative}
            </p>
          </Card>
        )}

        {zones?.filter((z) => z.action).length > 0 && (
          <Card title="Zone actions">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {zones.filter((z) => z.action).map((z) => (
                <div key={z.zone_id} className="min-w-[170px] bg-farm-50 border border-farm-100 rounded-xl p-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[z.status] || STATUS_COLORS.moderate}`} />
                    <span className="text-[11px] text-agri-800 font-mono font-semibold">Zone {z.zone_id}</span>
                    <span className="text-[10px] text-farm-400">({z.position})</span>
                  </div>
                  <div className="text-sm text-agri-900 font-bold">{z.action.amount_liters.toLocaleString()} L</div>
                  <div className="text-[10px] text-farm-500">{z.action.timing === 'before_7am' ? 'Before 7am' : 'Within 24h'}</div>
                  <div className="text-[10px] text-farm-400 mt-1">NDVI: {z.metrics?.ndvi_mean?.toFixed(2)} · NDWI: {z.metrics?.ndwi_mean?.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {historyData?.length > 0 && (
          <Card title="Historical NDVI">
            <HistoryChart data={historyData} dataKey="ndvi" label="NDVI (12 weeks)" color="#40916c" />
            <div className="mt-3 pt-3 border-t border-farm-100">
              <p className="text-[10px] uppercase tracking-widest text-farm-400 font-semibold mb-2">Historical NDWI</p>
              <HistoryChart data={historyData} dataKey="ndwi" label="NDWI (12 weeks)" color="#3b82f6" />
            </div>
          </Card>
        )}

        <Card title="7-day forecast">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(forecast || Array(7).fill(null)).map((day, i) => (
              <div key={i} className={`min-w-[90px] rounded-xl p-2.5 text-center flex-shrink-0 border ${
                i === 0 ? 'border-agri-400 bg-agri-50' : 'border-farm-100 bg-farm-50'
              }`}>
                <div className="text-[10px] text-farm-500 mb-1">{day ? daysFromNow(i) : '—'}</div>
                <Cloud size={20} className="mx-auto text-agri-400 mb-1" strokeWidth={1.5} />
                <div className="text-[10px] text-farm-500 mb-1">{day ? (day.rain > 0 ? 'Rain' : 'Clear') : '—'}</div>
                <div className="text-sm text-agri-900 font-bold">{day ? Math.round(day.temp) + '°' : '—'}</div>
                <div className="mt-1.5 h-1 bg-farm-100 rounded-full overflow-hidden">
                  <div className="h-full bg-agri-400 rounded-full" style={{ width: day ? `${day.humidity}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {stats && (
            <Card title="Satellite data">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-farm-500 uppercase mb-1.5">NDVI · vegetation</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <StatRow label="Mean" value={stats.ndvi.mean ?? '—'} />
                    <StatRow label="Min" value={stats.ndvi.min ?? '—'} />
                    <StatRow label="Max" value={stats.ndvi.max ?? '—'} />
                    <StatRow label="Std" value={stats.ndvi.std ?? '—'} />
                  </div>
                </div>
                <div className="pt-3 border-t border-farm-100">
                  <p className="text-[10px] font-semibold text-farm-500 uppercase mb-1.5">NDWI · water</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <StatRow label="Mean" value={stats.ndwi.mean ?? '—'} />
                    <StatRow label="Min" value={stats.ndwi.min ?? '—'} />
                    <StatRow label="Max" value={stats.ndwi.max ?? '—'} />
                    <StatRow label="Std" value={stats.ndwi.std ?? '—'} />
                  </div>
                </div>
                <div className="pt-3 border-t border-farm-100 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <StatRow label="Resolution" value="10 m/px" />
                  <StatRow label="Pixels" value={stats.ndvi.count ?? 0} />
                </div>
              </div>
            </Card>
          )}

          {summary && (
            <Card title="Zone analysis">
              <ZoneRow count={summary.healthy} label="Healthy" color={STATUS_COLORS.healthy} />
              <ZoneRow count={summary.moderate} label="Moderate" color={STATUS_COLORS.moderate} />
              <ZoneRow count={summary.stressed} label="Stressed" color={STATUS_COLORS.stressed} />
              <ZoneRow count={summary.critical} label="Critical" color={STATUS_COLORS.critical} />
              {summary.priority_action && (
                <div className="text-[11px] text-farm-500 mt-3 pt-3 border-t border-farm-100">
                  Priority: <span className="text-agri-800 font-semibold">{summary.priority_action}</span>
                </div>
              )}
              {summary.total_water_needed_liters > 0 && (
                <div className="text-[11px] text-farm-500 mt-1">
                  Water needed: <span className="text-agri-800 font-semibold">{(summary.total_water_needed_liters / 1000).toFixed(1)}k L</span>
                </div>
              )}
            </Card>
          )}

          <Card title="Current weather">
            {forecast?.[0] ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-3xl font-light text-agri-900">{Math.round(forecast[0].temp)}°</div>
                    <div className="text-xs text-farm-500 mt-1">
                      {forecast[0].rain > 0 ? 'Light rain' : 'Clear sky'}
                    </div>
                  </div>
                  <Cloud size={32} className="text-agri-400" strokeWidth={1.5} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-farm-50 rounded-lg p-2">
                    <div className="text-[10px] text-farm-400">Humidity</div>
                    <div className="text-sm text-agri-800 font-semibold">{forecast[0].humidity}%</div>
                  </div>
                  <div className="bg-farm-50 rounded-lg p-2">
                    <div className="text-[10px] text-farm-400">Rain</div>
                    <div className="text-sm text-agri-800 font-semibold">{Math.round(forecast[0].rain * 100)}%</div>
                  </div>
                </div>
              </>
            ) : farmContext ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-3xl font-light text-agri-900">{Math.round(farmContext.air_temperature)}°</div>
                    <div className="text-xs text-farm-500 mt-1">Open-Meteo</div>
                  </div>
                  <Cloud size={32} className="text-agri-400" strokeWidth={1.5} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-farm-50 rounded-lg p-2">
                    <div className="text-[10px] text-farm-400">Rain 3d</div>
                    <div className="text-sm text-agri-800 font-semibold">{farmContext.rain_3d_mm} mm</div>
                  </div>
                  <div className="bg-farm-50 rounded-lg p-2">
                    <div className="text-[10px] text-farm-400">ET₀</div>
                    <div className="text-sm text-agri-800 font-semibold">{farmContext.et0_mm_per_day} mm/d</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-farm-400">No weather data</div>
            )}
          </Card>

          <Card title="Soil data">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-farm-400">Moisture</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-farm-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-400 rounded-full" style={{ width: `${(soilMoisture || 0) * 100}%` }} />
                  </div>
                  <span className="text-agri-800 font-semibold w-9 text-right">{soilMoisture != null ? Math.round(soilMoisture * 100) + '%' : '—'}</span>
                </div>
              </div>
              <StatRow label="Temperature" value={temp != null ? temp + '°C' : '—'} />
              {soilData?.ph != null && <StatRow label="pH level" value={soilData.ph} />}
              {soilData?.nitrogen != null && <StatRow label="Nitrogen (N)" value={`${soilData.nitrogen} kg/ha`} />}
              {soilData?.phosphorus != null && <StatRow label="Phosphorus (P)" value={`${soilData.phosphorus} mg/kg`} />}
              {soilData?.potassium != null && <StatRow label="Potassium (K)" value={`${soilData.potassium} mg/kg`} />}
              {soilData?.organic_matter != null && <StatRow label="Organic matter" value={`${soilData.organic_matter}%`} />}
              {soilData?.soil_type && <StatRow label="Soil type" value={soilData.soil_type} />}
            </div>
          </Card>

          {zones && (
            <Card title="Zone details">
              <div className="space-y-1">
                {zones.map((z) => (
                  <div key={z.zone_id} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[z.status] || STATUS_COLORS.healthy}`} />
                      <span className="text-agri-800 font-mono font-semibold w-3">{z.zone_id}</span>
                      <span className="text-farm-400">{z.position}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-agri-700 font-medium">{DECISION_LABEL[z.decision] || z.decision}</span>
                      <div className="text-[9px] text-farm-400">NDVI {z.metrics?.ndvi_mean?.toFixed(2)} · {z.metrics?.pixel_count}px</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {alertList.length > 0 && (
            <Card title="Alerts">
              <div className="space-y-1.5">
                {alertList.slice(0, 3).map((a, i) => (
                  <div key={i} className={`text-xs px-3 py-2 rounded-lg flex items-start gap-2 ${
                    a.severity === 'high' ? 'bg-rose-50 text-rose-700' :
                    a.severity === 'moderate' ? 'bg-amber-50 text-amber-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}
