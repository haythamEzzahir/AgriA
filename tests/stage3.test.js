import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { decodeGeoTIFF, rawToNdvi8bit, rawToNdvi16bit, detectBitDepth, calibrate } from '../src/stage3_decode.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, 'fixtures', 'ndvi_sample.tif');

// Expected values derived from scripts/create_fixtures.js
// Pixels are 8-bit values in [130..190], mean raw = 161.25, mean NDVI ≈ 0.264706
const EXPECTED = {
  width:    4,
  height:   4,
  bbox:     [-9.5375, 30.4156, -9.536, 30.417],   // geotiff drops trailing zeros
  row0:     [160, 170, 180, 190],
  meanNdvi: 0.264706,
};

// ─── rawToNdvi8bit ────────────────────────────────────────────────────────────

describe('rawToNdvi8bit (§5 formula)', () => {
  it('maps 0 to exactly -1.0', () => {
    expect(rawToNdvi8bit(0)).toBe(-1);
  });

  it('maps 255 to exactly +1.0', () => {
    expect(rawToNdvi8bit(255)).toBe(1);
  });

  it('maps 127.5 to exactly 0.0', () => {
    expect(rawToNdvi8bit(127.5)).toBe(0);
  });

  it('maps 191 to ≈ +0.5 (healthy vegetation range)', () => {
    expect(rawToNdvi8bit(191)).toBeCloseTo(0.498, 3);
  });
});

// ─── rawToNdvi16bit ───────────────────────────────────────────────────────────

describe('rawToNdvi16bit (§5 formula)', () => {
  it('maps 0 to exactly -1.0', () => {
    expect(rawToNdvi16bit(0)).toBe(-1);
  });

  it('maps 65535 to exactly +1.0', () => {
    expect(rawToNdvi16bit(65535)).toBeCloseTo(1, 5);
  });

  it('maps 32767.5 to exactly 0.0', () => {
    expect(rawToNdvi16bit(32767.5)).toBe(0);
  });
});

// ─── detectBitDepth ──────────────────────────────────────────────────────────

describe('detectBitDepth', () => {
  it('returns 8 for a Uint8Array', () => {
    expect(detectBitDepth(new Uint8Array([100, 200, 150]))).toBe(8);
  });

  it('returns 16 for a Uint16Array', () => {
    expect(detectBitDepth(new Uint16Array([1000, 30000, 50000]))).toBe(16);
  });

  it('returns 16 when a plain array contains a value > 255', () => {
    expect(detectBitDepth([100, 256, 50])).toBe(16);
  });

  it('returns 8 when all values in a plain array are ≤ 255', () => {
    expect(detectBitDepth([0, 128, 255])).toBe(8);
  });
});

// ─── decodeGeoTIFF ───────────────────────────────────────────────────────────

describe('decodeGeoTIFF', () => {
  it('decodes ndvi_sample.tif: correct width, height, bbox, and pixel values', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const result = await decodeGeoTIFF(buffer);

    expect(result.width).toBe(EXPECTED.width);
    expect(result.height).toBe(EXPECTED.height);

    // bbox = [minLng, minLat, maxLng, maxLat]
    expect(result.bbox[0]).toBeCloseTo(-9.5375, 5);
    expect(result.bbox[1]).toBeCloseTo(30.4156, 5);
    expect(result.bbox[2]).toBeCloseTo(-9.5360, 5);
    expect(result.bbox[3]).toBeCloseTo(30.4170, 5);

    // Row 0 (north row) pixel values
    const row0 = Array.from(result.pixels).slice(0, 4);
    expect(row0).toEqual(EXPECTED.row0);
  });

  it('returns a TypedArray for pixels (not a plain array)', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const { pixels } = await decodeGeoTIFF(buffer);
    expect(ArrayBuffer.isView(pixels)).toBe(true);
  });

  it('pixels are indexed row-major: pixels[row * width + col]', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const { pixels, width } = await decodeGeoTIFF(buffer);

    // Row 0, col 0 = 160; row 0, col 3 = 190 (from fixture definition)
    expect(pixels[0 * width + 0]).toBe(160);
    expect(pixels[0 * width + 3]).toBe(190);
    // Row 3, col 0 = 130 (southernmost row)
    expect(pixels[3 * width + 0]).toBe(130);
  });
});

// ─── calibrate ────────────────────────────────────────────────────────────────

describe('calibrate (gotcha 12.2)', () => {
  it('returns ok=true when stats mean matches our decoded mean (diff < 0.05)', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const decoded = await decodeGeoTIFF(buffer);

    // Mock stats endpoint returning a mean that matches our computed mean
    const mockGet = vi.fn().mockResolvedValue({ data: { mean: EXPECTED.meanNdvi } });

    const result = await calibrate(decoded, 'https://api.example.com/stats', { get: mockGet });

    expect(mockGet).toHaveBeenCalledWith('https://api.example.com/stats');
    expect(result.ok).toBe(true);
    expect(result.yourMean).toBeCloseTo(EXPECTED.meanNdvi, 4);
    expect(result.theirMean).toBe(EXPECTED.meanNdvi);
    expect(result.diff).toBeLessThan(0.05);
  });

  it('returns ok=false when stats mean diverges by > 0.05 (gotcha 12.2)', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const decoded = await decodeGeoTIFF(buffer);

    // Return a mean that's clearly wrong (0.5 vs our ~0.2647 → diff ≈ 0.235)
    const mockGet = vi.fn().mockResolvedValue({ data: { mean: 0.5 } });

    const result = await calibrate(decoded, 'https://api.example.com/stats', { get: mockGet });

    expect(result.ok).toBe(false);
    expect(result.diff).toBeGreaterThan(0.05);
  });

  it('excludes raw=0 (no-data) and raw=255 (saturated) pixels from the mean', async () => {
    // Inject a decoded object with a mix of valid and invalid pixels
    const pixels = new Uint8Array([0, 127, 255, 191]);  // 0 and 255 must be excluded
    const decoded = { pixels, width: 4, height: 1, bbox: [0, 0, 1, 1] };

    // Valid pixels: [127, 191]
    // NDVI: (127/127.5)-1 ≈ -0.00392, (191/127.5)-1 ≈ 0.498
    // Mean ≈ 0.247
    const expectedMean = ((127 / 127.5 - 1) + (191 / 127.5 - 1)) / 2;

    const mockGet = vi.fn().mockResolvedValue({ data: { mean: expectedMean } });
    const result  = await calibrate(decoded, 'url', { get: mockGet });

    expect(result.yourMean).toBeCloseTo(expectedMean, 5);
    expect(result.ok).toBe(true);
  });
});
