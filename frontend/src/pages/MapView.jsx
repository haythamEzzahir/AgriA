import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import FarmMap from '../components/Map/FarmMap';
import { useTheme } from '../context/ThemeContext';
import { isRtlLocale, mapLocales, mapTranslations } from '../i18n/mapTranslations';

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

const satelliteIndicators = {
  plantHealth: 72,
  waterLevel: 41,
  soilMoisture: 34,
  surfaceTemperature: 39,
  weatherTemperature: 32,
  humidity: 46,
  rainForecast: 12,
};

const indicatorBase = [
  { key: 'ndvi', technical: 'NDVI', value: 72, unit: '%', color: '#22c55e' },
  { key: 'ndwi', technical: 'NDWI', value: 41, unit: '%', color: '#38bdf8' },
  { key: 'soil', technical: 'soil_moisture', value: 34, unit: '%', color: '#facc15' },
  { key: 'surface', technical: 'surface_temp', value: 39, unit: ' C', color: '#fb923c' },
  { key: 'weather', technical: 'weather_temp', value: 32, unit: ' C', color: '#a78bfa' },
  { key: 'humidity', technical: 'humidity', value: 46, unit: '%', color: '#2dd4bf' },
  { key: 'rain', technical: 'rain_forecast', value: 12, unit: '%', color: '#60a5fa' },
];

const tempValues = [
  { air: 32, surface: 39 },
  { air: 33, surface: 41 },
  { air: 31, surface: 38 },
  { air: 29, surface: 35 },
  { air: 30, surface: 36 },
  { air: 28, surface: 34 },
];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function buildSmartDiagnosis(data, t) {
  const heatRisk = clamp(((data.surfaceTemperature - 28) / 18) * 100) * 0.7
    + clamp(((data.weatherTemperature - 24) / 18) * 100) * 0.3;
  const globalRisk = Math.round(clamp(
    (100 - data.plantHealth) * 0.24
      + (100 - data.waterLevel) * 0.18
      + (100 - data.soilMoisture) * 0.2
      + heatRisk * 0.2
      + (100 - data.humidity) * 0.08
      + (100 - data.rainForecast) * 0.1,
  ));

  return {
    globalRisk,
    waterScore: Math.round(clamp(data.waterLevel * 0.42 + data.soilMoisture * 0.42 + data.rainForecast * 0.16)),
    plantHealth: data.plantHealth,
    mostStressedArea: t.mostStressedAreaValue,
    mainCause: t.mainCauseValue,
    recommendedAction: t.recommendedActionValue,
    confidence: 86,
  };
}

const riskColor = (score) => {
  if (score < 34) return '#22c55e';
  if (score < 56) return '#facc15';
  if (score < 74) return '#fb923c';
  return '#ef4444';
};

function StatTile({ label, value, detail, isDark }) {
  return (
    <div className={isDark ? 'rounded-md border border-white/10 bg-white/[0.045] p-4' : 'rounded-md border border-slate-200 bg-white p-4 shadow-sm'}>
      <p className={isDark ? 'text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500' : 'text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500'}>{label}</p>
      <p className={isDark ? 'mt-2 text-2xl font-bold text-white' : 'mt-2 text-2xl font-bold text-slate-950'}>{value}</p>
      <p className={isDark ? 'mt-1 text-xs text-slate-400' : 'mt-1 text-xs text-slate-500'}>{detail}</p>
    </div>
  );
}

function IndicatorRow({ item, isDark }) {
  const width = item.key === 'surface' || item.key === 'weather' ? Math.min(100, (item.value / 45) * 100) : item.value;

  return (
    <div className={isDark ? 'rounded-md border border-white/10 bg-slate-950/40 px-3 py-3' : 'rounded-md border border-slate-200 bg-white px-3 py-3 shadow-sm'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.technical}</p>
          <p className={isDark ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-slate-900'}>{item.label}</p>
        </div>
        <p className={isDark ? 'text-sm font-bold text-white' : 'text-sm font-bold text-slate-950'}>{item.value}{item.unit}</p>
      </div>
      <div className={isDark ? 'mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800' : 'mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200'}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, backgroundColor: item.color }} />
      </div>
    </div>
  );
}

function GaugeCard({ title, value, color, isDark, suffix = '%' }) {
  const data = [{ name: title, value, fill: color }];

  return (
    <div className={isDark ? 'rounded-md border border-white/10 bg-slate-950/50 p-4' : 'rounded-md border border-slate-200 bg-white p-4 shadow-sm'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className={isDark ? 'mt-1 text-2xl font-bold text-white' : 'mt-1 text-2xl font-bold text-slate-950'}>{value}{suffix}</p>
        </div>
        <div className="h-20 w-20 shrink-0">
          <RadialBarChart width={80} height={80} innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: isDark ? '#1e293b' : '#e2e8f0' }} />
          </RadialBarChart>
        </div>
      </div>
    </div>
  );
}

function SmartDiagnosisPanel({ diagnosis, active, isDark, t }) {
  return (
    <section className={isDark ? 'rounded-md border border-emerald-400/20 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30' : 'rounded-md border border-emerald-200 bg-white p-5 shadow-sm'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-500">{t.smartTitle}</p>
          <h2 className={isDark ? 'mt-2 text-xl font-bold text-white' : 'mt-2 text-xl font-bold text-slate-950'}>{t.smartSubtitle}</h2>
        </div>
        <span className={isDark ? 'rounded-md border border-white/10 bg-white/[0.08] px-2.5 py-1 text-xs font-semibold text-slate-200' : 'rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600'}>
          {active ? t.analyzed : t.ready}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatTile label={t.globalRiskScore} value={`${diagnosis.globalRisk}%`} detail={t.moderateWarning} isDark={isDark} />
        <StatTile label={t.confidence} value={`${diagnosis.confidence}%`} detail={t.modelConfidence} isDark={isDark} />
      </div>

      <div className="mt-5 space-y-4 text-sm leading-6">
        {[
          [t.mostStressedArea, diagnosis.mostStressedArea],
          [t.mainCause, diagnosis.mainCause],
          [t.recommendedAction, diagnosis.recommendedAction],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className={isDark ? 'text-slate-100' : 'text-slate-800'}>{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function textWithLocation(template, location) {
  return template.replace('{location}', location);
}

export default function MapView() {
  const { isDark, toggleTheme } = useTheme();
  const [locale, setLocale] = useState(() => window.localStorage.getItem('agrosat-map-locale') || 'en');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [focusToken, setFocusToken] = useState(0);
  const [drawToken, setDrawToken] = useState(0);
  const [analysisMode, setAnalysisMode] = useState('risk');
  const [parcelOverride, setParcelOverride] = useState(readStoredParcel);

  const t = mapTranslations[locale] || mapTranslations.en;
  const isRtl = isRtlLocale(locale);
  const localizedFarm = useMemo(() => ({
    ...demoFarm,
    ...(parcelOverride || {}),
    center: parcelOverride?.boundary ? getBoundaryCenter(parcelOverride.boundary) : (parcelOverride?.center || demoFarm.center),
    crop: t.cropName,
    location: t.farmLocation,
  }), [parcelOverride, t]);
  const diagnosis = useMemo(() => buildSmartDiagnosis(satelliteIndicators, t), [t]);
  const indicators = useMemo(
    () => indicatorBase.map((item) => ({ ...item, label: t.indicators[item.key] })),
    [t],
  );
  const barData = useMemo(() => indicators.map((item) => ({ ...item, chartValue: item.value })), [indicators]);
  const tempForecast = useMemo(() => tempValues.map((item, index) => ({ ...item, day: t.days[index] })), [t]);
  const showOverlay = analysisReady && !isAnalyzing;
  const panelClass = isDark
    ? 'rounded-md border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/30'
    : 'rounded-md border border-slate-200 bg-white p-5 shadow-sm';
  const chartTooltip = {
    background: isDark ? '#020617' : '#ffffff',
    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
    color: isDark ? '#e2e8f0' : '#0f172a',
  };

  const changeLocale = (nextLocale) => {
    setLocale(nextLocale);
    window.localStorage.setItem('agrosat-map-locale', nextLocale);
  };

  const analyzeFarm = () => {
    setAnalysisReady(false);
    setIsAnalyzing(true);
    setFocusToken((value) => value + 1);
    window.setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisReady(true);
    }, 1800);
  };

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

  const resetDemoParcel = () => {
    window.localStorage.removeItem('agrosat-demo-parcel');
    setParcelOverride(null);
    setFocusToken((value) => value + 1);
  };

  return (
    <div
      className={isDark ? '-mx-4 -my-6 min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8' : '-mx-4 -my-6 min-h-[calc(100vh-4rem)] bg-slate-100 px-4 py-5 text-slate-900 sm:px-6 lg:px-8'}
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={locale === 'darija' ? 'ar-MA' : locale}
    >
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className={isDark ? 'flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between' : 'flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between'}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-500">{t.command}</p>
            <h1 className={isDark ? 'mt-2 text-3xl font-bold tracking-normal text-white md:text-4xl' : 'mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl'}>{t.title}</h1>
            <p className={isDark ? 'mt-2 max-w-3xl text-sm leading-6 text-slate-400' : 'mt-2 max-w-3xl text-sm leading-6 text-slate-600'}>
              {textWithLocation(t.subtitle, localizedFarm.location)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className={isDark ? 'flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-200' : 'flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm'}>
              <span>{t.language}</span>
              <select
                value={locale}
                onChange={(event) => changeLocale(event.target.value)}
                className={isDark ? 'bg-slate-950 text-white outline-none' : 'bg-white text-slate-950 outline-none'}
              >
                {mapLocales.map((item) => (
                  <option key={item.code} value={item.code}>{item.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={toggleTheme}
              className={isDark ? 'rounded-md border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.12]' : 'rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50'}
            >
              {t.theme}: {isDark ? t.dark : t.light}
            </button>
            <button
              type="button"
              onClick={analyzeFarm}
              disabled={isAnalyzing}
              className="rounded-md bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-70"
            >
              {isAnalyzing ? t.analyzing : t.analyze}
            </button>
            <button
              type="button"
              onClick={() => setFocusToken((value) => value + 1)}
              className={isDark ? 'rounded-md border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.12]' : 'rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50'}
            >
              {t.focusParcel || 'Focus Parcel'}
            </button>
            <button
              type="button"
              onClick={() => setDrawToken((value) => value + 1)}
              className={isDark ? 'rounded-md border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.12]' : 'rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50'}
            >
              {t.drawParcel || 'Draw Parcel'}
            </button>
            <button
              type="button"
              onClick={resetDemoParcel}
              className={isDark ? 'rounded-md border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.12]' : 'rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50'}
            >
              {t.resetDemoParcel || 'Reset Demo Parcel'}
            </button>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.48fr)_430px]">
          <div className={isDark ? 'overflow-hidden rounded-md border border-white/10 bg-slate-900 shadow-2xl shadow-slate-950/40' : 'overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm'}>
            <div className={isDark ? 'flex flex-col gap-3 border-b border-white/10 bg-slate-900/95 px-5 py-4 md:flex-row md:items-center md:justify-between' : 'flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between'}>
              <div>
                <h2 className={isDark ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-950'}>{localizedFarm.name}</h2>
                <p className={isDark ? 'mt-1 text-sm text-slate-400' : 'mt-1 text-sm text-slate-600'}>{localizedFarm.crop} - {t.monitoredParcel}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-emerald-600">{t.boundaryLocked}</span>
                <span className="rounded-md border border-sky-300/25 bg-sky-400/10 px-3 py-1.5 text-sky-600">{t.satelliteBase}</span>
                <span className="rounded-md border border-orange-300/25 bg-orange-400/10 px-3 py-1.5 text-orange-600">{t.weatherRaster}</span>
              </div>
            </div>
            <div className="h-[680px]">
              <FarmMap
                farm={localizedFarm}
                focusToken={focusToken}
                drawToken={drawToken}
                highlighted
                isAnalyzing={isAnalyzing}
                showHealthOverlay={showOverlay}
                satelliteIndicators={satelliteIndicators}
                analysisMode={analysisMode}
                onAnalysisModeChange={setAnalysisMode}
                labels={t}
                isDark={isDark}
                onParcelChange={handleParcelChange}
              />
            </div>
          </div>

          <aside className="space-y-5">
            <SmartDiagnosisPanel diagnosis={diagnosis} active={analysisReady} isDark={isDark} t={t} />

            <section className={panelClass}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{t.weatherSoil}</p>
                  <h2 className={isDark ? 'mt-1 text-lg font-bold text-white' : 'mt-1 text-lg font-bold text-slate-950'}>{t.fieldCoefficients}</h2>
                </div>
                <span className={isDark ? 'rounded-md bg-white/[0.08] px-2.5 py-1 text-xs text-slate-300' : 'rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600'}>{t.farmLevelData}</span>
              </div>
              <div className="grid gap-3">
                {indicators.map((item) => (
                  <IndicatorRow key={item.key} item={item} isDark={isDark} />
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <GaugeCard title={t.riskScore} value={diagnosis.globalRisk} color={riskColor(diagnosis.globalRisk)} isDark={isDark} />
            <GaugeCard title={t.waterScore} value={diagnosis.waterScore} color="#38bdf8" isDark={isDark} />
            <GaugeCard title={t.plantHealth} value={diagnosis.plantHealth} color="#22c55e" isDark={isDark} />
          </div>

          <div className={`${panelClass} min-w-0`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{t.satelliteIndicators}</p>
                <h2 className={isDark ? 'mt-1 text-lg font-bold text-white' : 'mt-1 text-lg font-bold text-slate-950'}>{t.coefficientComparison}</h2>
              </div>
              <span className="text-xs text-slate-500">{t.coefficientHint}</span>
            </div>
            <div className="h-72 min-h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ left: isRtl ? 10 : -20, right: isRtl ? -20 : 10, top: 8, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="label" tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }} angle={-18} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }} orientation={isRtl ? 'right' : 'left'} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Bar dataKey="chartValue" radius={[4, 4, 0, 0]}>
                    {barData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`${panelClass} min-w-0`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{t.forecast}</p>
                <h2 className={isDark ? 'mt-1 text-lg font-bold text-white' : 'mt-1 text-lg font-bold text-slate-950'}>{t.temperatureTrend}</h2>
              </div>
              <span className="text-xs text-slate-500">{t.outlook}</span>
            </div>
            <div className="h-72 min-h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempForecast} margin={{ left: isRtl ? 10 : -20, right: isRtl ? -20 : 10, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="day" tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }} />
                  <YAxis tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }} orientation={isRtl ? 'right' : 'left'} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Line type="monotone" dataKey="air" name={t.indicators.weather} stroke="#38bdf8" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="surface" name={t.indicators.surface} stroke="#fb923c" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <p className={isDark ? 'rounded-md border border-white/10 bg-white/[0.045] px-4 py-3 text-xs leading-5 text-slate-400' : 'rounded-md border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600 shadow-sm'}>
          {t.demoNote}
          <span className="mx-2">|</span>
          {t.parcelAccuracyNote || 'Parcel accuracy depends on GPS coordinates or drawn boundary.'}
        </p>
      </div>
    </div>
  );
}
