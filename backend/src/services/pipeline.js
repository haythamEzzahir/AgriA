import * as turf from '@turf/turf';
import { config } from '../config/index.js';

const ZONE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const ZONE_POSITIONS = ['NW', 'N', 'NE', 'W', 'Center', 'E', 'SW', 'S', 'SE'];

// ── Stage 4: Per-pixel mining ────────────────────────────────────────────
function pixelToLngLat(col, row, width, height, bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lng = minLng + ((col + 0.5) / width) * (maxLng - minLng);
  const lat = maxLat - ((row + 0.5) / height) * (maxLat - minLat);
  return [lng, lat];
}

function isValidPixel(raw) {
  if (raw === null || raw === undefined || Number.isNaN(raw)) return false;
  if (raw instanceof Float32Array || raw instanceof Float64Array) {
    return raw >= -1 && raw <= 1;
  }
  if (raw === 0 || raw === 255) return false;
  return true;
}

function mineValidPixels(decoded, farmPolygon) {
  const { pixels, width, height, bbox } = decoded;
  const valid = [];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const raw = pixels[row * width + col];
      if (!isValidPixel(raw)) continue;
      const [lng, lat] = pixelToLngLat(col, row, width, height, bbox);
      const pt = turf.point([lng, lat]);
      if (!turf.booleanPointInPolygon(pt, farmPolygon)) continue;
      valid.push({
        lng, lat,
        value: pixels instanceof Float32Array || pixels instanceof Float64Array ? raw : raw / 127.5 - 1,
      });
    }
  }
  return valid;
}

// ── Stage 5: Zone grid ───────────────────────────────────────────────────
function computeZoneGrid(farmPolygon) {
  const fxBbox = turf.bbox(farmPolygon);
  const [minLng, minLat, maxLng, maxLat] = fxBbox;
  const lngStep = (maxLng - minLng) / 3;
  const latStep = (maxLat - minLat) / 3;
  const zones = [];

  for (let j = 2; j >= 0; j--) {
    for (let i = 0; i < 3; i++) {
      const west = minLng + i * lngStep;
      const east = minLng + (i + 1) * lngStep;
      const south = minLat + j * latStep;
      const north = minLat + (j + 1) * latStep;
      const idx = zones.length;
      zones.push({
        bounds: [west, south, east, north],
        polygon: turf.bboxPolygon([west, south, east, north]),
        zone_id: ZONE_LABELS[idx],
        position: ZONE_POSITIONS[idx],
      });
    }
  }
  return zones;
}

function findZoneIndex(lng, lat, zones) {
  for (let i = 0; i < zones.length; i++) {
    const [west, south, east, north] = zones[i].bounds;
    if (lng >= west && lng < east && lat >= south && lat < north) return i;
  }
  return -1;
}

function bucketize(validPixels, zones) {
  const buckets = Array.from({ length: 9 }, () => []);
  for (const px of validPixels) {
    const idx = findZoneIndex(px.lng, px.lat, zones);
    if (idx === -1) continue;
    buckets[idx].push(px.value);
  }
  return buckets;
}

// ── Stage 6: Aggregation ─────────────────────────────────────────────────
function aggregateZone(values) {
  if (!values.length) return { count: 0, status: 'no_data' };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return {
    count: n, mean, min: sorted[0], max: sorted[n - 1],
    median: n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2],
    std: Math.sqrt(variance),
  };
}

function mergeIndicesByZone(ndviBuckets, ndwiBuckets) {
  return ndviBuckets.map((ndviValues, i) => ({
    zone_id: ZONE_LABELS[i],
    position: ZONE_POSITIONS[i],
    ndvi: aggregateZone(ndviValues),
    ndwi: aggregateZone(ndwiBuckets[i]),
  }));
}

// ── Stage 7: Rule engine ─────────────────────────────────────────────────
const NDVI_THRESHOLDS = {
  CRITICAL: v => v < 0.2, WARNING: v => v < 0.4, MODERATE: v => v < 0.6,
};
const NDWI_THRESHOLDS = {
  CRITICAL: v => v < 0.0, WARNING: v => v < 0.2, MODERATE: v => v < 0.4,
};
const SOIL_THRESHOLDS = {
  CRITICAL: v => v < 0.15, WARNING: v => v < 0.25, MODERATE: v => v < 0.35,
};
const TEMP_THRESHOLDS = {
  CRITICAL: v => v > 40, WARNING: v => v > 35, MODERATE: v => v > 30,
};
const RAIN_THRESHOLDS = {
  CRITICAL: v => v < 1, WARNING: v => v < 5, MODERATE: v => v < 10,
};
const FLAG_POINTS = { CRITICAL: 3, WARNING: 2, MODERATE: 1, OK: 0 };

function classify(value, thresholds) {
  for (const [flag, condition] of Object.entries(thresholds)) {
    if (condition(value)) return flag;
  }
  return 'OK';
}

function classifyZoneSeverity(zone) {
  const ndwi = zone.ndwi.mean;
  const ndvi = zone.ndvi.mean;
  if (ndwi < -0.15 || ndvi < 0.20) return 'critical';
  if (ndwi < -0.08 || ndvi < 0.35) return 'stressed';
  if (ndwi < -0.03 || ndvi < 0.55) return 'moderate';
  return 'healthy';
}

const CROP_PARAMS = {
  tomato: { kc: 1.15, root_mm: 400 }, wheat: { kc: 1.15, root_mm: 600 },
  barley: { kc: 1.10, root_mm: 600 }, maize: { kc: 1.20, root_mm: 500 },
  olive: { kc: 0.65, root_mm: 1000 }, citrus: { kc: 0.75, root_mm: 800 },
  default: { kc: 1.00, root_mm: 400 },
};
const FIELD_CAPACITY = 0.32;
const REPLENISH_FRAC = 0.07;

function ndwiStressFactor(ndwi) {
  return Math.max(0.5, Math.min(1.65, 1.0 + (0.2 - ndwi) * 1.5));
}

function computeIrrigationAmount(decisionCode, farmContext, ndwi, pixelCount, crop) {
  if (!['URGENT_IRRIGATION', 'IRRIGATE_SOON'].includes(decisionCode)) return null;

  const cropKey = (crop || '').toLowerCase();
  const params = CROP_PARAMS[cropKey] || CROP_PARAMS.default;
  const et0 = farmContext.et0_mm_per_day || 5;
  const etc = et0 * params.kc;
  const stressMult = ndwiStressFactor(ndwi);
  const dailyEtc = etc * stressMult;
  const deficit = Math.max(0, FIELD_CAPACITY - (farmContext.soil_moisture ?? 0.2));
  const deficitMm = deficit * params.root_mm * REPLENISH_FRAC;
  const irrigationMm = dailyEtc + deficitMm;
  const zoneAreaHa = pixelCount * 0.01;
  const liters = Math.round(irrigationMm * 10000 * zoneAreaHa);

  const result = {
    amount_mm: +irrigationMm.toFixed(1),
    amount_liters: liters,
    timing: decisionCode === 'URGENT_IRRIGATION' ? 'before_7am' : 'within_24h',
    zone_area_ha: +zoneAreaHa.toFixed(3),
    stress_multiplier: +stressMult.toFixed(2),
  };
  if (irrigationMm > 10) {
    result.split_sessions = 2;
    result.per_session_mm = +(irrigationMm / 2).toFixed(1);
  }
  return result;
}

function runRuleEngine(zoneStats, farmContext, crop = 'default') {
  return zoneStats
    .filter(z => z.ndvi.status !== 'no_data')
    .map(z => {
      const ndwiMean = z.ndwi.mean;
      const flags = {
        ndvi: classify(z.ndvi.mean, NDVI_THRESHOLDS),
        ndwi: classify(ndwiMean, NDWI_THRESHOLDS),
        soil_moisture: classify(farmContext.soil_moisture ?? 0.2, SOIL_THRESHOLDS),
        air_temp: classify(farmContext.air_temperature ?? 25, TEMP_THRESHOLDS),
        rain: classify(farmContext.rain_3d_mm ?? 5, RAIN_THRESHOLDS),
      };

      const waterScore = Math.min(10, (ndwiMean < -0.15 ? 4 : ndwiMean < -0.10 ? 3 : ndwiMean < -0.05 ? 2 : ndwiMean < 0 ? 1 : 0)
        + (z.ndvi.mean < 0.20 ? 2 : z.ndvi.mean < 0.40 ? 1 : 0)
        + ((farmContext.soil_moisture ?? 0.2) < 0.15 ? 2 : (farmContext.soil_moisture ?? 0.2) < 0.30 ? 1 : 0));
      const heatScore = FLAG_POINTS[flags.air_temp];
      const vegScore = FLAG_POINTS[flags.ndvi];

      let decision, priority, summary;
      if (waterScore >= 8) { decision = 'URGENT_IRRIGATION'; priority = 'HIGH'; summary = 'Severe water stress — irrigate immediately'; }
      else if (waterScore >= 6 && heatScore >= 2) { decision = 'URGENT_IRRIGATION'; priority = 'HIGH'; summary = 'Critical drought + heat'; }
      else if (waterScore >= 6) { decision = 'IRRIGATE_SOON'; priority = 'MEDIUM'; summary = 'Water stress — irrigate within 24h'; }
      else if (waterScore >= 4) { decision = 'MONITOR_WATER'; priority = 'LOW'; summary = 'Early water stress — prepare to irrigate'; }
      else if (heatScore >= 2 && vegScore >= 2) { decision = 'HEAT_PROTECTION'; priority = 'MEDIUM'; summary = 'Heat stress on stressed vegetation'; }
      else if (vegScore >= 2) { decision = 'INVESTIGATE'; priority = 'MEDIUM'; summary = 'Vegetation stressed — check pests/disease'; }
      else { decision = 'HEALTHY'; priority = 'INFO'; summary = 'Zone is healthy'; }

      const status = classifyZoneSeverity(z);
      const action = computeIrrigationAmount(decision, farmContext, ndwiMean, z.ndvi.count, crop);

      return {
        zone_id: z.zone_id, position: z.position, status, decision, priority, summary,
        confidence: z.ndvi.count >= 10 ? 'HIGH' : z.ndvi.count >= 5 ? 'MEDIUM' : 'LOW',
        metrics: { ndvi_mean: z.ndvi.mean, ndwi_mean: ndwiMean, pixel_count: z.ndvi.count },
        scores: { flags, water_score: waterScore, heat_score: heatScore, vegetation_score: vegScore },
        action,
      };
    });
}

function buildSummary(zoneDecisions) {
  const counts = { critical: 0, stressed: 0, moderate: 0, healthy: 0 };
  let totalWater = 0;
  const urgentZones = [];

  for (const z of zoneDecisions) {
    counts[z.status || 'healthy']++;
    if (z.action?.amount_liters) totalWater += z.action.amount_liters;
    if (z.decision === 'URGENT_IRRIGATION') urgentZones.push(z.zone_id);
  }

  const firstNonHealthy = zoneDecisions.find(z => z.decision !== 'HEALTHY');
  const priorityAction = urgentZones.length > 0
    ? `URGENT on zones ${urgentZones.join(', ')}`
    : firstNonHealthy ? `${firstNonHealthy.decision} on zone ${firstNonHealthy.zone_id}` : 'HEALTHY';

  return {
    ...counts, total_water_needed_liters: totalWater, priority_action: priorityAction,
    all_zones_no_data: zoneDecisions.length === 0,
  };
}

// ── Stage 8: DeepSeek narrative ──────────────────────────────────────────
import OpenAI from 'openai';

function buildSystemPrompt(language) {
  const langInstruction = language === 'fr' ? 'Respond in French only.'
    : language === 'darija' ? 'Respond in Moroccan Darija only (Arabic script).'
    : 'Respond in a natural mix of Moroccan Darija (Arabic script) and French.';

  return `You are an agricultural advisor speaking to Moroccan farmers.
Translate technical zone analyses into clear, actionable advice.
Be specific: name the zone, the action, the timing, the amount.
Never invent data — only describe what's in the input.

If every zone has decision=HEALTHY, give a short congratulatory summary (2-3 sentences).

${langInstruction}`;
}

async function generateNarrative({ farm, zones, weather, language = 'mixed' }) {
  if (!config.deepseek.apiKey) return null;

  const client = new OpenAI({
    apiKey: config.deepseek.apiKey,
    baseURL: config.deepseek.baseUrl,
  });

  const allHealthy = zones.every(z => z.decision === 'HEALTHY');
  if (allHealthy) return null;

  try {
    const res = await client.chat.completions.create({
      model: config.deepseek.model,
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: buildSystemPrompt(language) },
        { role: 'user', content: JSON.stringify({
          farm_name: farm.name, crop: farm.crop,
          weather_context: {
            temperature: weather.air_temperature,
            rain_forecast_3d_mm: weather.rain_3d_mm,
            soil_moisture_percent: Math.round((weather.soil_moisture ?? 0.2) * 100),
          },
          zones: zones.map(z => ({
            id: z.zone_id, position: z.position, status: z.status,
            decision: z.decision, ...(z.action ? { action: z.action } : {}),
          })),
        }) },
      ],
    });
    return res.choices[0].message.content;
  } catch (err) {
    console.warn('DeepSeek narrative failed:', err.message);
    return null;
  }
}

// ── Open-Meteo weather ───────────────────────────────────────────────────
async function fetchWeather(lat, lng) {
  const base = config.openMeteo.base;
  const url = `${base}/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration&forecast_days=4&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  return {
    air_temperature: data.daily.temperature_2m_max[0],
    rain_3d_mm: data.daily.precipitation_sum.slice(0, 3).reduce((s, v) => s + v, 0),
    et0_mm_per_day: data.daily.et0_fao_evapotranspiration[0],
  };
}

// ── Heatmap PNG generation (server-side) ────────────────────────────────
import sharp from 'sharp';

const NDVI_COLORS = [
  [-1.0, 103, 0, 13], [-0.5, 178, 24, 43], [-0.2, 214, 96, 77],
  [0.0, 255, 255, 191], [0.2, 166, 217, 106], [0.5, 26, 152, 80], [1.0, 0, 68, 27],
];
const NDWI_COLORS = [
  [-1.0, 84, 48, 5], [-0.5, 165, 129, 0], [-0.2, 214, 196, 138],
  [0.0, 255, 255, 255], [0.2, 174, 214, 241], [0.5, 65, 143, 216], [1.0, 8, 48, 107],
];

function valueToColor(value, stops) {
  if (Number.isNaN(value) || value < -2 || value > 2) return [0, 0, 0, 0];
  if (value <= stops[0][0]) return [...stops[0].slice(1), 255];
  if (value >= stops[stops.length - 1][0]) return [...stops[stops.length - 1].slice(1), 255];
  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i][0] && value < stops[i + 1][0]) {
      const t = (value - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      return [
        Math.round(stops[i][1] + t * (stops[i + 1][1] - stops[i][1])),
        Math.round(stops[i][2] + t * (stops[i + 1][2] - stops[i][2])),
        Math.round(stops[i][3] + t * (stops[i + 1][3] - stops[i][3])),
        255,
      ];
    }
  }
  return [0, 0, 0, 0];
}

function pointInPolygonRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

async function pixelsToHeatmapPNG(pixels, width, height, indexName, bbox, polygonRing) {
  const stops = indexName === 'ndwi' ? NDWI_COLORS : NDVI_COLORS;
  const rgba = Buffer.alloc(width * height * 4);
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lngStep = (maxLng - minLng) / width;
  const latStep = (maxLat - minLat) / height;

  for (let row = 0; row < height; row++) {
    const lat = maxLat - (row + 0.5) * latStep;
    for (let col = 0; col < width; col++) {
      if (polygonRing) {
        const lng = minLng + (col + 0.5) * lngStep;
        if (!pointInPolygonRing(lng, lat, polygonRing)) continue;
      }
      const i = row * width + col;
      const raw = pixels[i];
      let value;
      if (raw === null || raw === undefined || Number.isNaN(raw)) continue;
      if (pixels instanceof Float32Array || pixels instanceof Float64Array) {
        if (raw < -1 || raw > 1) continue;
        value = raw;
      } else {
        if (raw === 0 || raw === 255) continue;
        value = raw / 127.5 - 1;
      }
      const color = valueToColor(value, stops);
      const off = i * 4;
      rgba[off] = color[0]; rgba[off + 1] = color[1]; rgba[off + 2] = color[2]; rgba[off + 3] = color[3];
    }
  }

  const pngBuffer = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}

// ── Main pipeline orchestrator ───────────────────────────────────────────
export async function runPipeline({ farm, language = 'mixed' }) {
  const { polygon_geojson, center, name, crop, apiKey, lat, lon } = farm;
  const analysisId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // 1. Get satellite imagery
  const { downloadFromCopernicus } = await import('./copernicus.js');
  const bbox = turf.bbox(polygon_geojson);
  let ndviBuffer, ndwiBuffer, satelliteDate, stale = false;

  try {
    const result = await downloadFromCopernicus(bbox, 14);
    ndviBuffer = result.ndviBuffer;
    ndwiBuffer = result.ndwiBuffer;
    satelliteDate = result.satelliteDate;
    stale = result.stale;
  } catch (err) {
    console.warn('Copernicus 14d failed, trying 30d:', err.message);
    try {
      const result = await downloadFromCopernicus(bbox, 30);
      ndviBuffer = result.ndviBuffer;
      ndwiBuffer = result.ndwiBuffer;
      satelliteDate = result.satelliteDate;
      stale = true;
    } catch (err2) {
      throw new Error(`Copernicus: no scene found. ${err2.message}`);
    }
  }

  // 2. Decode
  const { decodeGeoTIFF } = await import('./copernicus.js');
  const [ndviDecoded, ndwiDecoded] = await Promise.all([
    decodeGeoTIFF(ndviBuffer),
    decodeGeoTIFF(ndwiBuffer),
  ]);

  // 3. Generate heatmaps (clipped to polygon)
  const polygonRing =
    polygon_geojson.geometry?.coordinates?.[0] ||
    polygon_geojson.coordinates?.[0] ||
    null;
  const [ndviHeatmap, ndwiHeatmap] = await Promise.all([
    pixelsToHeatmapPNG(ndviDecoded.pixels, ndviDecoded.width, ndviDecoded.height, 'ndvi', ndviDecoded.bbox, polygonRing),
    pixelsToHeatmapPNG(ndwiDecoded.pixels, ndwiDecoded.width, ndwiDecoded.height, 'ndwi', ndwiDecoded.bbox, polygonRing),
  ]);

  // 4. Mine valid pixels
  const ndviPixels = mineValidPixels(ndviDecoded, polygon_geojson);
  const ndwiPixels = mineValidPixels(ndwiDecoded, polygon_geojson);

  // 4b. Combine pixels into single array with both indices
  const ndwiByKey = new Map();
  for (const p of ndwiPixels) {
    ndwiByKey.set(`${p.lng.toFixed(5)}:${p.lat.toFixed(5)}`, p.value);
  }
  const combinedPixels = ndviPixels.map(p => {
    const key = `${p.lng.toFixed(5)}:${p.lat.toFixed(5)}`;
    return { lng: p.lng, lat: p.lat, ndvi: p.value, ndwi: ndwiByKey.get(key) ?? null };
  });

  // 4c. Farm-wide statistics
  const ndviValues = ndviPixels.map(p => p.value).filter(v => v != null);
  const ndwiValues = ndwiPixels.map(p => p.value).filter(v => v != null);
  const computeStats = (arr) => {
    if (!arr.length) return { count: 0, mean: null, min: null, max: null, median: null, std: null };
    const sorted = [...arr].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = arr.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    return {
      count: n, mean: +mean.toFixed(4), min: +sorted[0].toFixed(4),
      max: +sorted[n - 1].toFixed(4),
      median: n % 2 === 0 ? +((sorted[n / 2 - 1] + sorted[n / 2]) / 2).toFixed(4) : +sorted[(n - 1) / 2].toFixed(4),
      std: +Math.sqrt(variance).toFixed(4),
    };
  };
  const farmStats = { ndvi: computeStats(ndviValues), ndwi: computeStats(ndwiValues) };

  // 5. Zone grid
  const zones = computeZoneGrid(polygon_geojson);
  const ndviBuckets = bucketize(ndviPixels, zones);
  const ndwiBuckets = bucketize(ndwiPixels, zones);

  // 6. Aggregate
  const zoneStats = mergeIndicesByZone(ndviBuckets, ndwiBuckets);

  // 7. Weather & context
  const [lng, clat] = center || [lon, lat];
  const weather = await fetchWeather(clat, lng).catch(() => ({
    air_temperature: 25, rain_3d_mm: 5, et0_mm_per_day: 5,
  }));

  const soilMoisture = weather.soil_moisture ?? 0.2;

  // 8. Rule engine
  const zoneDecisions = runRuleEngine(zoneStats, { ...weather, soil_moisture: soilMoisture }, crop);

  // 9. Summary
  const summary = buildSummary(zoneDecisions);

  // 10. Attach polygons
  const zoneMap = new Map(zones.map(z => [z.zone_id, z.polygon]));
  for (const zd of zoneDecisions) {
    const poly = zoneMap.get(zd.zone_id);
    if (poly) zd.polygon = poly;
  }

  // 11. Narrative
  const narrative = await generateNarrative({
    farm: { name, crop, analysis_date: new Date().toISOString() },
    zones: zoneDecisions,
    weather: { ...weather, soil_moisture: soilMoisture },
    language,
  });

  return {
    analysis_id: analysisId,
    farm_id: farm.id || 'unknown',
    analysis_date: new Date().toISOString(),
    satellite_date: satelliteDate,
    imagery: {
      heatmap: { ndvi: ndviHeatmap, ndwi: ndwiHeatmap, bbox: ndviDecoded.bbox },
      resolution_m: 10,
    },
    pixels: combinedPixels.slice(0, 5000),
    statistics: farmStats,
    summary,
    zones: zoneDecisions.map(z => ({
      ...z,
      polygon: z.polygon ? z.polygon.geometry || z.polygon : null,
    })),
    farm_context: {
      soil_moisture: soilMoisture,
      air_temperature: weather.air_temperature,
      rain_3d_mm: weather.rain_3d_mm,
      et0_mm_per_day: weather.et0_mm_per_day,
    },
    narrative,
  };
}
