'use strict';

// We use AgroMonitoring's NDWI (NIR-SWIR formula). Thresholds below are for this NDWI, not NDMI.

// §9.2 — Threshold objects

const NDVI_THRESHOLDS = {
  CRITICAL: v => v < 0.2,
  WARNING:  v => v < 0.4,
  MODERATE: v => v < 0.6,
};

const NDWI_THRESHOLDS = {
  CRITICAL: v => v < 0.0,
  WARNING:  v => v < 0.2,
  MODERATE: v => v < 0.4,
};

const SOIL_THRESHOLDS = {
  CRITICAL: v => v < 0.15,
  WARNING:  v => v < 0.25,
  MODERATE: v => v < 0.35,
};

const TEMP_THRESHOLDS = {
  CRITICAL: v => v > 40,
  WARNING:  v => v > 35,
  MODERATE: v => v > 30,
};

const RAIN_THRESHOLDS = {
  CRITICAL: v => v < 1,
  WARNING:  v => v < 5,
  MODERATE: v => v < 10,
};

const FLAG_POINTS = { CRITICAL: 3, WARNING: 2, MODERATE: 1, OK: 0 };

function classify(value, thresholds) {
  for (const [flag, condition] of Object.entries(thresholds)) {
    if (condition(value)) return flag;
  }
  return 'OK';
}

// Per-zone water stress score.
// Per-zone signals (NDWI 0-4, NDVI 0-2) carry more weight than global
// signals (soil moisture 0-2, rain+ET 0-2) so zones differentiate.
function computeWaterScore(ndwi, ndvi, sm, et, rain_3d) {
  let score = 0;

  // Per-zone NDWI — 0 to 4
  if (ndwi < -0.15)       score += 4;
  else if (ndwi < -0.10)  score += 3;
  else if (ndwi < -0.05)  score += 2;
  else if (ndwi < 0.00)   score += 1;

  // Per-zone NDVI — 0 to 2
  if (ndvi < 0.20)        score += 2;
  else if (ndvi < 0.40)   score += 1;

  // Global soil moisture — 0 to 2 (reduced)
  if (sm < 0.15)          score += 2;
  else if (sm < 0.30)     score += 1;

  // Global rain + ET — 0 to 2 (reduced)
  if (rain_3d === 0 && et > 5) score += 2;
  else if (rain_3d < 5)        score += 1;

  return Math.min(score, 10);
}

function scoreZone(zone, farmContext) {
  const flags = {
    ndvi:          classify(zone.ndvi.mean, NDVI_THRESHOLDS),
    ndwi:          classify(zone.ndwi.mean, NDWI_THRESHOLDS),
    soil_moisture: classify(farmContext.soil_moisture, SOIL_THRESHOLDS),
    air_temp:      classify(farmContext.air_temperature, TEMP_THRESHOLDS),
    rain:          classify(farmContext.rain_3d_mm, RAIN_THRESHOLDS),
  };

  const water_score = computeWaterScore(
    zone.ndwi.mean,
    zone.ndvi.mean,
    farmContext.soil_moisture,
    farmContext.et0_mm_per_day || 5,
    farmContext.rain_3d_mm
  );
  const heat_score       = FLAG_POINTS[flags.air_temp];
  const vegetation_score = FLAG_POINTS[flags.ndvi];

  return { flags, water_score, heat_score, vegetation_score };
}

function decide(scores) {
  const { water_score, heat_score, vegetation_score } = scores;

  // Severe per-zone water stress escalates to URGENT even without heat
  if (water_score >= 8) {
    return { code: 'URGENT_IRRIGATION', priority: 'HIGH',   summary: 'Severe water stress — irrigate immediately' };
  }
  if (water_score >= 6 && heat_score >= 2) {
    return { code: 'URGENT_IRRIGATION', priority: 'HIGH',   summary: 'Critical drought + heat — irrigate immediately' };
  }
  if (water_score >= 6) {
    return { code: 'IRRIGATE_SOON',     priority: 'MEDIUM', summary: 'Water stress confirmed — irrigate within 24h' };
  }
  if (water_score >= 4) {
    return { code: 'MONITOR_WATER',     priority: 'LOW',    summary: 'Early water stress — prepare to irrigate' };
  }
  if (heat_score >= 2 && vegetation_score >= 2) {
    return { code: 'HEAT_PROTECTION',   priority: 'MEDIUM', summary: 'Heat stress on stressed vegetation — shade or mulch' };
  }
  if (vegetation_score >= 2 && water_score < 2 && heat_score < 2) {
    return { code: 'INVESTIGATE',       priority: 'MEDIUM', summary: 'Vegetation stressed but water/heat OK — check pests/disease' };
  }
  return { code: 'HEALTHY',             priority: 'INFO',   summary: 'Zone is healthy' };
}

// Per-zone severity classifier — derives status from the zone's own NDWI/NDVI
// plus the farm-wide soil moisture.  This is what drives the map colours and
// summary counts so that zones with different vegetation/water levels show
// different statuses even under the same global weather.
function classifyZoneSeverity(zone, farmContext) {
  const ndwi = zone.ndwi.mean;
  const ndvi = zone.ndvi.mean;
  const sm   = farmContext.soil_moisture;

  if (ndwi < -0.15 || ndvi < 0.20 || (ndwi < -0.08 && sm < 0.10)) {
    return 'critical';
  }
  if (ndwi < -0.08 || ndvi < 0.35 || sm < 0.15) {
    return 'stressed';
  }
  if (ndwi < -0.03 || ndvi < 0.55 || sm < 0.25) {
    return 'moderate';
  }
  return 'healthy';
}

// Crop parameters — FAO-56 Kc (mid-season) and rooting depth.
// Source: FAO-56 guidelines, adapted for Souss-Massa semi-arid conditions.
const CROP_PARAMS = {
  tomato: { kc: 1.15, root_mm: 400 },
  wheat:  { kc: 1.15, root_mm: 600 },
  barley: { kc: 1.10, root_mm: 600 },
  maize:  { kc: 1.20, root_mm: 500 },
  olive:  { kc: 0.65, root_mm: 1000 },
  citrus: { kc: 0.75, root_mm: 800 },
  default:{ kc: 1.00, root_mm: 400 },
};

const FIELD_CAPACITY = 0.32;  // m³/m³ — sandy loam (dominant in Souss-Massa)
const REPLENISH_FRAC = 0.07;  // fraction of soil deficit refilled per event

// Per-zone stress multiplier derived from NDWI (NIR-SWIR formula).
// NDWI < 0 → water stress (dry vegetation). NDWI > 0.3 → well-watered.
// Returns 0.5–1.65: stressed zones get up to 65% more water, wet zones get less.
function ndwiStressFactor(ndwi) {
  // Linear mapping: NDWI 0.4 (wet) → 0.5, NDWI -0.2 (very dry) → 1.65
  const raw = 1.0 + (0.2 - ndwi) * 1.5;
  return Math.max(0.5, Math.min(1.65, raw));
}

// ── Irrigation Schedule — Two-Component Model ─────────────────────────────
//
// Component 1 — Daily crop evapotranspiration demand:
//   ETc        = ET₀ × Kc                    reference ET, crop-adjusted
//   daily_etc  = ETc × stress_mult            scaled by per-zone NDWI stress
//
// Component 2 — Soil moisture deficit recovery:
//   deficit_m³/m³ = field_capacity − current_soil_moisture
//   deficit_mm    = deficit_m³/m³ × root_depth_mm × replenish_frac
//   Gradually refills the root zone towards field capacity over multiple
//   irrigation events. REPLENISH_FRAC = 0.07 (7% of deficit per event)
//   prevents root shock and runoff.
//
// irrigation_mm = daily_etc + deficit_recovery
// If depth > 10 mm → split_sessions = 2 (apply half in the morning,
// half in the evening to avoid runoff and improve infiltration).
// ──────────────────────────────────────────────────────────────────────────

function computeIrrigationAmount(decision, farmContext, zoneNdwi, pixelCount, crop) {
  if (!['URGENT_IRRIGATION', 'IRRIGATE_SOON'].includes(decision.code)) return null;

  const cropKey = String(crop || '').toLowerCase();
  const params = CROP_PARAMS[cropKey] || CROP_PARAMS.default;
  const et0_mm = farmContext.et0_mm_per_day || 5;
  const etc_mm  = et0_mm * params.kc;                     // crop-adjusted ET₀

  // Component 1 — daily crop demand scaled by per-zone NDWI stress
  const stressMult = ndwiStressFactor(zoneNdwi);
  const daily_etc_mm = etc_mm * stressMult;

  // Component 2 — soil moisture deficit recovery
  const sm = farmContext.soil_moisture;
  const deficit_m3m3 = Math.max(0, FIELD_CAPACITY - sm);
  const deficit_mm = deficit_m3m3 * params.root_mm * REPLENISH_FRAC;

  const irrigationMm = daily_etc_mm + deficit_mm;

  // Each Sentinel-2 pixel = 10 m × 10 m = 100 m² = 0.01 ha
  const zoneAreaHa = pixelCount * 0.01;
  const litersForZone = Math.round(irrigationMm * 10000 * zoneAreaHa);

  const result = {
    amount_mm:          parseFloat(irrigationMm.toFixed(1)),
    amount_liters:      litersForZone,
    timing:             decision.code === 'URGENT_IRRIGATION' ? 'before_7am' : 'within_24h',
    zone_area_ha:       parseFloat(zoneAreaHa.toFixed(3)),
    components: {
      daily_etc_mm:       parseFloat(daily_etc_mm.toFixed(1)),
      deficit_recovery_mm: parseFloat(deficit_mm.toFixed(1)),
      field_capacity:     FIELD_CAPACITY,
      current_soil_moisture: sm,
      root_depth_mm:      params.root_mm,
      replenish_fraction: REPLENISH_FRAC,
    },
    stress_multiplier:  parseFloat(stressMult.toFixed(2)),
  };

  // Split into 2 sessions when depth exceeds 10 mm to avoid runoff
  if (irrigationMm > 10) {
    result.split_sessions = 2;
    result.per_session_mm = parseFloat((irrigationMm / 2).toFixed(1));
  }

  return result;
}

function runRuleEngine(zoneStatsArray, farmContext, farmAreaHa, crop = 'default') {
  const result = zoneStatsArray
    .filter(zone => zone.ndvi.status !== 'no_data' && zone.ndwi.status !== 'no_data')
    .map(zone => {
      const scores     = scoreZone(zone, farmContext);
      const decision   = decide(scores);
      const status     = classifyZoneSeverity(zone, farmContext);
      const pixelCount = zone.ndvi.count;
      const ndwiMean   = zone.ndwi.mean;
      const action     = computeIrrigationAmount(decision, farmContext, ndwiMean, pixelCount, crop);
      const confidence = pixelCount >= 10 ? 'HIGH' : pixelCount >= 5 ? 'MEDIUM' : 'LOW';

      return {
        zone_id:  zone.zone_id,
        position: zone.position,
        status,
        decision: decision.code,
        priority: decision.priority,
        summary:  decision.summary,
        scores,
        action,
        confidence,
        metrics: {
          ndvi_mean:   zone.ndvi.mean,
          ndwi_mean:   ndwiMean,
          pixel_count: pixelCount,
        },
      };
    });

  // Regression guard — catches the "all zones same score/status" bug if it
  // ever comes back during future edits.
  if (process.env.NODE_ENV !== 'production' && result.length >= 5) {
    const ndwis    = result.map(z => z.metrics.ndwi_mean);
    const scores   = result.map(z => z.scores.water_score);
    const statuses = result.map(z => z.status);
    const ndwiRange = Math.max(...ndwis) - Math.min(...ndwis);

    if (ndwiRange > 0.05 && new Set(scores).size === 1) {
      console.error('[REGRESSION] NDWI range', ndwiRange.toFixed(3),
        'but all water_scores =', scores[0]);
    }
    if (ndwiRange > 0.08 && new Set(statuses).size === 1) {
      console.warn('[REGRESSION] NDWI range', ndwiRange.toFixed(3),
        'but all zones status =', statuses[0]);
    }
  }

  return result;
}

module.exports = {
  NDVI_THRESHOLDS, NDWI_THRESHOLDS, SOIL_THRESHOLDS, TEMP_THRESHOLDS, RAIN_THRESHOLDS,
  FLAG_POINTS,
  classify, computeWaterScore, classifyZoneSeverity, scoreZone, decide,
  computeIrrigationAmount, runRuleEngine,
};
