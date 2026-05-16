import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/context';
import { farms, ndvi, weather, soil, alerts, recommendations, analyze } from '../services/api';
import FarmSatelliteMap from '../components/Dashboard/FarmSatelliteMap';
import HistoryChart from '../components/Dashboard/HistoryChart';

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function StatusBadge({ count, label, color }) {
  if (!count && count !== 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-agri-400 text-xs">{count}</span>
      <span className="text-agri-500 text-[10px] uppercase">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const { t, isRTL } = useLanguage();
  const [farm, setFarm] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  const [alertList, setAlertList] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [crops, setCrops] = useState([]);
  const [soilData, setSoilData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forecastTab, setForecastTab] = useState('daily');
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [historyData, setHistoryData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const farmList = await farms.list();
        if (!farmList?.length) { setLoading(false); return; }

        const currentFarm = farmList[0];
        setFarm(currentFarm);

        const [ndviResult, alertResult, recResult, soilResult, histResult] = await Promise.allSettled([
          ndvi.get(currentFarm.id).catch(() => null),
          alerts.list(currentFarm.id).catch(() => []),
          recommendations.get(currentFarm.id).catch(() => []),
          soil.get(currentFarm.id).catch(() => null),
          ndvi.history(currentFarm.id).catch(() => null),
        ]);

        if (ndviResult.status === 'fulfilled') setNdviData(ndviResult.value);
        if (alertResult.status === 'fulfilled') setAlertList(alertResult.value);
        if (recResult.status === 'fulfilled') setCrops(recResult.value);
        if (soilResult.status === 'fulfilled') setSoilData(soilResult.value);
        if (histResult.status === 'fulfilled') setHistoryData(histResult.value);

        if (currentFarm.latitude && currentFarm.longitude) {
          weather.forecast(currentFarm.latitude, currentFarm.longitude)
            .then(setForecast)
            .catch(() => {});
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!farm) return;
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const result = await analyze.run(farm.id);
      setAnalysis(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      setAnalysisError(err.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  }, [farm]);

  useEffect(() => {
    if (farm && !analysis && !analysisLoading) {
      runAnalysis();
    }
  }, [farm, analysis, analysisLoading, runAnalysis]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '300px' }}>
        <p className="text-agri-500 text-sm tracking-widest uppercase">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height: '300px' }}>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="flex items-center justify-center" style={{ height: '300px' }}>
        <div className="text-center max-w-md">
          <span className="text-5xl block mb-4">🌾</span>
          <h2 className="text-xl font-bold text-agri-50 mb-2">Welcome to AgriCopilot</h2>
          <p className="text-agri-500 text-sm mb-6">Set up your farm profile to get started.</p>
          <Link to="/register" className="inline-block px-6 py-2.5 bg-agri-500 text-white rounded-lg text-sm font-medium hover:bg-agri-400 transition">
            Set Up Your Farm
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
    <div className="flex flex-col h-full gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-agri-50">{farm.name}</h1>
          {analysis?.satellite_date && (
            <span className="text-[10px] text-agri-500 bg-agri-800 px-2 py-0.5 rounded">
              🛰️ {new Date(analysis.satellite_date).toLocaleDateString()}
            </span>
          )}
        </div>
        <button
          onClick={runAnalysis}
          disabled={analysisLoading}
          className="px-3 py-1.5 bg-agri-600 hover:bg-agri-500 disabled:bg-agri-700 text-agri-200 text-xs rounded transition flex items-center gap-1.5"
        >
          {analysisLoading ? (
            <><span className="w-3 h-3 border border-agri-400 border-t-transparent rounded-full animate-spin" /> Analyzing...</>
          ) : (
            <>{analysis ? '🔄 Re-analyze' : '🚀 Analyze Farm'}</>
          )}
        </button>
      </div>

      {analysisError && (
        <div className="flex items-start justify-between gap-3 px-3 py-2 rounded bg-red-900/40 border border-red-700/60 text-red-200 text-xs">
          <div className="flex-1">
            <span className="font-medium">Analysis failed:</span> {analysisError}
          </div>
          <button
            onClick={() => setAnalysisError('')}
            className="text-red-300 hover:text-red-100 text-base leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Main content + Right panel */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Map */}
        <div className="flex-1 rounded-lg bg-agri-800 border border-agri-700 overflow-hidden relative">
          {analysis ? (
            <FarmSatelliteMap
              heatmapUrls={analysis?.imagery?.heatmap}
              pixels={pixels}
              farmPolygon={farmPolygon}
              farmCenter={farmCenter}
              satelliteDate={analysis?.satellite_date}
            />
          ) : (
            <>
              <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #1a2b1e 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #1a2b1e 40px)',
              }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-48 h-48 mx-auto rounded-full bg-agri-700/50 flex items-center justify-center mb-3">
                    <span className="text-6xl">🛰️</span>
                  </div>
                  <p className="text-agri-400 text-sm font-medium">{farm.name}</p>
                  <p className="text-agri-500 text-xs mt-1">
                    {farm.size} · {farm.crops?.join(', ') || 'No crops'} · {farm.custom_area || '—'} ha
                  </p>
                  <div className="flex gap-4 justify-center mt-3 text-xs text-agri-500">
                    <span>NDVI: <span className="text-agri-300 font-medium">{ndviVal != null ? ndviVal.toFixed(2) : '—'}</span></span>
                    <span>Moisture: <span className="text-agri-300 font-medium">{soilMoisture != null ? Math.round(soilMoisture * 100) + '%' : '—'}</span></span>
                    <span>Temp: <span className="text-agri-300 font-medium">{temp != null ? temp + '°' : '—'}</span></span>
                  </div>
                  <button
                    onClick={runAnalysis}
                    disabled={analysisLoading}
                    className="mt-4 px-4 py-2 bg-agri-500 text-white rounded text-xs font-medium hover:bg-agri-400 transition"
                  >
                    {analysisLoading ? 'Analyzing...' : '🚀 Run Satellite Analysis'}
                  </button>
                </div>
              </div>
            </>
          )}
          {analysisLoading && (
            <div className="absolute inset-0 bg-agri-900/60 flex items-center justify-center z-[2000]">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto border-2 border-agri-400 border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-xs text-agri-400">Processing satellite data...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Satellite Stats */}
          {stats && (
            <div className="bg-agri-800 border border-agri-700 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-3">Satellite Data</div>
              <div className="space-y-1.5">
                <div className="text-[9px] text-agri-500 font-medium mb-1">NDVI (Vegetation Health)</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  <span className="text-agri-500">Mean</span><span className="text-agri-200 text-right">{stats.ndvi.mean ?? '—'}</span>
                  <span className="text-agri-500">Min</span><span className="text-agri-200 text-right">{stats.ndvi.min ?? '—'}</span>
                  <span className="text-agri-500">Max</span><span className="text-agri-200 text-right">{stats.ndvi.max ?? '—'}</span>
                  <span className="text-agri-500">Median</span><span className="text-agri-200 text-right">{stats.ndvi.median ?? '—'}</span>
                  <span className="text-agri-500">Std Dev</span><span className="text-agri-200 text-right">{stats.ndvi.std ?? '—'}</span>
                  <span className="text-agri-500">Pixels</span><span className="text-agri-200 text-right">{stats.ndvi.count ?? 0}</span>
                </div>
                <div className="border-t border-agri-700 my-1.5" />
                <div className="text-[9px] text-agri-500 font-medium mb-1">NDWI (Water Content)</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  <span className="text-agri-500">Mean</span><span className="text-agri-200 text-right">{stats.ndwi.mean ?? '—'}</span>
                  <span className="text-agri-500">Min</span><span className="text-agri-200 text-right">{stats.ndwi.min ?? '—'}</span>
                  <span className="text-agri-500">Max</span><span className="text-agri-200 text-right">{stats.ndwi.max ?? '—'}</span>
                  <span className="text-agri-500">Median</span><span className="text-agri-200 text-right">{stats.ndwi.median ?? '—'}</span>
                  <span className="text-agri-500">Std Dev</span><span className="text-agri-200 text-right">{stats.ndwi.std ?? '—'}</span>
                  <span className="text-agri-500">Pixels</span><span className="text-agri-200 text-right">{stats.ndwi.count ?? 0}</span>
                </div>
                <div className="border-t border-agri-700 my-1.5" />
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  <span className="text-agri-500">Resolution</span><span className="text-agri-200 text-right">10 m/px</span>
                  <span className="text-agri-500">Satellite</span><span className="text-agri-200 text-right">Sentinel-2</span>
                  <span className="text-agri-500">Date</span><span className="text-agri-200 text-right">{analysis?.satellite_date ? new Date(analysis.satellite_date).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Zone Summary */}
          {summary && (
            <div className="bg-agri-800 border border-agri-700 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-3">Zone Analysis</div>
              <div className="space-y-1 mb-2">
                <StatusBadge count={summary.healthy} label="Healthy" color="bg-green-500" />
                <StatusBadge count={summary.moderate} label="Moderate" color="bg-yellow-500" />
                <StatusBadge count={summary.stressed} label="Stressed" color="bg-orange-500" />
                <StatusBadge count={summary.critical} label="Critical" color="bg-red-500" />
              </div>
              {summary.priority_action && (
                <div className="text-[10px] text-agri-400 mt-2 pt-2 border-t border-agri-700">
                  Priority: <span className="text-agri-200 font-medium">{summary.priority_action}</span>
                </div>
              )}
              {summary.total_water_needed_liters > 0 && (
                <div className="text-[10px] text-agri-400 mt-1">
                  Water needed: <span className="text-agri-200 font-medium">{(summary.total_water_needed_liters / 1000).toFixed(1)}k L</span>
                </div>
              )}
            </div>
          )}

          {/* Current Weather */}
          <div className="bg-agri-800 border border-agri-700 rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-3">Current Weather</div>
            {forecast?.[0] ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-3xl font-light text-agri-50">{Math.round(forecast[0].temp)}°</div>
                    <div className="text-xs text-agri-500 mt-1">
                      {forecast[0].rain > 0 ? 'Light rain' : 'Clear sky'}
                    </div>
                  </div>
                  <span className="text-3xl text-agri-300">
                    {forecast[0].rain > 0 ? '☁️' : '☀️'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-agri-900/50 rounded p-2">
                    <div className="text-[10px] text-agri-600">Humidity</div>
                    <div className="text-sm text-agri-200 font-medium">{forecast[0].humidity}%</div>
                  </div>
                  <div className="bg-agri-900/50 rounded p-2">
                    <div className="text-[10px] text-agri-600">Rain</div>
                    <div className="text-sm text-agri-200 font-medium">{Math.round(forecast[0].rain * 100)}%</div>
                  </div>
                </div>
              </>
            ) : farmContext ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-3xl font-light text-agri-50">{Math.round(farmContext.air_temperature)}°</div>
                    <div className="text-xs text-agri-500 mt-1">Open-Meteo</div>
                  </div>
                  <span className="text-3xl text-agri-300">🌤️</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-agri-900/50 rounded p-2">
                    <div className="text-[10px] text-agri-600">Rain 3d</div>
                    <div className="text-sm text-agri-200 font-medium">{farmContext.rain_3d_mm} mm</div>
                  </div>
                  <div className="bg-agri-900/50 rounded p-2">
                    <div className="text-[10px] text-agri-600">ET₀</div>
                    <div className="text-sm text-agri-200 font-medium">{farmContext.et0_mm_per_day} mm/d</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-agri-600">No weather data</div>
            )}
          </div>

          {/* Soil Data */}
          <div className="bg-agri-800 border border-agri-700 rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-3">Soil Data</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-agri-500">Moisture</span>
                <div className="flex items-center gap-2">
                  <div className="w-14 h-1.5 bg-agri-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(soilMoisture || 0) * 100}%` }} />
                  </div>
                  <span className="text-agri-200 w-8 text-right">{soilMoisture != null ? Math.round(soilMoisture * 100) + '%' : '—'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-agri-500">Temperature</span>
                <span className="text-agri-200">{temp != null ? temp + '°C' : '—'}</span>
              </div>
              {soilData?.ph != null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-agri-500">pH Level</span>
                  <span className="text-agri-200">{soilData.ph}</span>
                </div>
              )}
              {soilData?.nitrogen != null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-agri-500">Nitrogen (N)</span>
                  <span className="text-agri-200">{soilData.nitrogen} kg/ha</span>
                </div>
              )}
              {soilData?.phosphorus != null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-agri-500">Phosphorus (P)</span>
                  <span className="text-agri-200">{soilData.phosphorus} mg/kg</span>
                </div>
              )}
              {soilData?.potassium != null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-agri-500">Potassium (K)</span>
                  <span className="text-agri-200">{soilData.potassium} mg/kg</span>
                </div>
              )}
              {soilData?.organic_matter != null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-agri-500">Organic Matter</span>
                  <span className="text-agri-200">{soilData.organic_matter}%</span>
                </div>
              )}
              {soilData?.soil_type && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-agri-500">Soil Type</span>
                  <span className="text-agri-200">{soilData.soil_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Zone Decisions List */}
          {zones && (
            <div className="bg-agri-800 border border-agri-700 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-3">Zone Details</div>
              <div className="space-y-1">
                {zones.map((z) => {
                  const dotColor = z.status === 'healthy' ? 'bg-green-500' : z.status === 'moderate' ? 'bg-yellow-500' : z.status === 'stressed' ? 'bg-orange-500' : 'bg-red-500';
                  return (
                    <div key={z.zone_id} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        <span className="text-agri-300 font-mono w-3">{z.zone_id}</span>
                        <span className="text-agri-500">{z.position}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-agri-400">{z.decision === 'HEALTHY' ? '✓ healthy' : z.decision === 'URGENT_IRRIGATION' ? '🔴 urgent' : z.decision === 'IRRIGATE_SOON' ? '🟠 irrigate' : z.decision === 'MONITOR_WATER' ? '🟡 monitor' : '⚪ check'}</span>
                        <div className="text-[8px] text-agri-500">NDVI {z.metrics?.ndvi_mean?.toFixed(2)} · {z.metrics?.pixel_count}px</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alerts */}
          {alertList.length > 0 && (
            <div className="bg-agri-800 border border-agri-700 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-3">Alerts</div>
              <div className="space-y-1.5">
                {alertList.slice(0, 3).map((a, i) => (
                  <div key={i} className={`text-xs px-2.5 py-1.5 rounded ${
                    a.severity === 'high' ? 'bg-red-900/30 text-red-300' :
                    a.severity === 'moderate' ? 'bg-amber-900/30 text-amber-300' :
                    'bg-yellow-900/30 text-yellow-300'
                  }`}>
                    {a.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: History Charts + Narrative + Forecast */}
      <div className="flex gap-4">
        {/* History Charts */}
        {historyData?.length > 0 && (
          <div className="w-1/3 bg-agri-800 border border-agri-700 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-2">Historical NDVI</div>
            <HistoryChart data={historyData} dataKey="ndvi" label="NDVI (12 weeks)" color="#22c55e" />
            <div className="mt-2 pt-2 border-t border-agri-700">
              <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-2">Historical NDWI</div>
              <HistoryChart data={historyData} dataKey="ndwi" label="NDWI (12 weeks)" color="#3b82f6" />
            </div>
          </div>
        )}

        {/* Narrative + Zone actions */}
        <div className={`${historyData?.length > 0 ? 'w-2/3' : 'w-full'} flex flex-col gap-3`}>
          {analysis?.narrative && (
            <div className="bg-agri-800 border border-agri-700 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-2">AI Advisor</div>
              <p className="text-xs text-agri-300 leading-relaxed" style={{ fontFamily: analysis.narrative.length > 100 && analysis.narrative.charCodeAt(0) > 128 ? 'sans-serif' : 'inherit' }}>
                {analysis.narrative}
              </p>
            </div>
          )}

          {/* Zone action cards */}
          {zones?.filter(z => z.action).length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {zones.filter(z => z.action).map((z) => (
                <div key={z.zone_id} className="min-w-[150px] bg-agri-800 border border-agri-700 rounded-lg p-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${z.status === 'critical' ? 'bg-red-500' : z.status === 'stressed' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                    <span className="text-[10px] text-agri-300 font-mono">Zone {z.zone_id}</span>
                    <span className="text-[10px] text-agri-500">({z.position})</span>
                  </div>
                  <div className="text-[10px] text-agri-200 font-medium">{z.action.amount_liters.toLocaleString()} L</div>
                  <div className="text-[9px] text-agri-500">{z.action.timing === 'before_7am' ? 'Before 7am' : 'Within 24h'}</div>
                  <div className="text-[9px] text-agri-500">NDVI: {z.metrics?.ndvi_mean?.toFixed(2)} · NDWI: {z.metrics?.ndwi_mean?.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Forecast */}
          <div className="bg-agri-800 border border-agri-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="text-[10px] uppercase tracking-widest text-agri-600">7-Day Forecast</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(forecast || Array(7).fill(null)).map((day, i) => (
                <div key={i} className={`min-w-[80px] bg-agri-900/50 border border-agri-700 rounded-lg p-2.5 text-center flex-shrink-0 ${i === 0 ? 'ring-1 ring-agri-500' : ''}`}>
                  <div className="text-[10px] text-agri-600 mb-1">{day ? daysFromNow(i) : '—'}</div>
                  <div className="text-lg mb-1">{day ? (day.rain > 0 ? '☁️' : '☀️') : '—'}</div>
                  <div className="text-[10px] text-agri-500 mb-1">{day ? (day.rain > 0 ? 'Rain' : 'Clear') : '—'}</div>
                  <div className="text-sm text-agri-200 font-medium">{day ? Math.round(day.temp) + '°' : '—'}</div>
                  <div className="mt-1.5 h-1 bg-agri-700 rounded-full overflow-hidden">
                    <div className="h-full bg-agri-500 rounded-full" style={{ width: day ? `${day.humidity}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
