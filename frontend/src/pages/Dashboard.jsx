import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/context';
import { farms, ndvi, weather, soil, alerts, recommendations } from '../services/api';

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

  useEffect(() => {
    (async () => {
      try {
        const farmList = await farms.list();
        if (!farmList?.length) { setLoading(false); return; }

        const currentFarm = farmList[0];
        setFarm(currentFarm);

        const [ndviResult, alertResult, recResult, soilResult] = await Promise.allSettled([
          ndvi.get(currentFarm.id).catch(() => null),
          alerts.list(currentFarm.id).catch(() => []),
          recommendations.get(currentFarm.id).catch(() => []),
          soil.get(currentFarm.id).catch(() => null),
        ]);

        if (ndviResult.status === 'fulfilled') setNdviData(ndviResult.value);
        if (alertResult.status === 'fulfilled') setAlertList(alertResult.value);
        if (recResult.status === 'fulfilled') setCrops(recResult.value);
        if (soilResult.status === 'fulfilled') setSoilData(soilResult.value);

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

  return (
    <div className="flex flex-col h-full gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Main content + Right panel */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Map / NDVI area */}
        <div className="flex-1 rounded-lg bg-agri-800 border border-agri-700 overflow-hidden relative">
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
            </div>
          </div>
          <div className="absolute bottom-2 left-2 text-xs text-agri-600 bg-agri-900/80 px-2 py-1 rounded">
            🛰️ Satellite view
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
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
              {soilData?.drainage && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-agri-500">Drainage</span>
                  <span className="text-agri-200 capitalize">{soilData.drainage}</span>
                </div>
              )}
              {soilData?.status && (
                <div className="mt-2 pt-2 border-t border-agri-700 flex items-center justify-between text-xs">
                  <span className="text-agri-500">Status</span>
                  <span className={`font-medium ${
                    soilData.status === 'healthy' ? 'text-green-400' :
                    soilData.status === 'fair' ? 'text-amber-400' : 'text-red-400'
                  }`}>{soilData.status}</span>
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-agri-800 border border-agri-700 rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-3">Alerts</div>
            {alertList.length > 0 ? (
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
            ) : (
              <div className="text-xs text-agri-600">No active alerts</div>
            )}
          </div>

          {/* Farm info */}
          <div className="bg-agri-800 border border-agri-700 rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-widest text-agri-600 mb-3">Farm Info</div>
            <div className="text-xs text-agri-400">{farm.name}</div>
            <div className="text-xs text-agri-500 mt-1">{farm.size} · {farm.crops?.join(', ') || '—'}</div>
            <div className="text-xs text-agri-500">{farm.custom_area || '—'} ha · {farm.irrigation || '—'}</div>
          </div>
        </div>
      </div>

      {/* Bottom forecast */}
      <div className="bg-agri-800 border border-agri-700 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-3 text-xs">
          {['daily'].map((tab) => (
            <span key={tab}
              onClick={() => setForecastTab(tab)}
              className={`px-2.5 py-1 rounded cursor-pointer transition ${
                forecastTab === tab ? 'bg-agri-700 text-agri-200' : 'text-agri-500 hover:text-agri-300'
              }`}
            >
              {tab === 'daily' ? 'Daily forecast' : tab === 'hourly' ? 'Hourly' : tab === 'historical' ? 'Historical' : tab}
            </span>
          ))}
          <span className="px-2.5 py-1 rounded text-agri-500 cursor-pointer hover:text-agri-300 transition text-xs">Historical soil</span>
          <span className="px-2.5 py-1 rounded text-agri-500 cursor-pointer hover:text-agri-300 transition text-xs">Accumulated</span>
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
  );
}
