'use strict';

// Stage 2 — Satellite Image Acquisition
// Implements CORE_PIPELINE_SPEC.md §4

const axios = require('axios');
const config = require('./config');

const AGRO_BASE     = 'http://api.agromonitoring.com/agro/1.0';
const SECS_PER_DAY  = 86400;

// §4 Step 2.1 — Search for available satellite scenes.
// Returns the raw array of scenes from AgroMonitoring; no filtering applied.
// The caller is responsible for the 14-day → 30-day retry and stale_data fallback
// described in spec §4 Step 2.2:
//   1. Call with daysBack=14 and run pickBestScene.
//   2. If null, call again with daysBack=30 and run pickBestScene.
//   3. If still null, take the most recent scene regardless of quality and mark stale.
// _http is an optional HTTP client for unit-test injection (defaults to axios).
async function searchScenes({ polygonId, daysBack = 14, apiKey, _http = axios }) {
  const key = apiKey || config.AGROMONITORING_API_KEY;
  const now  = Math.floor(Date.now() / 1000);
  const start = now - daysBack * SECS_PER_DAY;

  const response = await _http.get(`${AGRO_BASE}/image/search`, {
    params: { start, end: now, polyid: polygonId, appid: key },
  });

  return response.data; // Scene[]
}

// §4 Step 2.2 — Scene selection logic (exact spec implementation).
// Filters to Sentinel-2, cloud < 30%, polygon coverage > 80%, returns most recent.
// Returns null when no scene survives the filters.
// On null the caller should retry with a wider window (see searchScenes comment above).
function pickBestScene(scenes) {
  const qualified = scenes
    .filter(s => s.type === 's2')   // Sentinel-2 only
    .filter(s => s.cl < 0.3)        // < 30% cloud cover
    .filter(s => s.dc > 80)         // > 80% polygon coverage
    .sort((a, b) => b.dt - a.dt);   // most recent first

  return qualified[0] || null;
}

// §4 Steps 2.3 + 2.4 — Download the GeoTIFF for a given index ('ndvi' | 'ndwi').
// Always uses scene.data.* (GeoTIFF), never scene.image.* (PNG palette image).
// Returns a Node.js Buffer containing the raw GeoTIFF bytes.
// _http is an optional HTTP client for unit-test injection (defaults to axios).
async function downloadIndex(scene, index, _http = axios) {
  const url = scene.data && scene.data[index];
  if (!url) {
    throw new Error(`Scene has no data.${index} URL`);
  }

  const response = await _http.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

module.exports = { searchScenes, pickBestScene, downloadIndex };
