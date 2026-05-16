import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const fallbackFarm = {
  name: 'Domaine Triffa Berkane',
  crop: 'Olive trees',
  location: 'Triffa Plain, Berkane, Oriental Morocco',
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

const defaultSatelliteIndicators = {
  ndvi: 0.22,
  ndwi: 0.15,
  soil_moisture: 0.18,
  surface_temp: 38.5,
  temperature: 39,
  humidity: 25,
  rain_forecast: 'none',
  plantHealth: 22,
  waterLevel: 15,
  soilMoisture: 18,
  surfaceTemperature: 38.5,
  weatherTemperature: 39,
  humidityScore: 25,
  rainForecastScore: 0,
};

const modeKeys = ['risk', 'plant', 'water', 'heat', 'soil'];

const defaultLabels = {
  selectedParcel: 'Selected farm parcel',
  rasterLayer: 'Raster layer',
  liveRaster: 'Live raster',
  legend: 'legend',
  lowRisk: 'Low risk',
  moderate: 'Moderate',
  warning: 'Warning',
  critical: 'Critical',
  zoneId: 'Zone ID',
  plantHealthScore: 'Plant health score',
  waterScore: 'Water score',
  soilMoisture: 'Soil moisture',
  surfaceTemperature: 'Surface temperature',
  riskLevel: 'Risk level',
  recommendedAction: 'Recommended action',
  demoNote: 'Raster visualization is generated from farm-level satellite and weather indicators for demo purposes.',
  analyzingMap: 'Analyzing farm raster from satellite and weather indicators',
  focusParcel: 'Focus Parcel',
  drawParcel: 'Draw Parcel',
  resetDemoParcel: 'Reset Demo Parcel',
  parcelAccuracyNote: 'Parcel accuracy depends on GPS coordinates or drawn boundary.',
  crop: 'Crop',
  modes: {
    risk: 'Global Risk',
    plant: 'Plant Health',
    water: 'Water Stress',
    heat: 'Heat Stress',
    soil: 'Soil Moisture',
  },
  maintainCurrent: 'Maintain current crop management; no urgent intervention required.',
  continueMonitoring: 'Continue monitoring this zone for trend changes.',
  moderateAction: 'Maintain the current plan with a soil moisture check before the next irrigation cycle.',
  warningAction: 'Schedule targeted irrigation and monitor canopy temperature during the next field pass.',
  criticalAction: 'Irrigate early morning or late afternoon and re-check soil moisture after 12 hours.',
};

const riskColors = {
  safe: '#22c55e',
  moderate: '#facc15',
  warning: '#fb923c',
  critical: '#ef4444',
};

function FitFarmBounds({ boundary, focusToken }) {
  const map = useMap();

  useEffect(() => {
    if (boundary?.length >= 3) {
      const bounds = L.latLngBounds(boundary);
      map.fitBounds(bounds, { padding: [78, 78], maxZoom: 17, animate: true, duration: 1 });
      window.setTimeout(() => map.invalidateSize(), 0);
    }
  }, [boundary, focusToken, map]);

  return null;
}

function DrawParcelHandler({ drawToken, onCreated }) {
  const map = useMap();
  const lastToken = useRef(drawToken);
  const activeDrawer = useRef(null);

  useEffect(() => {
    if (!L.Draw || !drawToken || drawToken === lastToken.current) return;
    lastToken.current = drawToken;
    activeDrawer.current?.disable();
    activeDrawer.current = new L.Draw.Polygon(map, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: {
        color: '#f8fafc',
        fillColor: '#22c55e',
        fillOpacity: 0.18,
        weight: 3,
      },
    });
    activeDrawer.current.enable();

    return () => activeDrawer.current?.disable();
  }, [drawToken, map]);

  useEffect(() => {
    if (!L.Draw?.Event?.CREATED) return undefined;

    const handleCreated = (event) => {
      const latLngs = event.layer.getLatLngs()?.[0] || [];
      const boundary = latLngs.map((point) => [point.lat, point.lng]);
      if (boundary.length >= 3) onCreated(boundary);
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    return () => map.off(L.Draw.Event.CREATED, handleCreated);
  }, [map, onCreated]);

  return null;
}

function EditableParcelLayer({ boundary, farm, labels, highlighted, showHealthOverlay, onParcelChange }) {
  const map = useMap();
  const layerRef = useRef(null);
  const callbackRef = useRef(onParcelChange);
  const saveTimer = useRef(null);

  useEffect(() => {
    callbackRef.current = onParcelChange;
  }, [onParcelChange]);

  useEffect(() => {
    if (!boundary?.length) return undefined;

    const pathOptions = {
      color: highlighted ? '#f8fafc' : '#a7f3d0',
      fillColor: '#22c55e',
      fill: false,
      fillOpacity: showHealthOverlay ? 0.08 : 0.18,
      opacity: 1,
      weight: highlighted ? 4 : 3,
      className: highlighted ? 'farm-boundary-precision' : 'farm-boundary',
    };

    if (!layerRef.current) {
      layerRef.current = L.polygon(boundary, pathOptions).addTo(map);
      layerRef.current.on('edit', () => {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          const latLngs = layerRef.current?.getLatLngs()?.[0] || [];
          const nextBoundary = latLngs.map((point) => [point.lat, point.lng]);
          if (nextBoundary.length >= 3) callbackRef.current?.(nextBoundary);
        }, 280);
      });
    } else {
      layerRef.current.setLatLngs(boundary);
      layerRef.current.setStyle(pathOptions);
    }

    layerRef.current.bindPopup(`
      <div class="space-y-1">
        <strong>${escapeHtml(farm?.name)}</strong>
        <div>${escapeHtml(labels?.crop || 'Crop')}: ${escapeHtml(farm?.crop)}</div>
        <div>${escapeHtml(farm?.location)}</div>
      </div>
    `);
    layerRef.current.bringToFront();
    if (layerRef.current.editing && !layerRef.current.editing.enabled()) {
      layerRef.current.editing.enable();
    }

    return () => {
      window.clearTimeout(saveTimer.current);
      if (layerRef.current) {
        layerRef.current.editing?.disable();
        layerRef.current.removeFrom(map);
        layerRef.current = null;
      }
    };
  }, [boundary, farm, highlighted, labels, map, showHealthOverlay]);

  return null;
}

function createFarmMarker(farm) {
  return L.divIcon({
    className: 'farm-pin',
    html: `<div class="farm-pin-dot"></div><div class="farm-pin-label"><strong>${farm.name}</strong><span>${farm.crop}</span></div>`,
    iconSize: [190, 54],
    iconAnchor: [20, 46],
  });
}

function createParcelAroundCenter(center) {
  const [lat, lng] = center;
  return [
    [lat + 0.0022, lng - 0.0037],
    [lat + 0.0028, lng + 0.0024],
    [lat + 0.0003, lng + 0.0042],
    [lat - 0.0025, lng + 0.0017],
    [lat - 0.0021, lng - 0.0032],
  ];
}

function normalizeCoordinatePair(value) {
  if (Array.isArray(value) && value.length >= 2) return [Number(value[0]), Number(value[1])];
  if (value && typeof value === 'object') {
    const lat = value.lat ?? value.latitude;
    const lng = value.lng ?? value.lon ?? value.longitude;
    if (lat !== undefined && lng !== undefined) return [Number(lat), Number(lng)];
  }
  return null;
}

function normalizeBoundary(rawBoundary) {
  if (!Array.isArray(rawBoundary)) return null;
  const boundary = rawBoundary
    .map(normalizeCoordinatePair)
    .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]));
  return boundary.length >= 3 ? boundary : null;
}

function normalizeFarm(farm) {
  const source = farm && typeof farm === 'object' ? farm : fallbackFarm;
  const explicitBoundary = normalizeBoundary(source.boundary || source.polygon || source.coordinates);
  const center = normalizeCoordinatePair(source.center)
    || normalizeCoordinatePair({ lat: source.latitude, lng: source.longitude })
    || normalizeCoordinatePair({ lat: source.lat, lng: source.lng })
    || fallbackFarm.center;
  const boundary = explicitBoundary || createParcelAroundCenter(center);
  const bounds = L.latLngBounds(boundary);

  return {
    ...fallbackFarm,
    ...source,
    center: explicitBoundary ? [bounds.getCenter().lat, bounds.getCenter().lng] : center,
    boundary,
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function numberOrDefault(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function coefficientToScore(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric <= 1 ? numeric * 100 : numeric);
}

function rainForecastToScore(value) {
  if (typeof value === 'number') return value <= 1 ? clamp(value * 100) : clamp(value);
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'none' || normalized === 'no rain') return 0;
    if (normalized === 'light') return 25;
    if (normalized === 'moderate') return 55;
    if (normalized === 'heavy') return 85;
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? rainForecastToScore(numeric) : 0;
  }
  return 0;
}

function normalizeIndicators(indicators) {
  const source = indicators && typeof indicators === 'object' ? indicators : {};
  const weather = source.weather && typeof source.weather === 'object' ? source.weather : {};
  const ndvi = numberOrDefault(source.ndvi, defaultSatelliteIndicators.ndvi);
  const ndwi = numberOrDefault(source.ndwi, defaultSatelliteIndicators.ndwi);
  const soilMoistureCoefficient = numberOrDefault(source.soil_moisture, defaultSatelliteIndicators.soil_moisture);
  const surfaceTemp = numberOrDefault(source.surface_temp ?? source.surfaceTemperature, defaultSatelliteIndicators.surface_temp);
  const temperature = numberOrDefault(weather.temperature ?? source.temperature ?? source.weatherTemperature, defaultSatelliteIndicators.temperature);
  const humidity = numberOrDefault(weather.humidity ?? source.humidity ?? source.humidityScore, defaultSatelliteIndicators.humidity);
  const rainForecast = source.rain_forecast ?? source.rainForecast ?? defaultSatelliteIndicators.rain_forecast;

  return {
    ndvi,
    ndwi,
    soil_moisture: soilMoistureCoefficient,
    surface_temp: surfaceTemp,
    temperature,
    humidity,
    rain_forecast: rainForecast,
    plantHealth: coefficientToScore(source.plantHealth ?? ndvi, defaultSatelliteIndicators.plantHealth),
    waterLevel: coefficientToScore(source.waterLevel ?? ndwi, defaultSatelliteIndicators.waterLevel),
    soilMoisture: coefficientToScore(source.soilMoisture ?? soilMoistureCoefficient, defaultSatelliteIndicators.soilMoisture),
    surfaceTemperature: surfaceTemp,
    weatherTemperature: temperature,
    humidityScore: coefficientToScore(humidity, defaultSatelliteIndicators.humidityScore),
    rainForecastScore: rainForecastToScore(rainForecast),
  };
}

function smoothField(row, col, rows, cols) {
  const x = col / (cols - 1);
  const y = row / (rows - 1);
  const ridge = Math.sin((x * 2.4 + y * 1.2) * Math.PI) * 0.5;
  const basin = Math.cos((x * 1.1 - y * 1.9) * Math.PI) * 0.35;
  const edgeHeat = x * 0.55 + (1 - y) * 0.45;
  const moisturePocket = Math.max(0, 1 - Math.hypot(x - 0.26, y - 0.72) * 2.15);

  return { x, y, ridge, basin, edgeHeat, moisturePocket };
}

function pointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersects = lngI > lng !== lngJ > lng && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersects) inside = !inside;
  }

  return inside;
}

function getRiskLevel(score) {
  if (score < 34) return 'safe';
  if (score < 56) return 'moderate';
  if (score < 74) return 'warning';
  return 'critical';
}

function getRecommendation(level, values, labels) {
  if (level === 'critical') return labels.criticalAction;
  if (level === 'warning') return labels.warningAction;
  if (level === 'moderate') return labels.moderateAction;
  if (values.plantHealth > 76) return labels.maintainCurrent;
  return labels.continueMonitoring;
}

function waterScale(score) {
  if (score >= 72) return '#0284c7';
  if (score >= 55) return '#16a34a';
  if (score >= 38) return '#facc15';
  if (score >= 24) return '#fb923c';
  return '#ef4444';
}

function plantScale(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 48) return '#facc15';
  return '#ef4444';
}

function heatScale(temp) {
  if (temp < 31) return '#22c55e';
  if (temp < 36) return '#facc15';
  if (temp < 41) return '#fb923c';
  return '#ef4444';
}

function colorForMode(cell, mode) {
  if (mode === 'plant') return plantScale(cell.values.plantHealth);
  if (mode === 'water') return waterScale(cell.values.waterScore);
  if (mode === 'soil') return waterScale(cell.values.soilMoisture);
  if (mode === 'heat') return heatScale(cell.values.surfaceTemperature);
  return riskColors[cell.level];
}

function buildAgriculturalPatches(farm) {
  const bounds = L.latLngBounds(farm.boundary);
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const latSpan = north - south;
  const lngSpan = east - west;
  const centerLat = (north + south) / 2;
  const centerLng = (east + west) / 2;

  const patchSpecs = [
    { id: 'north-orchard', dx: -0.72, dy: 0.82, w: 0.56, h: 0.38, color: '#65a30d', opacity: 0.16 },
    { id: 'east-field', dx: 0.76, dy: 0.32, w: 0.5, h: 0.46, color: '#84cc16', opacity: 0.14 },
    { id: 'south-irrigated', dx: 0.24, dy: -0.86, w: 0.62, h: 0.36, color: '#22c55e', opacity: 0.14 },
    { id: 'west-cereal', dx: -0.92, dy: -0.18, w: 0.48, h: 0.52, color: '#ca8a04', opacity: 0.12 },
    { id: 'southwest-olive', dx: -0.56, dy: -0.76, w: 0.46, h: 0.34, color: '#16a34a', opacity: 0.13 },
    { id: 'northeast-rows', dx: 0.52, dy: 0.9, w: 0.44, h: 0.32, color: '#4ade80', opacity: 0.11 },
  ];

  return patchSpecs.map((patch) => {
    const lat = centerLat + patch.dy * latSpan;
    const lng = centerLng + patch.dx * lngSpan;
    const halfH = patch.h * latSpan;
    const halfW = patch.w * lngSpan;

    return {
      ...patch,
      positions: [
        [lat - halfH, lng - halfW],
        [lat - halfH * 0.88, lng + halfW],
        [lat + halfH, lng + halfW * 0.92],
        [lat + halfH * 0.9, lng - halfW],
      ],
    };
  });
}

function buildIrrigationLines(farm) {
  const bounds = L.latLngBounds(farm.boundary);
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const latSpan = north - south;
  const lngSpan = east - west;

  return [
    {
      id: 'main-canal',
      positions: [
        [south + latSpan * 0.08, west - lngSpan * 0.9],
        [south + latSpan * 0.2, west - lngSpan * 0.2],
        [south + latSpan * 0.34, east + lngSpan * 0.8],
      ],
    },
    {
      id: 'field-canal',
      positions: [
        [north + latSpan * 0.52, west - lngSpan * 0.42],
        [north + latSpan * 0.22, west + lngSpan * 0.3],
        [north - latSpan * 0.05, east + lngSpan * 0.52],
      ],
    },
  ];
}

function generateSatellitePixels(farm, indicators, labels) {
  const safeIndicators = normalizeIndicators(indicators);
  const bounds = L.latLngBounds(farm.boundary);
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const rows = 18;
  const cols = 18;
  const latStep = (north - south) / rows;
  const lngStep = (east - west) / cols;
  const cells = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const lat1 = south + row * latStep;
      const lat2 = south + (row + 0.92) * latStep;
      const lng1 = west + col * lngStep;
      const lng2 = west + (col + 0.92) * lngStep;
      const corners = [
        [lat1, lng1],
        [lat1, lng2],
        [lat2, lng2],
        [lat2, lng1],
      ];

      if (!corners.every((corner) => pointInPolygon(corner, farm.boundary))) continue;

      const { ridge, basin, edgeHeat, moisturePocket } = smoothField(row, col, rows, cols);
      const dryStress = edgeHeat * 20 - moisturePocket * 14 + ridge * 5;
      const canopyBoost = moisturePocket * 12 + basin * 4 - edgeHeat * 5;

      const plantHealth = clamp(safeIndicators.plantHealth + canopyBoost - dryStress * 0.42);
      const waterLevel = clamp(safeIndicators.waterLevel + moisturePocket * 15 - dryStress * 0.62 + basin * 5);
      const soilMoisture = clamp(safeIndicators.soilMoisture + moisturePocket * 18 - dryStress * 0.72 + ridge * 3);
      const surfaceTemperature = clamp(safeIndicators.surfaceTemperature + dryStress * 0.2 - moisturePocket * 2.4 + ridge * 0.8, 18, 54);
      const weatherTemperature = clamp(safeIndicators.weatherTemperature + edgeHeat * 2.2 + ridge * 0.5, 8, 48);
      const humidity = clamp(safeIndicators.humidityScore + moisturePocket * 10 - edgeHeat * 8 + basin * 4);
      const rainForecast = clamp(safeIndicators.rainForecastScore + moisturePocket * 5 - edgeHeat * 3);
      const waterScore = clamp(waterLevel * 0.42 + soilMoisture * 0.42 + rainForecast * 0.16);
      const heatRisk = clamp(((surfaceTemperature - 28) / 18) * 100) * 0.7
        + clamp(((weatherTemperature - 24) / 18) * 100) * 0.3;
      const riskScore = clamp(
        (100 - plantHealth) * 0.24
          + (100 - waterLevel) * 0.18
          + (100 - soilMoisture) * 0.2
          + heatRisk * 0.2
          + (100 - humidity) * 0.08
          + (100 - rainForecast) * 0.1,
      );
      const level = getRiskLevel(riskScore);

      cells.push({
        id: `${row}-${col}`,
        row,
        col,
        positions: corners,
        values: {
          plantHealth,
          waterLevel,
          waterScore,
          soilMoisture,
          surfaceTemperature,
          weatherTemperature,
          humidity,
          rainForecast,
        },
        riskScore,
        level,
        recommendation: getRecommendation(level, { plantHealth, soilMoisture, surfaceTemperature }, labels),
      });
    }
  }

  return cells;
}

export default function FarmMap({
  farm = fallbackFarm,
  showHealthOverlay = false,
  isAnalyzing = false,
  focusToken = 0,
  drawToken = 0,
  highlighted = true,
  satelliteIndicators = defaultSatelliteIndicators,
  analysisMode = 'risk',
  rasterOpacity = 0.66,
  onAnalysisModeChange,
  labels = defaultLabels,
  isDark = true,
  onParcelChange,
}) {
  const safeLabels = labels && typeof labels === 'object' ? labels : {};
  const mapLabels = useMemo(
    () => ({ ...defaultLabels, ...safeLabels, modes: { ...defaultLabels.modes, ...(safeLabels.modes || {}) } }),
    [safeLabels],
  );
  const safeMode = modeKeys.includes(analysisMode) ? analysisMode : 'risk';
  const safeRasterOpacity = clamp(Number(rasterOpacity), 0.25, 0.9);
  const safeIndicators = useMemo(() => normalizeIndicators(satelliteIndicators), [satelliteIndicators]);
  const normalizedFarm = useMemo(() => normalizeFarm(farm), [farm]);
  const markerIcon = useMemo(() => createFarmMarker(normalizedFarm), [normalizedFarm]);
  const displayBounds = useMemo(() => L.latLngBounds(normalizedFarm.boundary), [normalizedFarm.boundary]);
  const agriculturalPatches = useMemo(() => buildAgriculturalPatches(normalizedFarm), [normalizedFarm]);
  const irrigationLines = useMemo(() => buildIrrigationLines(normalizedFarm), [normalizedFarm]);
  const satellitePixels = useMemo(
    () => generateSatellitePixels(normalizedFarm, safeIndicators, mapLabels),
    [normalizedFarm, safeIndicators, mapLabels],
  );

  return (
    <div className={isDark ? 'relative h-full min-h-[420px] w-full overflow-hidden bg-slate-950' : 'relative h-full min-h-[420px] w-full overflow-hidden bg-slate-200'}>
      <MapContainer
        center={normalizedFarm.center}
        zoom={15}
        minZoom={5}
        maxZoom={19}
        className={isDark ? 'h-full w-full agrosat-map' : 'h-full w-full agrosat-map agrosat-map-light'}
        bounds={displayBounds}
        boundsOptions={{ padding: [64, 64], maxZoom: 15 }}
        zoomControl={false}
      >
        <FitFarmBounds boundary={normalizedFarm.boundary} focusToken={focusToken} />
        <DrawParcelHandler drawToken={drawToken} onCreated={onParcelChange} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={isDark ? 0.2 : 0.12}
        />
        <TileLayer
          attribution='Tiles &copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          opacity={isDark ? 0.9 : 0.82}
        />

        {agriculturalPatches.map((patch) => (
          <Polygon
            key={patch.id}
            positions={patch.positions}
            interactive={false}
            pathOptions={{
              color: patch.color,
              fillColor: patch.color,
              fillOpacity: patch.opacity,
              opacity: isDark ? 0.42 : 0.34,
              weight: 1,
              className: 'agriculture-context-patch',
            }}
          />
        ))}

        {irrigationLines.map((line) => (
          <Polyline
            key={line.id}
            positions={line.positions}
            interactive={false}
            pathOptions={{
              color: '#38bdf8',
              opacity: isDark ? 0.42 : 0.32,
              weight: 2,
              className: 'irrigation-context-line',
            }}
          />
        ))}

        {showHealthOverlay &&
          satellitePixels.map((cell, index) => (
            <Polygon
              key={cell.id}
              positions={cell.positions}
              pathOptions={{
                color: colorForMode(cell, safeMode),
                fillColor: colorForMode(cell, safeMode),
                fillOpacity: safeRasterOpacity,
                opacity: Math.min(0.95, safeRasterOpacity + 0.2),
                weight: 0.8,
                className: `satellite-pixel-cell satellite-pixel-delay-${index % 20}`,
              }}
            />
          ))}

        <EditableParcelLayer
          boundary={normalizedFarm.boundary}
          farm={normalizedFarm}
          labels={mapLabels}
          highlighted={highlighted}
          showHealthOverlay={showHealthOverlay}
          onParcelChange={onParcelChange}
        />

        <Marker position={normalizedFarm.center} icon={markerIcon}>
          <Popup>
            <div className="space-y-1">
              <strong>{normalizedFarm.name}</strong>
              <div>{mapLabels.crop}: {normalizedFarm.crop}</div>
              <div>{normalizedFarm.location}</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {isAnalyzing && (
        <div className="pointer-events-none absolute inset-0 z-[600] overflow-hidden bg-slate-950/10">
          <div className="satellite-scan-line" />
          <div className="absolute left-1/2 top-1/2 w-[min(360px,80%)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-emerald-300/35 bg-slate-950/80 px-5 py-4 text-center text-sm font-semibold text-emerald-50 shadow-2xl backdrop-blur">
            {mapLabels.analyzingMap}
          </div>
        </div>
      )}
    </div>
  );
}
