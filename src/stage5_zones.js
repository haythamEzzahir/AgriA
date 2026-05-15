'use strict';

// Stage 5 — Zone Segmentation (3×3 Grid)
// Implements CORE_PIPELINE_SPEC.md §7

const turf = require('@turf/turf');

// §7.2 — Zone identifiers, ordered to match the loop output (A=NW first, I=SE last).
//
//   ┌─────┬─────┬─────┐
//   │  A  │  B  │  C  │  ← North row  (j=2)
//   ├─────┼─────┼─────┤
//   │  D  │  E  │  F  │  ← Middle row (j=1)
//   ├─────┼─────┼─────┤
//   │  G  │  H  │  I  │  ← South row  (j=0)
//   └─────┴─────┴─────┘
//    i=0   i=1   i=2
const ZONE_LABELS    = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const ZONE_POSITIONS = ['NW', 'N', 'NE', 'W', 'Center', 'E', 'SW', 'S', 'SE'];

// §7.1 — Divide the farm polygon's bounding box into a 3×3 grid of 9 zones.
// Zones are appended north-to-south, west-to-east so the array index matches
// ZONE_LABELS (A=0 … I=8).
// Each zone carries zone_id and position so downstream stages need no re-mapping.
function computeZoneGrid(farmPolygon) {
  const bbox = turf.bbox(farmPolygon); // [minLng, minLat, maxLng, maxLat]
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const lngStep = (maxLng - minLng) / 3;
  const latStep = (maxLat - minLat) / 3;

  const zones = [];

  for (let j = 2; j >= 0; j--) {   // j=2 → north row, j=0 → south row
    for (let i = 0; i < 3; i++) {  // i=0 → west col,  i=2 → east col
      const west  = minLng + i       * lngStep;
      const east  = minLng + (i + 1) * lngStep;
      const south = minLat + j       * latStep;
      const north = minLat + (j + 1) * latStep;

      const idx = zones.length;     // 0-8, matches ZONE_LABELS index

      zones.push({
        bounds:   [west, south, east, north],
        polygon:  turf.bboxPolygon([west, south, east, north]),
        zone_id:  ZONE_LABELS[idx],
        position: ZONE_POSITIONS[idx],
      });
    }
  }

  return zones; // Zone[9], order: A B C / D E F / G H I
}

// §7.3 — Return the index (0–8) of the zone that contains (lng, lat).
// Uses half-open intervals on all four edges (gotcha 12.7):
//   west  ≤ lng < east
//   south ≤ lat < north
// This guarantees every interior point belongs to exactly one zone and no
// point falls into two zones due to floating-point equality on a shared edge.
function findZoneIndex(lng, lat, zones) {
  for (let i = 0; i < zones.length; i++) {
    const [west, south, east, north] = zones[i].bounds;
    if (lng >= west && lng < east && lat >= south && lat < north) {
      return i;
    }
  }
  return -1; // outside all zones
}

// §7.4 — Assign each valid pixel to its zone bucket.
// Returns an array of 9 arrays; each inner array holds the `value` scalars
// (NDVI or NDWI) for the pixels that landed in that zone.
// Pixels for which findZoneIndex returns -1 are silently dropped (they are
// outside the farm's bounding box — e.g. clipped by a non-rectangular polygon).
function bucketize(validPixels, zones) {
  const buckets = Array.from({ length: 9 }, () => []);

  for (const px of validPixels) {
    const zoneIdx = findZoneIndex(px.lng, px.lat, zones);
    if (zoneIdx === -1) continue;
    buckets[zoneIdx].push(px.value); // use px.value (Stage 4 key, index-agnostic)
  }

  return buckets; // number[9][]
}

module.exports = { ZONE_LABELS, ZONE_POSITIONS, computeZoneGrid, findZoneIndex, bucketize };
