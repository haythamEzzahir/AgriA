import { describe, it, expect, vi } from 'vitest';
import { pixelToLngLat, isValidPixel, isInsidePolygon, mineValidPixels } from '../src/stage4_mine.js';
import { rawToNdvi8bit } from '../src/stage3_decode.js';

// Souss-Massa bbox and dimensions used throughout (§11.1)
const BBOX   = [-9.5375, 30.4156, -9.5360, 30.4170];
const WIDTH  = 4;
const HEIGHT = 4;

// Inner rectangle that contains only the 2×2 centre pixels: (col,row) = (1,1),(2,1),(1,2),(2,2)
// Verified: col0 lng=-9.5373125 < -9.5371, col3 lng=-9.5361875 > -9.5364
//           row0 lat=30.4168250 > 30.4167, row3 lat=30.4157750 < 30.4159
const INNER_POLYGON = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-9.5371, 30.4159],
      [-9.5364, 30.4159],
      [-9.5364, 30.4167],
      [-9.5371, 30.4167],
      [-9.5371, 30.4159],
    ]],
  },
};

// ─── pixelToLngLat ────────────────────────────────────────────────────────────

describe('pixelToLngLat (§6.1)', () => {
  it('pixel (0,0) is near the NW corner (minLng, maxLat)', () => {
    const [lng, lat] = pixelToLngLat(0, 0, WIDTH, HEIGHT, BBOX);
    // pixel (0,0) centre is half a pixel inward from the NW corner
    expect(lng).toBeCloseTo(-9.5373125, 7);
    expect(lat).toBeCloseTo( 30.4168250, 7);
    // Must be slightly east of minLng and slightly south of maxLat
    expect(lng).toBeGreaterThan(BBOX[0]);  // east of minLng
    expect(lat).toBeLessThan(BBOX[3]);     // south of maxLat
  });

  it('pixel (width-1, height-1) is near the SE corner (maxLng, minLat)', () => {
    const [lng, lat] = pixelToLngLat(WIDTH - 1, HEIGHT - 1, WIDTH, HEIGHT, BBOX);
    expect(lng).toBeCloseTo(-9.5361875, 7);
    expect(lat).toBeCloseTo( 30.4157750, 7);
    // Must be slightly west of maxLng and slightly north of minLat
    expect(lng).toBeLessThan(BBOX[2]);    // west of maxLng
    expect(lat).toBeGreaterThan(BBOX[1]); // north of minLat
  });

  it('row increases southward — row 0 has higher lat than row 1 (gotcha 12.3)', () => {
    const [, lat0] = pixelToLngLat(0, 0, WIDTH, HEIGHT, BBOX);
    const [, lat1] = pixelToLngLat(0, 1, WIDTH, HEIGHT, BBOX);
    expect(lat0).toBeGreaterThan(lat1); // north is top → row 0 > row 1
  });

  it('column increases eastward — col 1 has higher lng than col 0', () => {
    const [lng0] = pixelToLngLat(0, 0, WIDTH, HEIGHT, BBOX);
    const [lng1] = pixelToLngLat(1, 0, WIDTH, HEIGHT, BBOX);
    expect(lng1).toBeGreaterThan(lng0);
  });

  it('uses pixel centre (+0.5 offset) — two adjacent pixels are one full pixel apart', () => {
    const [lng0] = pixelToLngLat(0, 0, WIDTH, HEIGHT, BBOX);
    const [lng1] = pixelToLngLat(1, 0, WIDTH, HEIGHT, BBOX);
    const lngPerPixel = (BBOX[2] - BBOX[0]) / WIDTH;
    expect(lng1 - lng0).toBeCloseTo(lngPerPixel, 9);
  });
});

// ─── isValidPixel ─────────────────────────────────────────────────────────────

describe('isValidPixel (§6.2)', () => {
  it('returns false for 0 (no-data sentinel)',   () => expect(isValidPixel(0)).toBe(false));
  it('returns false for 255 (saturated/masked)', () => expect(isValidPixel(255)).toBe(false));
  it('returns false for null',                   () => expect(isValidPixel(null)).toBe(false));
  it('returns false for undefined',              () => expect(isValidPixel(undefined)).toBe(false));
  it('returns false for NaN',                    () => expect(isValidPixel(NaN)).toBe(false));

  it('returns true for 1 (lowest valid value)',   () => expect(isValidPixel(1)).toBe(true));
  it('returns true for 128 (mid-range)',          () => expect(isValidPixel(128)).toBe(true));
  it('returns true for 254 (highest valid value)',() => expect(isValidPixel(254)).toBe(true));
});

// ─── isInsidePolygon ─────────────────────────────────────────────────────────

describe('isInsidePolygon (§6.3)', () => {
  it('returns true for a point clearly inside the polygon', () => {
    // Centre of INNER_POLYGON
    expect(isInsidePolygon(-9.53675, 30.4163, INNER_POLYGON)).toBe(true);
  });

  it('returns false for a point clearly outside', () => {
    // Far outside — west edge of the full bbox
    expect(isInsidePolygon(-9.5374, 30.4163, INNER_POLYGON)).toBe(false);
  });
});

// ─── mineValidPixels ─────────────────────────────────────────────────────────

describe('mineValidPixels (§6.4)', () => {
  function makeDecoded(pixelValues) {
    return { pixels: new Uint8Array(pixelValues), width: WIDTH, height: HEIGHT, bbox: BBOX };
  }

  it('returns only the 4 pixels that are valid AND inside the inner polygon', () => {
    const decoded = makeDecoded(new Array(16).fill(128));
    const result  = mineValidPixels(decoded, INNER_POLYGON, rawToNdvi8bit);
    expect(result).toHaveLength(4);
  });

  it('result objects have { lng, lat, value } shape (not ndvi)', () => {
    const decoded = makeDecoded(new Array(16).fill(128));
    const result  = mineValidPixels(decoded, INNER_POLYGON, rawToNdvi8bit);
    for (const px of result) {
      expect(px).toHaveProperty('lng');
      expect(px).toHaveProperty('lat');
      expect(px).toHaveProperty('value');
      expect(px).not.toHaveProperty('ndvi');
    }
  });

  it('lng/lat of each surviving pixel matches pixelToLngLat output', () => {
    const decoded = makeDecoded(new Array(16).fill(128));
    const result  = mineValidPixels(decoded, INNER_POLYGON, rawToNdvi8bit);

    // The surviving pixels are at (col,row) = (1,1),(2,1),(1,2),(2,2)
    const expectedCoords = [
      pixelToLngLat(1, 1, WIDTH, HEIGHT, BBOX),
      pixelToLngLat(2, 1, WIDTH, HEIGHT, BBOX),
      pixelToLngLat(1, 2, WIDTH, HEIGHT, BBOX),
      pixelToLngLat(2, 2, WIDTH, HEIGHT, BBOX),
    ].sort((a, b) => a[0] - b[0] || b[1] - a[1]);

    const resultCoords = result
      .map(p => [p.lng, p.lat])
      .sort((a, b) => a[0] - b[0] || b[1] - a[1]);

    for (let i = 0; i < 4; i++) {
      expect(resultCoords[i][0]).toBeCloseTo(expectedCoords[i][0], 7);
      expect(resultCoords[i][1]).toBeCloseTo(expectedCoords[i][1], 7);
    }
  });

  it('excludes raw=0 (no-data) pixels even when inside the polygon', () => {
    const pixels = new Array(16).fill(128);
    pixels[1 * WIDTH + 1] = 0;   // (col=1,row=1) — inside polygon but invalid
    const result = mineValidPixels(makeDecoded(pixels), INNER_POLYGON, rawToNdvi8bit);
    expect(result).toHaveLength(3);
  });

  it('excludes raw=255 (saturated) pixels even when inside the polygon', () => {
    const pixels = new Array(16).fill(128);
    pixels[1 * WIDTH + 2] = 255; // (col=1,row=2) — inside polygon but invalid
    const result = mineValidPixels(makeDecoded(pixels), INNER_POLYGON, rawToNdvi8bit);
    expect(result).toHaveLength(3);
  });

  it('calls the injected decoder with the raw value and uses its return as value', () => {
    const mockDecoder = vi.fn(raw => raw / 100);
    const pixels = new Array(16).fill(200);
    const result = mineValidPixels(makeDecoded(pixels), INNER_POLYGON, mockDecoder);

    expect(result).toHaveLength(4);
    expect(mockDecoder).toHaveBeenCalledTimes(4);
    expect(mockDecoder).toHaveBeenCalledWith(200);
    expect(result[0].value).toBeCloseTo(2.0, 5);
  });

  it('returns empty array when no pixel is inside the polygon', () => {
    // Polygon far away from the image
    const outsidePolygon = {
      type: 'Feature', properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0],[1, 0],[1, 1],[0, 1],[0, 0]]] },
    };
    const decoded = makeDecoded(new Array(16).fill(128));
    expect(mineValidPixels(decoded, outsidePolygon, rawToNdvi8bit)).toHaveLength(0);
  });
});
