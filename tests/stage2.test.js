import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchScenes, pickBestScene, downloadIndex } from '../src/stage2_imagery.js';

// ─── Fixture scenes ───────────────────────────────────────────────────────────
// Based on §11.3 — three scenes returned for the Souss-Massa polygon

const SCENE_GOOD = {
  dt:   1747526400, // 2026-05-18 — most recent
  type: 's2',
  dc:   100,
  cl:   0.05,
  image: { ndvi: 'https://api.agromonitoring.com/image/ndvi', ndwi: 'https://api.agromonitoring.com/image/ndwi' },
  data:  { ndvi: 'https://api.agromonitoring.com/data/ndvi?appid=k', ndwi: 'https://api.agromonitoring.com/data/ndwi?appid=k' },
  stats: { ndvi: 'https://api.agromonitoring.com/stats/ndvi?appid=k' },
};

const SCENE_OLDER_GOOD = { ...SCENE_GOOD, dt: 1747008000 }; // 2026-05-12 — older but qualifies

const SCENE_CLOUDY  = { ...SCENE_GOOD, dt: 1747440000, cl: 0.45 }; // cloud 45% — rejected
const SCENE_NON_S2  = { ...SCENE_GOOD, dt: 1747353600, type: 'landsat' }; // wrong sensor
const SCENE_LOW_COV = { ...SCENE_GOOD, dt: 1747267200, dc: 50 }; // coverage 50% — rejected
const SCENE_EXACT_CLOUD = { ...SCENE_GOOD, dt: 1747180800, cl: 0.30 }; // cl = 0.30 — rejected (need < 0.30)
const SCENE_EXACT_COV   = { ...SCENE_GOOD, dt: 1747094400, dc: 80  }; // dc = 80 — rejected (need > 80)

// ─── searchScenes ─────────────────────────────────────────────────────────────

describe('searchScenes', () => {
  it('GETs the image/search endpoint with correct params', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: [SCENE_GOOD] });

    const result = await searchScenes({
      polygonId: 'poly123',
      daysBack:  14,
      apiKey:    'test-key',
      _http:     { get: mockGet },
    });

    expect(mockGet).toHaveBeenCalledWith(
      'http://api.agromonitoring.com/agro/1.0/image/search',
      expect.objectContaining({
        params: expect.objectContaining({
          polyid: 'poly123',
          appid:  'test-key',
        }),
      })
    );
    expect(result).toEqual([SCENE_GOOD]);
  });

  it('sets start = now − daysBack × 86400 and end = now', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: [] });
    const tBefore = Math.floor(Date.now() / 1000);

    await searchScenes({ polygonId: 'p', daysBack: 14, apiKey: 'k', _http: { get: mockGet } });

    const tAfter = Math.floor(Date.now() / 1000);
    const { params } = mockGet.mock.calls[0][1];

    expect(params.start).toBeGreaterThanOrEqual(tBefore - 14 * 86400);
    expect(params.start).toBeLessThanOrEqual(tAfter  - 14 * 86400);
    expect(params.end).toBeGreaterThanOrEqual(tBefore);
    expect(params.end).toBeLessThanOrEqual(tAfter);
  });

  it('defaults to 14 days when daysBack is omitted', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: [] });
    const tBefore = Math.floor(Date.now() / 1000);

    await searchScenes({ polygonId: 'p', apiKey: 'k', _http: { get: mockGet } });

    const tAfter = Math.floor(Date.now() / 1000);
    const { params } = mockGet.mock.calls[0][1];

    expect(params.start).toBeGreaterThanOrEqual(tBefore - 14 * 86400);
    expect(params.start).toBeLessThanOrEqual(tAfter  - 14 * 86400);
  });

  it('returns the raw scene array from the response', async () => {
    const scenes = [SCENE_GOOD, SCENE_CLOUDY];
    const mockGet = vi.fn().mockResolvedValue({ data: scenes });

    const result = await searchScenes({ polygonId: 'p', apiKey: 'k', _http: { get: mockGet } });

    expect(result).toBe(scenes); // same reference — no transformation
  });
});

// ─── pickBestScene ────────────────────────────────────────────────────────────

describe('pickBestScene', () => {
  it('returns the most recent qualifying scene (§4 step 2.2)', () => {
    const result = pickBestScene([SCENE_OLDER_GOOD, SCENE_GOOD]);
    expect(result).toBe(SCENE_GOOD);
  });

  it('rejects scenes with cloud cover ≥ 0.3 (need cl < 0.3)', () => {
    expect(pickBestScene([SCENE_CLOUDY])).toBeNull();
    expect(pickBestScene([SCENE_EXACT_CLOUD])).toBeNull(); // cl = 0.30 must also be rejected
  });

  it('rejects non-Sentinel-2 scenes', () => {
    expect(pickBestScene([SCENE_NON_S2])).toBeNull();
  });

  it('rejects scenes with polygon coverage ≤ 80 (need dc > 80)', () => {
    expect(pickBestScene([SCENE_LOW_COV])).toBeNull();
    expect(pickBestScene([SCENE_EXACT_COV])).toBeNull(); // dc = 80 must also be rejected
  });

  it('returns null for an empty scene list', () => {
    expect(pickBestScene([])).toBeNull();
  });

  it('returns null when no scene passes all three filters', () => {
    expect(pickBestScene([SCENE_CLOUDY, SCENE_NON_S2, SCENE_LOW_COV])).toBeNull();
  });

  it('skips disqualified scenes and picks the best qualifying one', () => {
    const result = pickBestScene([SCENE_CLOUDY, SCENE_GOOD, SCENE_NON_S2, SCENE_OLDER_GOOD]);
    expect(result).toBe(SCENE_GOOD);
  });
});

// ─── downloadIndex ────────────────────────────────────────────────────────────

describe('downloadIndex', () => {
  it('GETs the ndvi data URL with responseType arraybuffer and returns a Buffer', async () => {
    const fakeBytes = new Uint8Array([0x49, 0x49, 0x2a, 0x00]).buffer; // TIFF magic bytes (LE)
    const mockGet = vi.fn().mockResolvedValue({ data: fakeBytes });

    const result = await downloadIndex(SCENE_GOOD, 'ndvi', { get: mockGet });

    expect(mockGet).toHaveBeenCalledWith(
      SCENE_GOOD.data.ndvi,
      { responseType: 'arraybuffer' }
    );
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(4);
  });

  it('GETs the ndwi data URL', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: new ArrayBuffer(8) });

    await downloadIndex(SCENE_GOOD, 'ndwi', { get: mockGet });

    expect(mockGet).toHaveBeenCalledWith(
      SCENE_GOOD.data.ndwi,
      { responseType: 'arraybuffer' }
    );
  });

  it('always uses scene.data.* (GeoTIFF), not scene.image.* (§4 step 2.3)', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: new ArrayBuffer(4) });

    await downloadIndex(SCENE_GOOD, 'ndvi', { get: mockGet });

    // Must hit data URL, not the image (PNG) URL
    expect(mockGet.mock.calls[0][0]).toBe(SCENE_GOOD.data.ndvi);
    expect(mockGet.mock.calls[0][0]).not.toBe(SCENE_GOOD.image.ndvi);
  });

  it('throws when the requested index URL is missing from the scene', async () => {
    const scene = { data: { ndvi: 'url-ndvi' } }; // no ndwi key
    const mockGet = vi.fn();

    await expect(downloadIndex(scene, 'ndwi', { get: mockGet }))
      .rejects.toThrow('data.ndwi');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('throws when scene.data is absent entirely', async () => {
    await expect(downloadIndex({}, 'ndvi', { get: vi.fn() }))
      .rejects.toThrow('data.ndvi');
  });
});
