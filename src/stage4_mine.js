'use strict';

// Stage 4 — Per-Pixel Data Mining
// Implements CORE_PIPELINE_SPEC.md §6

const turf = require('@turf/turf');

// §6.1 — Map a pixel's (col, row) position to a geographic coordinate.
//
// Uses pixel CENTER (col + 0.5, row + 0.5) for sub-pixel accuracy.
//
// Gotcha 12.3 — Row direction:
//   Row 0 is the NORTH edge of the image (highest latitude).
//   Latitude is therefore computed by SUBTRACTING from maxLat, not adding to minLat.
//   Using maxLat - … is the only correct form; the inverse produces a flipped map.
//
// @param {number[]} bbox  [minLng, minLat, maxLng, maxLat]
// @returns {[number, number]}  [lng, lat]
function pixelToLngLat(col, row, width, height, bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const lng = minLng + ((col + 0.5) / width)  * (maxLng - minLng);
  const lat = maxLat - ((row + 0.5) / height) * (maxLat - minLat); // subtract — gotcha 12.3

  return [lng, lat];
}

// §6.2 — Decide whether a raw pixel value is usable.
//
// For uint8/uint16 GeoTIFFs: filters no-data (0) and saturated/masked (255/65535).
// For float32 GeoTIFFs (isFloat=true): filters NaN and out-of-range [-1, 1].
// In float32 mode, 0.0 is a valid NDVI value and must NOT be excluded.
function isValidPixel(rawValue, isFloat = false) {
  if (rawValue === null || rawValue === undefined) return false;
  if (Number.isNaN(rawValue)) return false;
  if (isFloat) return rawValue >= -1 && rawValue <= 1;
  if (rawValue === 0)   return false; // no-data sentinel (uint)
  if (rawValue === 255) return false; // saturated / cloud-masked sentinel (uint)
  return true;
}

// §6.3 — Test whether a geographic point is inside the farm polygon.
// Uses turf.booleanPointInPolygon; accepts any GeoJSON Feature or Geometry.
function isInsidePolygon(lng, lat, farmPolygon) {
  const pt = turf.point([lng, lat]);
  return turf.booleanPointInPolygon(pt, farmPolygon);
}

// §6.4 — Full per-pixel mining loop.
//
// Iterates every pixel in the decoded image, applies validity + containment
// filters, then calls the injected `decoder` to convert the raw integer to a
// physical value (NDVI, NDWI, …).
//
// `decoder` is injected (not hardcoded) so the same function handles both NDVI
// and NDWI — pass rawToNdvi8bit, rawToNdvi16bit, or any equivalent function.
//
// Returned objects use the key `value` (not `ndvi`) to stay index-agnostic.
// §6.5 of the spec shows `ndvi` only because the concrete example uses NDVI.
//
// @param {{ pixels, width, height, bbox }} decoded  Output of decodeGeoTIFF.
// @param {object}   farmPolygon  GeoJSON Feature or Geometry.
// @param {Function} decoder      raw → physical value (e.g. rawToNdvi8bit).
// @returns {{ lng: number, lat: number, value: number }[]}
function mineValidPixels(decoded, farmPolygon, decoder, isFloat = false) {
  const { pixels, width, height, bbox } = decoded;
  const validPixels = [];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const raw = pixels[row * width + col];

      if (!isValidPixel(raw, isFloat)) continue;

      const [lng, lat] = pixelToLngLat(col, row, width, height, bbox);

      if (!isInsidePolygon(lng, lat, farmPolygon)) continue;

      validPixels.push({ lng, lat, value: decoder(raw) });
    }
  }

  return validPixels;
}

module.exports = { pixelToLngLat, isValidPixel, isInsidePolygon, mineValidPixels };
