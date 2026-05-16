import React, { useMemo, useState } from 'react';
import FarmMap from '../components/Map/FarmMap';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n/context';
import { mapTranslations } from '../i18n/mapTranslations';

const farm = {
  name: 'Domaine Triffa Berkane',
  center: [34.8658, -2.2386],
  boundary: [
    [34.8682, -2.2437],
    [34.8694, -2.2375],
    [34.8663, -2.2338],
    [34.8621, -2.2359],
    [34.8615, -2.2419],
    [34.8645, -2.2451],
  ],
};

const demoFarm = farm;

function readStoredParcel() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem('agrosat-demo-parcel');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed?.boundary) && parsed.boundary.length >= 3 ? parsed : null;
  } catch {
    return null;
  }
}

function getBoundaryCenter(boundary) {
  const totals = boundary.reduce(
    (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  );

  return [totals.lat / boundary.length, totals.lng / boundary.length];
}

const demoApiCoefficients = {
  ndvi: 0.22,
  ndwi: 0.15,
  soil_moisture: 0.18,
  surface_temp: 38.5,
  weather: {
    temperature: 39,
    humidity: 25,
  },
  rain_forecast: 'none',
};

function normalizeRainForecast(value) {
  if (typeof value === 'number') return clamp(value <= 1 ? value * 100 : value);
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'none' || normalized === 'no rain') return 0;
    if (normalized === 'light') return 25;
    if (normalized === 'moderate') return 55;
    if (normalized === 'heavy') return 85;
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? normalizeRainForecast(numeric) : 0;
  }
  return 0;
}

function normalizeApiCoefficients(source = demoApiCoefficients) {
  const coefficient = (value, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return clamp(numeric <= 1 ? numeric * 100 : numeric);
  };

  return {
    ndvi: Number(source.ndvi ?? demoApiCoefficients.ndvi),
    ndwi: Number(source.ndwi ?? demoApiCoefficients.ndwi),
    soil_moisture: Number(source.soil_moisture ?? demoApiCoefficients.soil_moisture),
    surface_temp: Number(source.surface_temp ?? demoApiCoefficients.surface_temp),
    temperature: Number(source.weather?.temperature ?? source.temperature ?? demoApiCoefficients.weather.temperature),
    humidity: Number(source.weather?.humidity ?? source.humidity ?? demoApiCoefficients.weather.humidity),
    rain_forecast: source.rain_forecast ?? demoApiCoefficients.rain_forecast,
    plantHealth: coefficient(source.ndvi, demoApiCoefficients.ndvi * 100),
    waterLevel: coefficient(source.ndwi, demoApiCoefficients.ndwi * 100),
    soilMoisture: coefficient(source.soil_moisture, demoApiCoefficients.soil_moisture * 100),
    surfaceTemperature: Number(source.surface_temp ?? demoApiCoefficients.surface_temp),
    weatherTemperature: Number(source.weather?.temperature ?? source.temperature ?? demoApiCoefficients.weather.temperature),
    humidityScore: coefficient(source.weather?.humidity ?? source.humidity, demoApiCoefficients.weather.humidity),
    rainForecastScore: normalizeRainForecast(source.rain_forecast ?? demoApiCoefficients.rain_forecast),
  };
}

const satelliteIndicators = normalizeApiCoefficients(demoApiCoefficients);
const rasterLayerKeys = ['plant', 'water', 'soil', 'heat'];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export default function MapView() {
  const { isDark } = useTheme();
  const { lang, isRTL } = useLanguage();
  const [focusToken, setFocusToken] = useState(0);
  const [parcelOverride, setParcelOverride] = useState(readStoredParcel);
  const [rasterLayer, setRasterLayer] = useState('plant');
  const [rasterOpacity, setRasterOpacity] = useState(0.66);

  const t = mapTranslations[lang] || mapTranslations.en;
  const localizedFarm = useMemo(() => ({
    ...demoFarm,
    ...(parcelOverride || {}),
    center: parcelOverride?.boundary ? getBoundaryCenter(parcelOverride.boundary) : (parcelOverride?.center || demoFarm.center),
    crop: t.cropName,
    location: t.farmLocation,
  }), [parcelOverride, t]);

  const handleParcelChange = (boundary) => {
    if (!boundary?.length) return;
    const nextParcel = {
      name: localizedFarm.name,
      center: getBoundaryCenter(boundary),
      boundary,
    };
    setParcelOverride(nextParcel);
    window.localStorage.setItem('agrosat-demo-parcel', JSON.stringify(nextParcel));
    setFocusToken((value) => value + 1);
  };

  return (
    <div
      className={isDark ? 'relative -mx-4 -my-6 h-[calc(100vh-4rem)] bg-slate-950' : 'relative -mx-4 -my-6 h-[calc(100vh-4rem)] bg-slate-100'}
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={lang}
    >
      <FarmMap
        farm={localizedFarm}
        focusToken={focusToken}
        highlighted
        isAnalyzing={false}
        showHealthOverlay
        satelliteIndicators={satelliteIndicators}
        analysisMode={rasterLayer}
        rasterOpacity={rasterOpacity}
        labels={t}
        isDark={isDark}
        onParcelChange={handleParcelChange}
      />

      <section
        className={`absolute top-4 z-[700] w-[min(20rem,calc(100%-2rem))] rounded-md border p-4 shadow-2xl backdrop-blur ${
          isRTL ? 'left-4' : 'right-4'
        } ${
          isDark
            ? 'border-white/15 bg-slate-950/90 text-white shadow-slate-950/40'
            : 'border-slate-200 bg-white/95 text-slate-950 shadow-slate-900/10'
        }`}
        aria-label={t.rasterLayer}
      >
        <div className="mb-3">
          <h2 className="text-sm font-bold">{t.rasterLayer}</h2>
          <p className={isDark ? 'mt-1 text-xs text-slate-400' : 'mt-1 text-xs text-slate-500'}>
            {t.selectRasterLayer}
          </p>
        </div>

        <label className="block">
          <span className="sr-only">{t.selectRasterLayer}</span>
          <select
            value={rasterLayer}
            onChange={(event) => setRasterLayer(event.target.value)}
            className={isDark ? 'w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400' : 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-emerald-500'}
          >
            {rasterLayerKeys.map((key) => (
              <option key={key} value={key}>
                {t.rasterLayers?.[key] || key}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
            <span>{t.opacity}</span>
            <span>{Math.round(rasterOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.25"
            max="0.9"
            step="0.05"
            value={rasterOpacity}
            onChange={(event) => setRasterOpacity(Number(event.target.value))}
            className="w-full accent-emerald-500"
          />
        </label>
      </section>
    </div>
  );
}
