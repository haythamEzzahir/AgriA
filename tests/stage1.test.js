import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePolygon, registerPolygon } from '../src/stage1_polygon.js';

// §11.1 — Souss-Massa example polygon, [lng, lat] order, ~1.84 ha
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

// ─── validatePolygon ──────────────────────────────────────────────────────────

describe('validatePolygon', () => {
  it('accepts the valid 1.84 ha Souss-Massa polygon (§11.1)', () => {
    const result = validatePolygon(SOUSS_POLYGON);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a polygon under 1 ha', () => {
    // ~4 m² rectangle — far below the 1 ha minimum
    const tiny = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-9.53750, 30.41560],
          [-9.53752, 30.41560],
          [-9.53752, 30.41562],
          [-9.53750, 30.41562],
          [-9.53750, 30.41560],
        ]],
      },
    };
    const result = validatePolygon(tiny);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/minimum|1 ha/i);
  });

  it('rejects a polygon over 3000 ha', () => {
    // 40° × 40° box — hundreds of millions of ha
    const huge = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-20,  20],
          [ 20,  20],
          [ 20, -20],
          [-20, -20],
          [-20,  20],
        ]],
      },
    };
    const result = validatePolygon(huge);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/maximum|3000/i);
  });

  it('rejects an unclosed polygon', () => {
    // Last point deliberately omitted
    const unclosed = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-9.5375, 30.4156],
          [-9.5360, 30.4156],
          [-9.5360, 30.4170],
          [-9.5375, 30.4170],
          // ← closing point missing
        ]],
      },
    };
    const result = validatePolygon(unclosed);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/closed/i);
  });

  it('rejects coordinates in [lat, lng] order (gotcha 12.1)', () => {
    // Souss-Massa polygon with axes swapped: first element ~30 (lat), second ~−9 (lng)
    const swapped = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [30.4156, -9.5375],
          [30.4156, -9.5360],
          [30.4170, -9.5360],
          [30.4170, -9.5375],
          [30.4156, -9.5375],
        ]],
      },
    };
    const result = validatePolygon(swapped);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/lat.*lng|lng.*lat/i);
  });
});

// ─── registerPolygon ──────────────────────────────────────────────────────────

describe('registerPolygon', () => {
  let mockPost;

  beforeEach(() => {
    mockPost = vi.fn();
  });

  it('POSTs the correct body and returns the persisted shape (§3)', async () => {
    mockPost.mockResolvedValue({
      data: {
        id:     '5abb9fb82c8897000bde3e87',
        area:   1.84,
        center: [-9.5367, 30.4163],
      },
    });

    const result = await registerPolygon({
      name:    'ferme_ahmed_souss_001',
      geoJson: SOUSS_POLYGON,
      apiKey:  'test-key',
      _http:   { post: mockPost },
    });

    // Verify endpoint, body shape, and apiKey query param
    expect(mockPost).toHaveBeenCalledWith(
      'http://api.agromonitoring.com/agro/1.0/polygons',
      expect.objectContaining({
        name: 'ferme_ahmed_souss_001',
        geo_json: expect.objectContaining({
          type:     'Feature',
          geometry: SOUSS_POLYGON.geometry,
        }),
      }),
      { params: { appid: 'test-key' } }
    );

    // Verify persisted shape contract (BUILD_PLAN.md §3)
    expect(result).toEqual({
      agro_polygon_id: '5abb9fb82c8897000bde3e87',
      area_hectares:   1.84,
      center:          [-9.5367, 30.4163],
      polygon_geojson: SOUSS_POLYGON.geometry,
    });
  });

  it('throws "Invalid polygon" and never calls HTTP if validation fails', async () => {
    const invalid = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        // Only 3 points — below the minimum of 4
        coordinates: [[[-9.5375, 30.4156], [-9.5375, 30.4156], [-9.5375, 30.4156]]],
      },
    };
    await expect(
      registerPolygon({ name: 'test', geoJson: invalid, apiKey: 'key', _http: { post: mockPost } })
    ).rejects.toThrow('Invalid polygon');
    expect(mockPost).not.toHaveBeenCalled();
  });
});
