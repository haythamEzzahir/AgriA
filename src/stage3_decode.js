'use strict';

// Stage 3 — Image Decoding (Bytes → Numbers)
// Implements CORE_PIPELINE_SPEC.md §5

const { fromArrayBuffer } = require('geotiff');
const axios = require('axios');

// §5 "Pixel value decoding" — 8-bit encoding: raw 0–255 maps linearly to NDVI -1.0 → +1.0
function rawToNdvi8bit(raw) {
  return (raw / 127.5) - 1;
}

// §5 "Pixel value decoding" — 16-bit encoding: raw 0–65535 maps linearly to NDVI -1.0 → +1.0
function rawToNdvi16bit(raw) {
  return (raw / 32767.5) - 1;
}

// Inspect the TypedArray returned by geotiff to determine bit depth.
// geotiff returns Float32Array when SampleFormat=3 (IEEE 754 float) — values
// are already NDVI in [-1, 1] and must NOT be run through rawToNdvi8/16bit.
// Returns 32 for float, 16 for uint16, 8 for uint8.
function detectBitDepth(pixels) {
  if (pixels instanceof Float32Array) return 32;
  if (pixels instanceof Uint16Array)  return 16;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] > 255) return 16;
  }
  return 8;
}

// Float32 GeoTIFFs from AgroMonitoring already contain NDVI values in [-1, 1].
// Identity pass-through — no scaling needed.
function rawToNdviFloat32(raw) { return raw; }

/**
 * Decode a raw GeoTIFF buffer into a pixel matrix + geographic metadata.
 *
 * §5 "Decoding code" — exact implementation from spec.
 *
 * Gotcha 12.3 — Row direction:
 *   In the returned `pixels` array (flat, row-major), row 0 is the NORTH edge of
 *   the image (highest latitude). When mapping a pixel's row index to latitude,
 *   Stage 4 must subtract from maxLat, NOT add to minLat:
 *     lat = bbox[3] - ((row + 0.5) / height) * (bbox[3] - bbox[1])   ✓
 *
 * @param {Buffer} buffer  Raw GeoTIFF bytes (Node.js Buffer).
 * @returns {{ pixels: TypedArray, width: number, height: number, bbox: number[] }}
 *          bbox = [minLng, minLat, maxLng, maxLat]
 */
// Convert Web Mercator (EPSG:3857) metres → WGS84 (EPSG:4326) degrees.
// Agromonitoring GeoTIFFs are delivered in Web Mercator; the bbox values
// will be in the millions (~±20M for X, ~±85° equivalent for Y) rather than
// the -180/+180, -90/+90 degree range expected by Leaflet and turf.
function webMercatorToWgs84(x, y) {
  const R = 6378137;
  const lng = (x / R) * (180 / Math.PI);
  const lat = (Math.PI / 2 - 2 * Math.atan(Math.exp(-y / R))) * (180 / Math.PI);
  return [lng, lat];
}

// Detect whether a bbox is in projected coordinates (EPSG:3857 or similar)
// by checking if the absolute values are far outside the geographic range.
function isProjectedBbox(bbox) {
  return Math.abs(bbox[0]) > 180 || Math.abs(bbox[1]) > 90
      || Math.abs(bbox[2]) > 180 || Math.abs(bbox[3]) > 90;
}

async function decodeGeoTIFF(buffer) {
  // Slice to a dedicated ArrayBuffer — Node Buffers may sit inside a shared pool,
  // so buffer.buffer alone can contain extra bytes before/after the actual data.
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  const tiff  = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  const rasters = await image.readRasters();
  const pixels  = rasters[0];   // first (and only) band

  const width  = image.getWidth();
  const height = image.getHeight();
  let   bbox   = image.getBoundingBox(); // image CRS — may be Web Mercator

  // Reproject Web Mercator → WGS84 so downstream code (pixel→lng/lat,
  // turf containment, Leaflet overlays) always works in degrees.
  if (isProjectedBbox(bbox)) {
    const [minLng, minLat] = webMercatorToWgs84(bbox[0], bbox[1]);
    const [maxLng, maxLat] = webMercatorToWgs84(bbox[2], bbox[3]);
    bbox = [minLng, minLat, maxLng, maxLat];
  }

  return { pixels, width, height, bbox };
}

/**
 * Gotcha 12.2 — Calibration check.
 *
 * Fetches the official NDVI mean from the AgroMonitoring stats endpoint, computes
 * our own mean from the decoded pixels (excluding no-data: 0 and max), and
 * returns whether the difference is within the acceptable threshold of 0.05.
 *
 * @param {{ pixels: TypedArray }} decoded  Output of decodeGeoTIFF.
 * @param {string}  statsUrl  URL of the AgroMonitoring stats endpoint.
 * @param {object}  _http     HTTP client (axios by default; injectable for tests).
 * @returns {{ ok: boolean, yourMean: number, theirMean: number, diff: number }}
 */
async function calibrate(decoded, statsUrl, _http = axios) {
  const { pixels } = decoded;
  const bitDepth = detectBitDepth(pixels);

  // Float32 GeoTIFFs already contain NDVI; filter NaN and out-of-range only.
  // Int GeoTIFFs: filter no-data (0) and saturated (max) sentinels.
  const validNdvi = [];
  if (bitDepth === 32) {
    for (let i = 0; i < pixels.length; i++) {
      const v = pixels[i];
      if (!Number.isNaN(v) && v >= -1 && v <= 1) validNdvi.push(v);
    }
  } else {
    const toNdvi     = bitDepth === 16 ? rawToNdvi16bit : rawToNdvi8bit;
    const invalidMax = bitDepth === 16 ? 65535 : 255;
    for (let i = 0; i < pixels.length; i++) {
      const raw = pixels[i];
      if (raw !== 0 && raw !== invalidMax) validNdvi.push(toNdvi(raw));
    }
  }

  const yourMean = validNdvi.length > 0
    ? validNdvi.reduce((s, v) => s + v, 0) / validNdvi.length
    : 0;

  const response  = await _http.get(statsUrl);
  const theirMean = response.data.mean;
  const diff      = Math.abs(yourMean - theirMean);

  return { ok: diff < 0.05, yourMean, theirMean, diff };
}

module.exports = { decodeGeoTIFF, rawToNdvi8bit, rawToNdvi16bit, rawToNdviFloat32, detectBitDepth, calibrate };
