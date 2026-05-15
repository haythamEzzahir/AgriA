'use strict';

// Stage 6 — Per-Zone Aggregation
// Implements CORE_PIPELINE_SPEC.md §8

const { ZONE_LABELS, ZONE_POSITIONS } = require('./stage5_zones');

// §8.1 — Compute descriptive statistics for one zone's array of index values.
// Gotcha 12.4: an empty array means no valid pixels reached this zone;
// return { count: 0, status: 'no_data' } instead of crashing on division by zero.
function aggregateZone(values) {
  if (values.length === 0) {
    return { count: 0, status: 'no_data' };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n   = sorted.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  const min = sorted[0];
  const max = sorted[n - 1];
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[(n - 1) / 2];

  return { count: n, mean, min, max, median, std };
}

// §8.2 — Merge NDVI and NDWI bucket arrays into one ZoneStats object per zone.
// Both bucket arrays have length 9 (one entry per zone, already aligned by index).
// Output shape matches spec §8.3.
function mergeIndicesByZone(ndviBuckets, ndwiBuckets) {
  return ndviBuckets.map((ndviValues, i) => ({
    zone_id:  ZONE_LABELS[i],
    position: ZONE_POSITIONS[i],
    ndvi:     aggregateZone(ndviValues),
    ndwi:     aggregateZone(ndwiBuckets[i]),
  }));
}

module.exports = { aggregateZone, mergeIndicesByZone };
