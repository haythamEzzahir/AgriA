import { describe, it, expect } from 'vitest';
import {
  NDVI_THRESHOLDS, NDWI_THRESHOLDS, SOIL_THRESHOLDS, TEMP_THRESHOLDS, RAIN_THRESHOLDS,
  FLAG_POINTS,
  classify, computeWaterScore, classifyZoneSeverity, scoreZone, decide,
  computeIrrigationAmount, runRuleEngine,
} from '../src/stage7_rules.js';

// ─── classify ────────────────────────────────────────────────────────────────

describe('classify', () => {
  it('NDVI: 0.19 → CRITICAL, 0.20 → WARNING, 0.39 → WARNING, 0.40 → MODERATE, 0.60 → OK', () => {
    expect(classify(0.19, NDVI_THRESHOLDS)).toBe('CRITICAL');
    expect(classify(0.20, NDVI_THRESHOLDS)).toBe('WARNING');
    expect(classify(0.39, NDVI_THRESHOLDS)).toBe('WARNING');
    expect(classify(0.40, NDVI_THRESHOLDS)).toBe('MODERATE');
    expect(classify(0.60, NDVI_THRESHOLDS)).toBe('OK');
  });

  it('NDWI: -0.01 → CRITICAL, 0.0 → WARNING, 0.05 → WARNING, 0.20 → MODERATE, 0.40 → OK', () => {
    expect(classify(-0.01, NDWI_THRESHOLDS)).toBe('CRITICAL');
    expect(classify(0.0,  NDWI_THRESHOLDS)).toBe('WARNING');
    expect(classify(0.05, NDWI_THRESHOLDS)).toBe('WARNING');
    expect(classify(0.20, NDWI_THRESHOLDS)).toBe('MODERATE');
    expect(classify(0.40, NDWI_THRESHOLDS)).toBe('OK');
  });

  it('SOIL: 0.14 → CRITICAL, 0.15 → WARNING, 0.24 → WARNING, 0.25 → MODERATE, 0.35 → OK', () => {
    expect(classify(0.14, SOIL_THRESHOLDS)).toBe('CRITICAL');
    expect(classify(0.15, SOIL_THRESHOLDS)).toBe('WARNING');
    expect(classify(0.25, SOIL_THRESHOLDS)).toBe('MODERATE');
    expect(classify(0.35, SOIL_THRESHOLDS)).toBe('OK');
  });

  it('TEMP: 41 → CRITICAL, 40 → WARNING, 36 → WARNING, 35 → MODERATE, 30 → OK', () => {
    expect(classify(41, TEMP_THRESHOLDS)).toBe('CRITICAL');
    expect(classify(40, TEMP_THRESHOLDS)).toBe('WARNING');
    expect(classify(36, TEMP_THRESHOLDS)).toBe('WARNING');
    expect(classify(35, TEMP_THRESHOLDS)).toBe('MODERATE');
    expect(classify(30, TEMP_THRESHOLDS)).toBe('OK');
  });

  it('RAIN: 0 → CRITICAL, 1 → WARNING, 4 → WARNING, 5 → MODERATE, 10 → OK', () => {
    expect(classify(0,  RAIN_THRESHOLDS)).toBe('CRITICAL');
    expect(classify(1,  RAIN_THRESHOLDS)).toBe('WARNING');
    expect(classify(4,  RAIN_THRESHOLDS)).toBe('WARNING');
    expect(classify(5,  RAIN_THRESHOLDS)).toBe('MODERATE');
    expect(classify(10, RAIN_THRESHOLDS)).toBe('OK');
  });

  it('returns OK when no threshold matches', () => {
    expect(classify(0.9, NDVI_THRESHOLDS)).toBe('OK');
  });
});

// ─── FLAG_POINTS ─────────────────────────────────────────────────────────────

describe('FLAG_POINTS', () => {
  it('has correct point values', () => {
    expect(FLAG_POINTS.CRITICAL).toBe(3);
    expect(FLAG_POINTS.WARNING).toBe(2);
    expect(FLAG_POINTS.MODERATE).toBe(1);
    expect(FLAG_POINTS.OK).toBe(0);
  });
});

// ─── computeWaterScore (rebalanced: per-zone NDWI 0-4, NDVI 0-2, globals 0-2 each) ──

describe('computeWaterScore', () => {
  it('dry NDWI (-0.16) + low NDVI (0.15) + dry soil + no rain & high ET → 10 (capped)', () => {
    // ndwi -0.16 < -0.15 → +4, ndvi 0.15 < 0.20 → +2, sm 0.09 < 0.15 → +2,
    // rain=0 && et=6>5 → +2, total=10
    expect(computeWaterScore(-0.16, 0.15, 0.09, 6, 0)).toBe(10);
  });

  it('moderate NDWI (-0.06) + moderate NDVI (0.30) + moderate soil + low rain → 5', () => {
    // ndwi -0.06 < -0.05 → +2, ndvi 0.30 < 0.40 → +1, sm 0.20 < 0.30 → +1,
    // rain 3 < 5 → +1, total=5
    expect(computeWaterScore(-0.06, 0.30, 0.20, 3, 3)).toBe(5);
  });

  it('wet NDWI (0.10) + healthy NDVI (0.70) + wet soil + good rain → 0', () => {
    // ndwi 0.10 ≥ 0.00 → 0, ndvi 0.70 ≥ 0.40 → 0, sm 0.35 ≥ 0.30 → 0,
    // rain 10 ≥ 5 → 0, total=0
    expect(computeWaterScore(0.10, 0.70, 0.35, 3, 10)).toBe(0);
  });

  it('NDVI now contributes to water score (vegetation stress = water stress proxy)', () => {
    const low  = computeWaterScore(0.05, 0.15, 0.20, 3, 3);  // ndvi < 0.20 → +2
    const high = computeWaterScore(0.05, 0.50, 0.20, 3, 3);  // ndvi ≥ 0.40 → 0
    expect(low).toBeGreaterThan(high);
  });

  it('rain_3d=0 && ET>5 → +2 (combined evaporative stress)', () => {
    // ndwi ≥ 0 → 0, ndvi ≥ 0.40 → 0, sm ≥ 0.30 → 0, rain=0 && et=6>5 → +2
    expect(computeWaterScore(0.10, 0.50, 0.35, 6, 0)).toBe(2);
  });

  it('rain_3d=0 but ET≤5 → only +1 (dry but low evaporative demand)', () => {
    // ndwi ≥ 0 → 0, ndvi ≥ 0.40 → 0, sm ≥ 0.30 → 0, rain 0, et=4≤5 → rain<5 → +1
    expect(computeWaterScore(0.10, 0.50, 0.35, 4, 0)).toBe(1);
  });

  it('very dry NDWI (-0.20) alone gives 4 points without any other stress → 4', () => {
    // ndwi -0.20 < -0.15 → +4, ndvi 0.5 ≥ 0.40 → 0, sm 0.40 ≥ 0.30 → 0,
    // rain 10 ≥ 5 → 0, total=4
    expect(computeWaterScore(-0.20, 0.50, 0.40, 3, 10)).toBe(4);
  });
});

// ─── classifyZoneSeverity ────────────────────────────────────────────────────

describe('classifyZoneSeverity', () => {
  const ctx = { soil_moisture: 0.20 };

  it('NDWI -0.20 → critical', () => {
    const z = { ndwi: { mean: -0.20 }, ndvi: { mean: 0.50 } };
    expect(classifyZoneSeverity(z, ctx)).toBe('critical');
  });

  it('NDWI -0.10, NDVI 0.50, SM 0.20 → stressed', () => {
    const z = { ndwi: { mean: -0.10 }, ndvi: { mean: 0.50 } };
    expect(classifyZoneSeverity(z, ctx)).toBe('stressed');
  });

  it('NDWI -0.04 → moderate', () => {
    const z = { ndwi: { mean: -0.04 }, ndvi: { mean: 0.60 } };
    expect(classifyZoneSeverity(z, ctx)).toBe('moderate');
  });

  it('NDWI 0.10, NDVI 0.70, SM 0.40 → healthy', () => {
    const z = { ndwi: { mean: 0.10 }, ndvi: { mean: 0.70 } };
    expect(classifyZoneSeverity(z, { soil_moisture: 0.40 })).toBe('healthy');
  });

  it('NDVI < 0.20 → critical even with normal NDWI', () => {
    const z = { ndwi: { mean: -0.02 }, ndvi: { mean: 0.15 } };
    expect(classifyZoneSeverity(z, ctx)).toBe('critical');
  });

  it('dry soil (sm<0.10) + moderate NDWI → critical via combined rule', () => {
    const z = { ndwi: { mean: -0.09 }, ndvi: { mean: 0.50 } };
    expect(classifyZoneSeverity(z, { soil_moisture: 0.05 })).toBe('critical');
  });
});

// ─── scoreZone ────────────────────────────────────────────────────────────────

describe('scoreZone', () => {
  const droughtCtx = {
    soil_moisture:   0.14, // < 0.15
    air_temperature: 39,   // WARNING
    rain_3d_mm:      0,    // CRITICAL
    et0_mm_per_day:  6.2,  // > 5
  };

  it('zone C (ndwi=0.05, ndvi=0.22): water_score=5, heat=2, veg=2', () => {
    const zone = { ndvi: { mean: 0.22, count: 20 }, ndwi: { mean: 0.05, count: 20 } };
    const { water_score, heat_score, vegetation_score } = scoreZone(zone, droughtCtx);
    // ndwi 0.05 ≥ 0.00 → 0, ndvi 0.22 < 0.40 → +1, sm 0.14 → +2, rain=0&&et=6.2>5 → +2 = 5
    expect(water_score).toBe(5);
    expect(heat_score).toBe(2);
    expect(vegetation_score).toBe(2);
  });

  it('healthy zone: water_score=0, heat=0, veg=0', () => {
    const zone = { ndvi: { mean: 0.70, count: 15 }, ndwi: { mean: 0.45, count: 15 } };
    const ctx  = { soil_moisture: 0.40, air_temperature: 25, rain_3d_mm: 15, et0_mm_per_day: 4 };
    const { water_score, heat_score, vegetation_score } = scoreZone(zone, ctx);
    expect(water_score).toBe(0);
    expect(heat_score).toBe(0);
    expect(vegetation_score).toBe(0);
  });
});

// ─── decide ──────────────────────────────────────────────────────────────────

describe('decide', () => {
  it('water>=8 → URGENT_IRRIGATION / HIGH (new severe-water path, no heat needed)', () => {
    const result = decide({ water_score: 8, heat_score: 0, vegetation_score: 0 });
    expect(result.code).toBe('URGENT_IRRIGATION');
    expect(result.priority).toBe('HIGH');
  });

  it('water>=6 AND heat>=2 → URGENT_IRRIGATION / HIGH (drought + heat)', () => {
    const result = decide({ water_score: 7, heat_score: 2, vegetation_score: 2 });
    expect(result.code).toBe('URGENT_IRRIGATION');
    expect(result.priority).toBe('HIGH');
  });

  it('water>=6 AND heat<2 → IRRIGATE_SOON / MEDIUM', () => {
    const result = decide({ water_score: 6, heat_score: 1, vegetation_score: 0 });
    expect(result.code).toBe('IRRIGATE_SOON');
    expect(result.priority).toBe('MEDIUM');
  });

  it('water=4..5 → MONITOR_WATER / LOW', () => {
    expect(decide({ water_score: 4, heat_score: 0, vegetation_score: 0 }).code).toBe('MONITOR_WATER');
    expect(decide({ water_score: 5, heat_score: 1, vegetation_score: 0 }).code).toBe('MONITOR_WATER');
  });

  it('water=7 (>=6 but no heat) → IRRIGATE_SOON (water>=8 path not triggered)', () => {
    const result = decide({ water_score: 7, heat_score: 0, vegetation_score: 0 });
    expect(result.code).toBe('IRRIGATE_SOON');
  });

  it('heat>=2 AND veg>=2 (water<4) → HEAT_PROTECTION', () => {
    const result = decide({ water_score: 3, heat_score: 2, vegetation_score: 2 });
    expect(result.code).toBe('HEAT_PROTECTION');
    expect(result.priority).toBe('MEDIUM');
  });

  it('all scores low → HEALTHY / INFO', () => {
    const result = decide({ water_score: 0, heat_score: 0, vegetation_score: 0 });
    expect(result.code).toBe('HEALTHY');
    expect(result.priority).toBe('INFO');
  });

  it('water>=8 takes priority over heat+veg path when both conditions met', () => {
    // water=8 triggers the new URGENT path before checking heat>=2
    const result = decide({ water_score: 8, heat_score: 2, vegetation_score: 2 });
    expect(result.code).toBe('URGENT_IRRIGATION');
  });
});

// ─── computeIrrigationAmount (two-component model) ────────────────────────────

describe('computeIrrigationAmount', () => {
  const farmContext = {
    soil_moisture:  0.14,
    air_temperature: 39,
    rain_3d_mm:      0,
    et0_mm_per_day:  6.2,
  };

  it('two-component model: daily ETc + deficit recovery for zone C, tomato', () => {
    const decision = { code: 'URGENT_IRRIGATION', priority: 'HIGH' };
    const result = computeIrrigationAmount(decision, farmContext, 0.05, 20, 'tomato');
    // daily_etc = 6.2 × 1.15 × 1.225 = 8.73425 → 8.7
    // deficit   = (0.32 - 0.14) × 400 × 0.07 = 5.04 → 5.0
    // total     = 13.77425 → 13.8
    expect(result.amount_mm).toBe(13.8);
    // Math.round(13.77425 * 10000 * 0.20) = Math.round(27548.5) = 27549
    expect(result.amount_liters).toBe(27549);
    expect(result.zone_area_ha).toBe(0.20);
    expect(result.components.daily_etc_mm).toBe(8.7);
    expect(result.components.deficit_recovery_mm).toBe(5.0);
    expect(result.components.root_depth_mm).toBe(400);
    expect(result.stress_multiplier).toBeCloseTo(1.23, 1);
    expect(result.split_sessions).toBe(2);
    expect(result.per_session_mm).toBe(6.9);
  });

  it('drier zone (NDWI -0.07) gets more water than wetter zone (NDWI +0.30)', () => {
    const decision = { code: 'IRRIGATE_SOON', priority: 'MEDIUM' };
    const ctx = { soil_moisture: 0.20, et0_mm_per_day: 5 };
    const dry = computeIrrigationAmount(decision, ctx, -0.07, 15, 'default');
    const wet = computeIrrigationAmount(decision, ctx, 0.30, 15, 'default');
    expect(dry.amount_mm).toBeGreaterThan(wet.amount_mm);
    expect(dry.amount_liters).toBeGreaterThan(wet.amount_liters);
    expect(dry.components.deficit_recovery_mm).toBe(wet.components.deficit_recovery_mm);
    expect(dry.components.daily_etc_mm).toBeGreaterThan(wet.components.daily_etc_mm);
  });

  it('near field capacity (sm=0.30) → very small deficit recovery', () => {
    const ctx = { ...farmContext, soil_moisture: 0.30, et0_mm_per_day: 5 };
    const result = computeIrrigationAmount({ code: 'IRRIGATE_SOON' }, ctx, 0.05, 10, 'default');
    expect(result.amount_mm).toBe(6.7);
    expect(result.components.deficit_recovery_mm).toBe(0.6);
    expect(result.split_sessions).toBeUndefined();
  });

  it('returns null for non-irrigation decisions', () => {
    expect(computeIrrigationAmount({ code: 'HEALTHY' }, farmContext, 0.05, 20, 'default')).toBeNull();
  });

  it('falls back to 5 mm/day ET₀, default kc=1.0, root=400mm when et0 missing', () => {
    const ctx = { soil_moisture: 0.10, et0_mm_per_day: undefined };
    const result = computeIrrigationAmount({ code: 'URGENT_IRRIGATION' }, ctx, 0.05, 20, 'default');
    expect(result.amount_mm).toBe(12.3);
    expect(result.components.deficit_recovery_mm).toBe(6.2);
    expect(result.split_sessions).toBe(2);
  });

  it('olive crop (kc=0.65, deep roots=1000mm) gets more deficit recovery but lower daily ETc', () => {
    const ctx = { soil_moisture: 0.14, et0_mm_per_day: 6.2 };
    const result = computeIrrigationAmount({ code: 'IRRIGATE_SOON' }, ctx, 0.05, 20, 'olive');
    expect(result.amount_mm).toBe(17.5);
    expect(result.components.daily_etc_mm).toBe(4.9);
    expect(result.components.deficit_recovery_mm).toBe(12.6);
    expect(result.components.root_depth_mm).toBe(1000);
  });
});

// ─── runRuleEngine ────────────────────────────────────────────────────────────

describe('runRuleEngine', () => {
  const droughtCtx = {
    soil_moisture:   0.10,
    air_temperature: 24,   // cool — heat_score=0
    rain_3d_mm:      0,
    et0_mm_per_day:  6.0,
  };

  function makeZone(id, ndviMean, ndwiMean, count = 15) {
    return {
      zone_id: id, position: 'X',
      ndvi: { mean: ndviMean, count, min: ndviMean, max: ndviMean, median: ndviMean, std: 0 },
      ndwi: { mean: ndwiMean, count, min: ndwiMean, max: ndwiMean, median: ndwiMean, std: 0 },
    };
  }

  it('skips zones with ndvi.status=no_data', () => {
    const zones = [
      makeZone('A', 0.65, 0.48),
      { zone_id: 'B', position: 'N', ndvi: { count: 0, status: 'no_data' }, ndwi: { count: 0, status: 'no_data' } },
      makeZone('C', 0.22, 0.05),
    ];
    const results = runRuleEngine(zones, droughtCtx, 1.84);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.zone_id)).toEqual(['A', 'C']);
  });

  it('each result has zone_id, position, status, decision, priority, scores, action, confidence, metrics', () => {
    const [result] = runRuleEngine([makeZone('A', 0.65, 0.48)], droughtCtx, 1.84);
    expect(result).toHaveProperty('zone_id');
    expect(result).toHaveProperty('position');
    expect(result).toHaveProperty('status');       // NEW — per-zone severity
    expect(result).toHaveProperty('decision');
    expect(result).toHaveProperty('priority');
    expect(result).toHaveProperty('scores');
    expect(result).toHaveProperty('action');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('metrics');
  });

  it('differentiates zones with different NDWI — at least 2 distinct water_scores', () => {
    // 3 zones with the same global context but different NDWI
    const zones = [
      makeZone('A', 0.40, -0.15, 15),  // dry
      makeZone('B', 0.40, -0.08, 15),  // stressed
      makeZone('C', 0.40, -0.02, 15),  // moderate
    ];
    const results = runRuleEngine(zones, droughtCtx, 1.84);
    expect(results).toHaveLength(3);

    const scores = results.map(z => z.scores.water_score);
    const uniqueScores = new Set(scores);
    expect(uniqueScores.size).toBeGreaterThanOrEqual(2);
  });

  it('differentiates zones with different NDWI — at least 2 distinct statuses', () => {
    const zones = [
      makeZone('A', 0.40, -0.20, 15),  // critical
      makeZone('B', 0.40, -0.10, 15),  // stressed
      makeZone('C', 0.40,  0.10, 15),  // healthy
    ];
    const results = runRuleEngine(zones, droughtCtx, 1.84);

    const statuses = results.map(z => z.status);
    const uniqueStatuses = new Set(statuses);
    expect(uniqueStatuses.size).toBeGreaterThanOrEqual(2);
  });

  it('cold weather + severe NDWI deficit → zone hits URGENT via water_score>=8', () => {
    // NDWI -0.18, NDVI 0.15, SM 0.08 — should score 4+2+2+2=10 (capped)
    const zones = [makeZone('A', 0.15, -0.18, 15)];
    const results = runRuleEngine(zones, droughtCtx, 1.84);
    expect(results[0].decision).toBe('URGENT_IRRIGATION');
    expect(results[0].priority).toBe('HIGH');
  });

  it('metrics contains ndvi_mean, ndwi_mean, pixel_count', () => {
    const [result] = runRuleEngine([makeZone('A', 0.65, 0.48, 18)], droughtCtx, 1.84);
    expect(result.metrics.ndvi_mean).toBe(0.65);
    expect(result.metrics.ndwi_mean).toBe(0.48);
    expect(result.metrics.pixel_count).toBe(18);
  });

  it('confidence=HIGH for count>=10, MEDIUM for count>=5, LOW for count<5', () => {
    const zones = [
      makeZone('A', 0.65, 0.48, 10),
      makeZone('B', 0.65, 0.48, 5),
      makeZone('C', 0.65, 0.48, 4),
    ];
    const results = runRuleEngine(zones, droughtCtx, 1.84);
    expect(results[0].confidence).toBe('HIGH');
    expect(results[1].confidence).toBe('MEDIUM');
    expect(results[2].confidence).toBe('LOW');
  });
});
