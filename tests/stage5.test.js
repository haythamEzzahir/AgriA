import { describe, it, expect, beforeAll } from 'vitest';
import { ZONE_LABELS, ZONE_POSITIONS, computeZoneGrid, findZoneIndex, bucketize } from '../src/stage5_zones.js';

// §11.1 Souss-Massa polygon — the canonical test fixture throughout
const SOUSS_POLYGON = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-9.5375, 30.4156],
      [-9.5360, 30.4156],
      [-9.5360, 30.4170],
      [-9.5375, 30.4170],
      [-9.5375, 30.4156],
    ]],
  },
};

// Hard-coded bbox from spec §11.1 for clarity in assertions
const BBOX = [-9.5375, 30.4156, -9.5360, 30.4170]; // [minLng, minLat, maxLng, maxLat]

// ─── constants ────────────────────────────────────────────────────────────────

describe('ZONE_LABELS / ZONE_POSITIONS', () => {
  it('exports 9 labels A–I', () => {
    expect(ZONE_LABELS).toEqual(['A','B','C','D','E','F','G','H','I']);
  });

  it('exports 9 positions in correct geographic order', () => {
    expect(ZONE_POSITIONS).toEqual(['NW','N','NE','W','Center','E','SW','S','SE']);
  });
});

// ─── computeZoneGrid ─────────────────────────────────────────────────────────

describe('computeZoneGrid', () => {
  let zones;

  beforeAll(() => {
    zones = computeZoneGrid(SOUSS_POLYGON);
  });

  it('returns exactly 9 zones', () => {
    expect(zones).toHaveLength(9);
  });

  it('tags each zone with zone_id (A–I) and position (NW–SE)', () => {
    const expectZone = (idx, id, pos) =>
      expect(zones[idx]).toMatchObject({ zone_id: id, position: pos });

    expectZone(0, 'A', 'NW');
    expectZone(1, 'B', 'N');
    expectZone(2, 'C', 'NE');
    expectZone(3, 'D', 'W');
    expectZone(4, 'E', 'Center');
    expectZone(5, 'F', 'E');
    expectZone(6, 'G', 'SW');
    expectZone(7, 'H', 'S');
    expectZone(8, 'I', 'SE');
  });

  it('each zone has a bounds array [west, south, east, north]', () => {
    for (const z of zones) {
      expect(z.bounds).toHaveLength(4);
      const [w, s, e, n] = z.bounds;
      expect(e).toBeGreaterThan(w); // east > west
      expect(n).toBeGreaterThan(s); // north > south
    }
  });

  it('each zone has a GeoJSON polygon', () => {
    for (const z of zones) {
      expect(z.polygon).toHaveProperty('type', 'Feature');
      expect(z.polygon.geometry).toHaveProperty('type', 'Polygon');
    }
  });

  it('union of all zone bounds equals the polygon bbox', () => {
    const minLng = Math.min(...zones.map(z => z.bounds[0]));
    const minLat = Math.min(...zones.map(z => z.bounds[1]));
    const maxLng = Math.max(...zones.map(z => z.bounds[2]));
    const maxLat = Math.max(...zones.map(z => z.bounds[3]));

    expect(minLng).toBeCloseTo(BBOX[0], 10);
    expect(minLat).toBeCloseTo(BBOX[1], 10);
    expect(maxLng).toBeCloseTo(BBOX[2], 10);
    expect(maxLat).toBeCloseTo(BBOX[3], 10);
  });

  it('zone A (NW) has the largest latitude values (north row)', () => {
    const [,, , northA] = zones[0].bounds; // zone A north
    const [,,, northG] = zones[6].bounds;  // zone G north (south row)
    expect(northA).toBeGreaterThan(northG);
  });

  it('zone C (NE) has the largest longitude values (east col)', () => {
    const [,, eastC] = zones[2].bounds; // zone C east
    const [,, eastA] = zones[0].bounds; // zone A east (west col)
    expect(eastC).toBeGreaterThan(eastA);
  });
});

// ─── findZoneIndex ────────────────────────────────────────────────────────────

describe('findZoneIndex', () => {
  let zones;

  beforeAll(() => {
    zones = computeZoneGrid(SOUSS_POLYGON);
  });

  it('center of polygon returns index 4 (zone E)', () => {
    const centerLng = (BBOX[0] + BBOX[2]) / 2; // -9.53675
    const centerLat = (BBOX[1] + BBOX[3]) / 2; // 30.4163
    const idx = findZoneIndex(centerLng, centerLat, zones);
    expect(idx).toBe(4);
    expect(zones[idx].zone_id).toBe('E');
  });

  it('returns -1 for a point outside all zones', () => {
    expect(findZoneIndex(0, 0, zones)).toBe(-1);      // far away
    expect(findZoneIndex(-9.5376, 30.4163, zones)).toBe(-1); // just west of farm
  });

  // Gotcha 12.7 — half-open intervals: the shared edge belongs to the eastern/northern zone
  it('point on A/B boundary (lng = east of A = west of B) lands in exactly zone B', () => {
    const boundaryLng = zones[0].bounds[2]; // east of A = west of B
    const northRowMidLat = (zones[0].bounds[1] + zones[0].bounds[3]) / 2;

    const idx = findZoneIndex(boundaryLng, northRowMidLat, zones);

    expect(idx).toBe(1);            // lands in B
    expect(idx).not.toBe(0);        // not in A
    expect(idx).not.toBe(-1);       // not outside
    expect(zones[idx].zone_id).toBe('B');
  });

  it('point on A/D boundary (lat = south of A = north of D) lands in exactly zone A', () => {
    // zones[0].bounds[1] is the south edge of A and the north line of D.
    // Half-open [south, north): south is closed (>=) so this shared lat belongs to A — the
    // northern zone owns the boundary. D's north edge is open (<), so D does NOT claim it.
    const boundaryLat  = zones[0].bounds[1];
    const westColMidLng = (zones[0].bounds[0] + zones[0].bounds[2]) / 2;

    const idx = findZoneIndex(westColMidLng, boundaryLat, zones);

    expect(idx).toBe(0);            // zone A owns its south boundary
    expect(idx).not.toBe(3);        // not in D
    expect(zones[idx].zone_id).toBe('A');
  });

  it('SW corner of bbox (minLng, minLat) lands in zone G', () => {
    // SW corner is a closed boundary → belongs to zones starting with >=
    const idx = findZoneIndex(BBOX[0], BBOX[1], zones);
    expect(idx).toBe(6);
    expect(zones[idx].zone_id).toBe('G');
  });
});

// ─── bucketize ────────────────────────────────────────────────────────────────

describe('bucketize', () => {
  let zones;

  beforeAll(() => {
    zones = computeZoneGrid(SOUSS_POLYGON);
  });

  function centerOf(zone) {
    const [w, s, e, n] = zone.bounds;
    return { lng: (w + e) / 2, lat: (s + n) / 2 };
  }

  it('places each pixel in the correct zone bucket', () => {
    // One pixel per zone at that zone's centre
    const pixels = zones.map((z, i) => ({ ...centerOf(z), value: i * 0.1 }));
    const buckets = bucketize(pixels, zones);

    expect(buckets).toHaveLength(9);
    for (let i = 0; i < 9; i++) {
      expect(buckets[i]).toHaveLength(1);
      expect(buckets[i][0]).toBeCloseTo(i * 0.1, 9);
    }
  });

  it('multiple pixels in the same zone all land in the same bucket', () => {
    const { lng, lat } = centerOf(zones[4]); // zone E
    const pixels = [
      { lng, lat, value: 0.58 },
      { lng, lat, value: 0.61 },
      { lng, lat, value: 0.55 },
    ];
    const buckets = bucketize(pixels, zones);

    expect(buckets[4]).toHaveLength(3);
    expect(buckets[4]).toContain(0.58);
    expect(buckets.filter((_, i) => i !== 4).every(b => b.length === 0)).toBe(true);
  });

  it('pixels outside all zones are silently dropped', () => {
    const pixels = [
      { lng: 0, lat: 0, value: 0.5 },          // far outside
      { lng: -9.5376, lat: 30.4163, value: 0.4 }, // just west of farm
    ];
    const buckets = bucketize(pixels, zones);
    const total = buckets.reduce((s, b) => s + b.length, 0);
    expect(total).toBe(0);
  });

  it('returns 9 empty arrays when given no pixels', () => {
    const buckets = bucketize([], zones);
    expect(buckets).toHaveLength(9);
    expect(buckets.every(b => b.length === 0)).toBe(true);
  });

  it('total pixel count is preserved (no duplication)', () => {
    const pixels = [
      { ...centerOf(zones[0]), value: 0.65 },
      { ...centerOf(zones[4]), value: 0.58 },
      { ...centerOf(zones[4]), value: 0.61 },
      { ...centerOf(zones[8]), value: 0.28 },
    ];
    const buckets = bucketize(pixels, zones);
    const total = buckets.reduce((s, b) => s + b.length, 0);
    expect(total).toBe(4);
    expect(buckets[0]).toHaveLength(1);
    expect(buckets[4]).toHaveLength(2);
    expect(buckets[8]).toHaveLength(1);
  });
});
