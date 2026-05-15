import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSoilMoisture, fetchWeather, getFarmContext } from '../src/farm_context.js';

// Fixture weather payload from Open-Meteo
const WEATHER_RESPONSE = {
  data: {
    daily: {
      time: ['2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18'],
      temperature_2m_max:          [39,   38,  36,  35],
      precipitation_sum:           [0,   0.5, 2.5,  1.0], // days 0..3
      et0_fao_evapotranspiration:  [6.2, 5.8, 4.1,  3.9],
    },
  },
};

// Souss-Massa center from §11.1 in GeoJSON [lng, lat] order
const CENTER = [-9.5367, 30.4163]; // [lng, lat]

// ─── fetchSoilMoisture ────────────────────────────────────────────────────────

describe('fetchSoilMoisture', () => {
  it('GETs /soil with polyid and appid, returns moisture value', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: { moisture: 0.14 } });

    const result = await fetchSoilMoisture('poly123', 'test-key', { get: mockGet });

    expect(mockGet).toHaveBeenCalledWith(
      'http://api.agromonitoring.com/agro/1.0/soil',
      expect.objectContaining({ params: expect.objectContaining({ polyid: 'poly123', appid: 'test-key' }) })
    );
    expect(result).toBe(0.14);
  });

  it('handles an array response and returns the last entry\'s moisture', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: [
        { moisture: 0.22, dt: 1000 },
        { moisture: 0.14, dt: 2000 }, // most recent
      ],
    });

    const result = await fetchSoilMoisture('p', 'k', { get: mockGet });

    expect(result).toBe(0.14);
  });
});

// ─── fetchWeather ─────────────────────────────────────────────────────────────

describe('fetchWeather', () => {
  let mockGet;

  beforeEach(() => {
    mockGet = vi.fn().mockResolvedValue(WEATHER_RESPONSE);
  });

  it('calls Open-Meteo /forecast with latitude and longitude (not swapped)', async () => {
    // lat=30.4163, lng=-9.5367 — lat must be in `latitude`, lng in `longitude`
    await fetchWeather(30.4163, -9.5367, { get: mockGet });

    const { params } = mockGet.mock.calls[0][1];
    expect(params.latitude).toBe(30.4163);
    expect(params.longitude).toBe(-9.5367);
    // Guard against the swap: latitude must NOT be the longitude value
    expect(params.latitude).not.toBe(-9.5367);
  });

  it('requests the three required daily variables', async () => {
    await fetchWeather(30.4163, -9.5367, { get: mockGet });

    const { params } = mockGet.mock.calls[0][1];
    expect(params.daily).toContain('temperature_2m_max');
    expect(params.daily).toContain('precipitation_sum');
    expect(params.daily).toContain('et0_fao_evapotranspiration');
  });

  it('returns today\'s max temperature from index 0', async () => {
    const result = await fetchWeather(30.4163, -9.5367, { get: mockGet });
    expect(result.air_temperature).toBe(39);
  });

  it('sums precipitation_sum for the first 3 days only (indices 0..2)', async () => {
    // days: [0, 0.5, 2.5, 1.0] → sum of first 3 = 3.0; day 3 (1.0) must be excluded
    const result = await fetchWeather(30.4163, -9.5367, { get: mockGet });
    expect(result.rain_3d_mm).toBeCloseTo(3.0, 5); // 0 + 0.5 + 2.5
  });

  it('rain_3d_mm excludes day index 3 (only 3 days, not 4)', async () => {
    const result = await fetchWeather(30.4163, -9.5367, { get: mockGet });
    // If day 3 (1.0 mm) were included the sum would be 4.0
    expect(result.rain_3d_mm).not.toBeCloseTo(4.0, 2);
  });

  it('returns today\'s ET₀ from index 0', async () => {
    const result = await fetchWeather(30.4163, -9.5367, { get: mockGet });
    expect(result.et0_mm_per_day).toBe(6.2);
  });

  it('returns zero rain_3d_mm when all 3 days are dry', async () => {
    const dryResponse = {
      data: {
        daily: {
          time: ['2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18'],
          temperature_2m_max:         [39, 38, 37, 36],
          precipitation_sum:          [0, 0, 0, 5.0],
          et0_fao_evapotranspiration: [6.2, 5.8, 5.0, 4.5],
        },
      },
    };
    const mockDry = vi.fn().mockResolvedValue(dryResponse);
    const result = await fetchWeather(30.4163, -9.5367, { get: mockDry });
    expect(result.rain_3d_mm).toBe(0);
  });
});

// ─── getFarmContext ───────────────────────────────────────────────────────────

describe('getFarmContext', () => {
  it('calls soil and weather in parallel and merges into expected shape', async () => {
    const mockGet = vi.fn().mockImplementation((url) => {
      if (url.includes('/soil'))     return Promise.resolve({ data: { moisture: 0.14 } });
      if (url.includes('/forecast')) return Promise.resolve(WEATHER_RESPONSE);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await getFarmContext('poly123', CENTER, 'key', { get: mockGet });

    expect(result).toEqual({
      soil_moisture:   0.14,
      air_temperature: 39,
      rain_3d_mm:      3.0,
      et0_mm_per_day:  6.2,
    });
  });

  it('extracts lat/lng from center in GeoJSON [lng, lat] order and sends lat to Open-Meteo', async () => {
    const calls = [];
    const mockGet = vi.fn().mockImplementation((url, opts) => {
      calls.push({ url, params: opts.params });
      if (url.includes('/soil'))     return Promise.resolve({ data: { moisture: 0.14 } });
      if (url.includes('/forecast')) return Promise.resolve(WEATHER_RESPONSE);
    });

    // CENTER = [-9.5367, 30.4163] → lng=-9.5367, lat=30.4163
    await getFarmContext('p', CENTER, 'k', { get: mockGet });

    const weatherCall = calls.find(c => c.url.includes('/forecast'));
    // Open-Meteo must receive lat=30.4163, not lng=-9.5367
    expect(weatherCall.params.latitude).toBe(30.4163);
    expect(weatherCall.params.longitude).toBe(-9.5367);
  });

  it('makes exactly 2 HTTP calls (one soil, one weather)', async () => {
    const mockGet = vi.fn().mockImplementation((url) => {
      if (url.includes('/soil'))     return Promise.resolve({ data: { moisture: 0.2 } });
      if (url.includes('/forecast')) return Promise.resolve(WEATHER_RESPONSE);
    });

    await getFarmContext('p', CENTER, 'k', { get: mockGet });

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
