'use strict';

/**
 * One-time fixture generator.
 * Creates tests/fixtures/ndvi_sample.tif — a 4×4 8-bit GeoTIFF with known pixel
 * values and the Souss-Massa bounding box from spec §11.1.
 *
 * Run once: node scripts/create_fixtures.js
 * The file is committed so tests never need to re-generate it.
 */

const { writeArrayBuffer } = require('geotiff');
const { writeFileSync, mkdirSync } = require('fs');
const path = require('path');

// Pixel values chosen so none are 0 or 255 (both are "invalid" sentinel values).
// Row 0 is the north row (gotcha 12.3).
// Mean raw = (700 + 680 + 620 + 580) / 16 = 161.25
// Mean NDVI (8-bit formula) = (161.25 / 127.5) - 1 ≈ 0.2647
const PIXELS = [
  [160, 170, 180, 190],  // row 0 — north
  [155, 165, 175, 185],  // row 1
  [140, 150, 160, 170],  // row 2
  [130, 140, 150, 160],  // row 3 — south
];

// Bbox from spec §11.1: [-9.5375, 30.4156, -9.5360, 30.4170]
// Tiepoint: pixel (0,0) = NW corner = (minLng, maxLat)
const MODEL_TIEPOINT   = [0, 0, 0, -9.5375, 30.4170, 0];
const MODEL_PIXEL_SCALE = [0.000375, 0.00035, 0]; // lng/pixel, lat/pixel, 0

async function main() {
  const ab = await writeArrayBuffer([PIXELS], {
    BitsPerSample:                [8],
    SampleFormat:                 [1],     // unsigned integer
    GeographicTypeGeoKey:         4326,    // WGS-84
    ModelTiepoint:                MODEL_TIEPOINT,
    ModelPixelScale:              MODEL_PIXEL_SCALE,
  });

  const outDir  = path.join(__dirname, '..', 'tests', 'fixtures');
  const outPath = path.join(outDir, 'ndvi_sample.tif');

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, Buffer.from(ab));

  // Report expected values for tests
  const flatPixels = PIXELS.flat();
  const meanRaw    = flatPixels.reduce((s, v) => s + v, 0) / flatPixels.length;
  const meanNdvi   = (meanRaw / 127.5) - 1;

  console.log(`Written: ${outPath}`);
  console.log(`  Size : ${ab.byteLength} bytes`);
  console.log(`  Dims : 4 × 4 pixels, 8-bit`);
  console.log(`  Bbox : [-9.5375, 30.4156, -9.5360, 30.4170]`);
  console.log(`  Mean raw  : ${meanRaw}`);
  console.log(`  Mean NDVI : ${meanNdvi.toFixed(6)}  ← use this in calibrate tests`);
}

main().catch(e => { console.error(e); process.exit(1); });
