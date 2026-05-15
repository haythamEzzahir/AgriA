'use strict';

// Pipeline orchestrator — runs Stages 1–8 in order.
// Implements the end-to-end flow described in CORE_PIPELINE_SPEC.md §1 and §11.

const sharp = require('sharp');
const config = require('./config');

const { searchScenes, pickBestScene, downloadIndex }   = require('./stage2_imagery');
const { downloadFromCopernicus }                       = require('./stage2_copernicus');
const { decodeGeoTIFF, rawToNdvi8bit, rawToNdvi16bit, rawToNdviFloat32,
        detectBitDepth, calibrate }                    = require('./stage3_decode');
const { mineValidPixels }                              = require('./stage4_mine');
const { computeZoneGrid, bucketize }                   = require('./stage5_zones');
const { mergeIndicesByZone }                           = require('./stage6_aggregate');
const { getFarmContext }                               = require('./farm_context');
const { runRuleEngine }                                = require('./stage7_rules');
const { translate }                                    = require('./stage8_translate');

// ── Heatmap colour ramps (server-side PNG generation) ──────────────────────

const NDVI_COLOR_STOPS = [
  { value: -1.0, r: 103, g: 0,   b: 13   },  // dark red   — water
  { value: -0.5, r: 178, g: 24,  b: 43   },  // red        — barren
  { value: -0.2, r: 214, g: 96,  b: 77   },  // orange     — sparse
  { value:  0.0, r: 255, g: 255, b: 191  },  // pale yellow — threshold
  { value:  0.2, r: 166, g: 217, b: 106  },  // light green
  { value:  0.5, r: 26,  g: 152, b: 80   },  // green
  { value:  1.0, r: 0,   g: 68,  b: 27   },  // dark green — dense
];

const NDWI_COLOR_STOPS = [
  { value: -1.0, r: 84,  g: 48,  b: 5    },  // dark brown — very dry
  { value: -0.5, r: 165, g: 129, b: 0    },  // brown      — dry
  { value: -0.2, r: 214, g: 196, b: 138  },  // tan        — low moisture
  { value:  0.0, r: 255, g: 255, b: 255  },  // white      — threshold
  { value:  0.2, r: 174, g: 214, b: 241  },  // light blue — moist
  { value:  0.5, r: 65,  g: 143, b: 216  },  // blue       — wet
  { value:  1.0, r: 8,   g: 48,  b: 107  },  // dark blue  — water
];

function valueToColor(value, stops) {
  if (Number.isNaN(value) || value < -2 || value > 2) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (value <= stops[0].value)      return { ...stops[0], a: 255 };
  if (value >= stops[stops.length - 1].value)
    return { ...stops[stops.length - 1], a: 255 };

  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i].value && value < stops[i + 1].value) {
      const t = (value - stops[i].value) / (stops[i + 1].value - stops[i].value);
      return {
        r: Math.round(stops[i].r + t * (stops[i + 1].r - stops[i].r)),
        g: Math.round(stops[i].g + t * (stops[i + 1].g - stops[i].g)),
        b: Math.round(stops[i].b + t * (stops[i + 1].b - stops[i].b)),
        a: 255,
      };
    }
  }
  return { r: 0, g: 0, b: 0, a: 0 };
}

async function pixelsToHeatmapPNG(decoded, indexName, bitDepth) {
  const { pixels, width, height } = decoded;
  const isFloat = bitDepth === 32;
  const stops   = indexName === 'ndwi' ? NDWI_COLOR_STOPS : NDVI_COLOR_STOPS;
  const invalidMax = bitDepth === 16 ? 65535 : 255;

  const rgba = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const raw = pixels[i];
    let value;

    if (raw === null || raw === undefined || Number.isNaN(raw)) continue;

    if (isFloat) {
      if (raw < -1 || raw > 1) continue;
      value = raw;
    } else {
      if (raw === 0 || raw === invalidMax) continue;
      value = bitDepth === 16
        ? raw / 32767.5 - 1
        : raw / 127.5  - 1;
    }

    const color = valueToColor(value, stops);
    const off   = i * 4;
    rgba[off]     = color.r;
    rgba[off + 1] = color.g;
    rgba[off + 2] = color.b;
    rgba[off + 3] = color.a;
  }

  const pngBuffer = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}

// §11.11 shape — counts zones by status tier, sums water, picks priority action.
function buildSummary(zoneDecisions, stale_data = false) {
  const counts = { critical: 0, stressed: 0, moderate: 0, healthy: 0 };
  let total_water = 0;
  const urgentZones = [];

  for (const z of zoneDecisions) {
    const tier = z.status || 'healthy';
    counts[tier]++;
    if (z.action?.amount_liters) total_water += z.action.amount_liters;
    if (z.decision === 'URGENT_IRRIGATION') urgentZones.push(z.zone_id);
  }

  const firstNonHealthy = zoneDecisions.find(z => z.decision !== 'HEALTHY');
  const priority_action = urgentZones.length > 0
    ? `URGENT_IRRIGATION on zones ${urgentZones.join(', ')}`
    : firstNonHealthy
      ? `${firstNonHealthy.decision} on zone ${firstNonHealthy.zone_id}`
      : 'HEALTHY';

  const summary = {
    healthy_zones:             counts.healthy,
    moderate_zones:            counts.moderate,
    stressed_zones:            counts.stressed,
    critical_zones:            counts.critical,
    total_water_needed_liters: total_water,
    priority_action,
    all_zones_no_data:         zoneDecisions.length === 0,
  };
  if (stale_data) summary.stale_data = true;
  return summary;
}

// §1 — Full 8-stage pipeline.
//
// farm: { agro_polygon_id, polygon_geojson, area_hectares, center, name, crop }
//        center is [lng, lat] (GeoJSON order, gotcha 12.1)
//
// _translateClient: optional injected DeepSeek client (for tests/demo).
async function runPipeline({ farm, language = 'mixed' }, _translateClient = null) {
  const analysis_id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { agro_polygon_id, polygon_geojson, area_hectares, center, name, crop } = farm;
  const apiKey = farm.apiKey || config.AGROMONITORING_API_KEY;

  // ── Step 1 + 2: acquire imagery (AgroMonitoring or Copernicus) ─────────────
  const imagerySource = config.IMAGERY_SOURCE;
  let ndviBuffer, ndwiBuffer, satellite_date, stale_data = false;
  let prerenderedUrls = null;  // AgroMonitoring scene.image.* PNG URLs

  if (imagerySource === 'copernicus') {
    // ── Copernicus path (free, global, fresh Sentinel-2 data) ─────────────────
    const turf = require('@turf/turf');
    const bbox = turf.bbox(polygon_geojson); // [minLng, minLat, maxLng, maxLat]

    try {
      ({ ndviBuffer, ndwiBuffer, satelliteDate: satellite_date } =
        await downloadFromCopernicus(bbox, 14));
    } catch (err) {
      console.warn(`[pipeline] Copernicus 14-day search failed: ${err.message}`);
      console.warn('[pipeline] Retrying with 30-day window...');
      try {
        ({ ndviBuffer, ndwiBuffer, satelliteDate: satellite_date } =
          await downloadFromCopernicus(bbox, 30));
        stale_data = true;
      } catch (err2) {
        throw new Error(`Copernicus: no Sentinel-2 scene found in 30 days. ${err2.message}`);
      }
    }

  } else {
    // ── AgroMonitoring path (existing behaviour) ──────────────────────────────
    const scenes14 = await searchScenes({ polygonId: agro_polygon_id, daysBack: 14, apiKey });
    let scene = pickBestScene(scenes14);

    if (!scene) {
      const scenes30 = await searchScenes({ polygonId: agro_polygon_id, daysBack: 30, apiKey });
      scene = pickBestScene(scenes30);
      if (!scene) {
        const all = [...scenes14, ...scenes30]
          .filter(s => s.dc > 0)
          .sort((a, b) => b.dt - a.dt);
        scene = all[0] || null;
        if (!scene) throw new Error('No satellite scenes available for this polygon in the last 30 days');
        stale_data = true;
        console.warn('[pipeline] Using stale scene — no qualifying scenes found in 30 days');
      }
    }

    if (scene.type === 's2') {
      console.warn('[pipeline] Selected scene is Sentinel-2 — NDWI data may be unreliable (API docs restrict NDWI to Landsat-8)');
    }

    satellite_date = new Date(scene.dt * 1000).toISOString();

    [ndviBuffer, ndwiBuffer] = await Promise.all([
      downloadIndex(scene, 'ndvi'),
      downloadIndex(scene, 'ndwi'),
    ]);

    if (scene.image) {
      prerenderedUrls = { ndvi: scene.image.ndvi, ndwi: scene.image.ndwi };
    }
  }

  // ── Farm context (AgroMonitoring soil + Open-Meteo weather) ────────────────
  const farmContext = await getFarmContext(agro_polygon_id, center, apiKey);

  // ── Step 3: decode ───────────────────────────────────────────────────────────
  const [ndviDecoded, ndwiDecoded] = await Promise.all([
    decodeGeoTIFF(ndviBuffer),
    decodeGeoTIFF(ndwiBuffer),
  ]);

  // Copernicus NDVI is computed from L2A reflectance using the standard formula;
  // it doesn't need calibration against an external stats endpoint.

  // ── Heatmap PNGs (must happen before stage 4 discards pixel arrays) ───────────
  const heatmapBitDepth = detectBitDepth(ndviDecoded.pixels);
  const [ndviHeatmapDataUrl, ndwiHeatmapDataUrl] = await Promise.all([
    pixelsToHeatmapPNG(ndviDecoded, 'ndvi', heatmapBitDepth),
    pixelsToHeatmapPNG(ndwiDecoded, 'ndwi', heatmapBitDepth),
  ]);

  // ── Step 4: mine valid pixels ────────────────────────────────────────────────
  // GeoTIFFs from AgroMonitoring's data.* endpoint use SampleFormat=3 (IEEE 754)
  // float — pixels are already NDVI in [-1, 1]. Local 8-bit fixtures use SampleFormat=1 (uint).
  const bitDepth = detectBitDepth(ndviDecoded.pixels);
  const isFloat  = bitDepth === 32;
  const decoder  = isFloat ? rawToNdviFloat32
                : bitDepth === 16 ? rawToNdvi16bit
                : rawToNdvi8bit;
  const ndviPixels = mineValidPixels(ndviDecoded, polygon_geojson, decoder, isFloat);
  const ndwiPixels = mineValidPixels(ndwiDecoded, polygon_geojson, decoder, isFloat);

  // ── Step 5: zone grid (computed once) + bucketize ───────────────────────────
  const zones      = computeZoneGrid(polygon_geojson);
  const ndviBuckets = bucketize(ndviPixels, zones);
  const ndwiBuckets = bucketize(ndwiPixels, zones);

  // ── Step 6: aggregate per zone + merge ──────────────────────────────────────
  const zoneStats = mergeIndicesByZone(ndviBuckets, ndwiBuckets);

  // ── Step 8: rule engine ──────────────────────────────────────────────────────
  const zoneDecisions = runRuleEngine(zoneStats, farmContext, area_hectares, crop);

  // ── Step 9: summary ──────────────────────────────────────────────────────────
  const summary = buildSummary(zoneDecisions, stale_data);

  // ── Step 10: narrative via DeepSeek ─────────────────────────────────────────
  const narrative = summary.all_zones_no_data
    ? null  // no zone data → skip translation (avoids AI hallucinating advice)
    : await translate(
        {
          farm:     { name, crop, analysis_date: new Date().toISOString().split('T')[0] },
          zones:    zoneDecisions,
          weather:  farmContext,
          language,
        },
        _translateClient
      );

  // Attach GeoJSON polygons to zone decisions so the frontend can render
  // the 3×3 grid on a map coloured by zone severity.
  const zoneMap = new Map(zones.map(z => [z.zone_id, z.polygon]));
  for (const zd of zoneDecisions) {
    const poly = zoneMap.get(zd.zone_id);
    if (poly) zd.polygon = poly;
  }

  return {
    analysis_id,
    farm_id:        agro_polygon_id,
    analysis_date:  new Date().toISOString(),
    satellite_date,
    imagery: {
      heatmap: {
        ndvi: ndviHeatmapDataUrl,
        ndwi: ndwiHeatmapDataUrl,
        bbox:  ndviDecoded.bbox,  // [minLng, minLat, maxLng, maxLat]
      },
      ...(prerenderedUrls ? { prerendered: prerenderedUrls } : {}),
    },
    summary,
    zones:          zoneDecisions,
    farm_context: {
      soil_moisture:   farmContext.soil_moisture,
      air_temperature: farmContext.air_temperature,
      rain_3d_mm:      farmContext.rain_3d_mm,
      et0_mm_per_day:  farmContext.et0_mm_per_day,
    },
    narrative,
    ...(farm._demo ? { is_demo_data: true } : {}),
  };
}

module.exports = { runPipeline, buildSummary };
