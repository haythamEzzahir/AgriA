import { config } from '../config/index.js';

const BASE_URL = 'https://api.agromonitoring.com/2.0';

async function request(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('appid', config.agroMonitoring.apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`AgroMonitoring error: ${res.status}`);
  return res.json();
}

export async function fetchNDVI(polygon) {
  const polygonCoords = typeof polygon === 'string' ? JSON.parse(polygon) : polygon;

  const ndviData = await request('/image/search', {
    start: Math.floor(Date.now() / 1000) - 86400 * 7,
    end: Math.floor(Date.now() / 1000),
    polygon: JSON.stringify(polygonCoords),
  });

  if (!ndviData.length) {
    return { ndvi: null, ndwi: null, soil_moisture: null, temperature: null };
  }

  const latest = ndviData[ndviData.length - 1];

  return {
    ndvi: latest.data.ndvi ?? null,
    ndwi: latest.data.ndwi ?? null,
    soil_moisture: latest.data.soil_moisture ?? null,
    temperature: latest.data.temperature ?? null,
  };
}

export async function getSatelliteImageUrl(polygon) {
  const data = await request('/image/search', {
    start: Math.floor(Date.now() / 1000) - 86400 * 30,
    end: Math.floor(Date.now() / 1000),
    polygon: JSON.stringify(polygon),
  });

  return data.length > 0 ? data[data.length - 1].image?.url : null;
}
