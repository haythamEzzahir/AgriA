import { describe, it, expect } from 'vitest';
import { aggregateZone, mergeIndicesByZone } from '../src/stage6_aggregate.js';

// ─── aggregateZone ────────────────────────────────────────────────────────────

describe('aggregateZone (§8.1)', () => {
  it('returns { count:0, status:"no_data" } for an empty array (gotcha 12.4)', () => {
    expect(aggregateZone([])).toEqual({ count: 0, status: 'no_data' });
  });

  it('computes correct stats for [0.5, 0.6, 0.7]', () => {
    const result = aggregateZone([0.5, 0.6, 0.7]);
    expect(result.count).toBe(3);
    expect(result.mean).toBeCloseTo(0.6, 10);
    expect(result.min).toBeCloseTo(0.5, 10);
    expect(result.max).toBeCloseTo(0.7, 10);
    expect(result.median).toBeCloseTo(0.6, 10);
    // std = sqrt(((0.5-0.6)² + 0 + (0.7-0.6)²) / 3) = sqrt(0.02/3) ≈ 0.0816
    expect(result.std).toBeGreaterThan(0);
    expect(result.std).toBeCloseTo(Math.sqrt(0.02 / 3), 10);
  });

  it('returns std=0 for a single-element array', () => {
    const result = aggregateZone([0.5]);
    expect(result.count).toBe(1);
    expect(result.mean).toBe(0.5);
    expect(result.min).toBe(0.5);
    expect(result.max).toBe(0.5);
    expect(result.median).toBe(0.5);
    expect(result.std).toBe(0);
  });

  it('computes median as average of two middle values for even-length arrays', () => {
    // sorted: [0.5, 0.6, 0.7, 0.8] → median = (0.6 + 0.7) / 2 = 0.65
    const result = aggregateZone([0.8, 0.5, 0.7, 0.6]);
    expect(result.median).toBeCloseTo(0.65, 10);
    expect(result.count).toBe(4);
  });

  it('does not mutate the input array when sorting', () => {
    const input = [0.7, 0.5, 0.6];
    aggregateZone(input);
    expect(input).toEqual([0.7, 0.5, 0.6]); // original order preserved
  });

  it('no_data result has no mean/std/min/max keys', () => {
    const result = aggregateZone([]);
    expect(result).not.toHaveProperty('mean');
    expect(result).not.toHaveProperty('std');
  });
});

// ─── mergeIndicesByZone ───────────────────────────────────────────────────────

describe('mergeIndicesByZone (§8.2 + §8.3)', () => {
  // Synthetic buckets derived from §11.8 example; use uniform arrays so mean
  // equals the target value exactly, making assertions simple.
  function uniformBucket(mean, count) {
    return Array(count).fill(mean);
  }

  // §11.8 values for zones A and C; remaining 7 zones left empty (no_data)
  const ndviBuckets = [
    uniformBucket(0.65, 18), // A
    [],                       // B
    uniformBucket(0.22, 20), // C
    ...Array(6).fill([]),    // D–I
  ];
  const ndwiBuckets = [
    uniformBucket(0.48, 18), // A
    [],                       // B
    uniformBucket(0.05, 20), // C
    ...Array(6).fill([]),    // D–I
  ];

  let result;

  it('returns an array of exactly 9 zone-stats objects', () => {
    result = mergeIndicesByZone(ndviBuckets, ndwiBuckets);
    expect(result).toHaveLength(9);
  });

  it('each object has zone_id, position, ndvi, and ndwi keys (§8.3 shape)', () => {
    result = mergeIndicesByZone(ndviBuckets, ndwiBuckets);
    for (const z of result) {
      expect(z).toHaveProperty('zone_id');
      expect(z).toHaveProperty('position');
      expect(z).toHaveProperty('ndvi');
      expect(z).toHaveProperty('ndwi');
    }
  });

  it('zone A (index 0): zone_id=A, position=NW, correct ndvi/ndwi stats', () => {
    result = mergeIndicesByZone(ndviBuckets, ndwiBuckets);
    const zoneA = result[0];
    expect(zoneA.zone_id).toBe('A');
    expect(zoneA.position).toBe('NW');
    expect(zoneA.ndvi.count).toBe(18);
    expect(zoneA.ndvi.mean).toBeCloseTo(0.65, 5);
    expect(zoneA.ndwi.count).toBe(18);
    expect(zoneA.ndwi.mean).toBeCloseTo(0.48, 5);
  });

  it('zone C (index 2): zone_id=C, position=NE, stressed ndvi/ndwi values (§11.8)', () => {
    result = mergeIndicesByZone(ndviBuckets, ndwiBuckets);
    const zoneC = result[2];
    expect(zoneC.zone_id).toBe('C');
    expect(zoneC.position).toBe('NE');
    expect(zoneC.ndvi.count).toBe(20);
    expect(zoneC.ndvi.mean).toBeCloseTo(0.22, 5);
    expect(zoneC.ndwi.count).toBe(20);
    expect(zoneC.ndwi.mean).toBeCloseTo(0.05, 5);
  });

  it('zone B (index 1): empty buckets produce no_data for both ndvi and ndwi', () => {
    result = mergeIndicesByZone(ndviBuckets, ndwiBuckets);
    const zoneB = result[1];
    expect(zoneB.zone_id).toBe('B');
    expect(zoneB.ndvi).toEqual({ count: 0, status: 'no_data' });
    expect(zoneB.ndwi).toEqual({ count: 0, status: 'no_data' });
  });

  it('zone labels run A through I in order', () => {
    result = mergeIndicesByZone(ndviBuckets, ndwiBuckets);
    const labels = result.map(z => z.zone_id);
    expect(labels).toEqual(['A','B','C','D','E','F','G','H','I']);
  });

  it('zone positions run NW through SE in order', () => {
    result = mergeIndicesByZone(ndviBuckets, ndwiBuckets);
    const positions = result.map(z => z.position);
    expect(positions).toEqual(['NW','N','NE','W','Center','E','SW','S','SE']);
  });
});
