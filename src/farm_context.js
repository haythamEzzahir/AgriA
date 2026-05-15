'use strict';

// Farm Context Loader — soil moisture + weather
// Implements the farm-wide inputs described in CORE_PIPELINE_SPEC.md §9.1

const axios  = require('axios');
const config = require('./config');

const AGRO_BASE = 'http://api.agromonitoring.com/agro/1.0';

// §9.1 — Fetch surface soil moisture from AgroMonitoring /soil.
// Returns a fraction in [0, 1]; e.g. 0.14 = 14% volumetric water content.
// Response may be a single object or an array sorted ascending by time;
// we always take the most-recent entry.
async function fetchSoilMoisture(polygonId, apiKey, _http = axios) {
  const key = apiKey || config.AGROMONITORING_API_KEY;

  try {
    const response = await _http.get(`${AGRO_BASE}/soil`, {
      params: { polyid: polygonId, appid: key },
    });

    const data = Array.isArray(response.data)
      ? response.data[response.data.length - 1]
      : response.data;

    return data.moisture; // volumetric water content, 0..1
  } catch (err) {
    console.warn(`[farm_context] AgroMonitoring soil API failed: ${err.message}`);
    console.warn('[farm_context] Using default soil moisture 0.20 (moderate)');
    return 0.20; // moderate default — irrigation model still works
  }
}

// §9.1 — Fetch air temperature, 3-day rainfall forecast, and
// evapotranspiration from Open-Meteo.
//
// Coordinate note: `center` elsewhere in the pipeline is [lng, lat] (GeoJSON).
// Open-Meteo's API requires `latitude` first, `longitude` second.
// This function accepts (lat, lng) so the caller handles the swap explicitly
// at the boundary — see getFarmContext below.
async function fetchWeather(lat, lng, _http = axios) {
  const base = config.OPEN_METEO_BASE;

  const response = await _http.get(`${base}/forecast`, {
    params: {
      latitude:  lat,  // Open-Meteo: lat first
      longitude: lng,  // Open-Meteo: lng second
      daily:     'temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration',
      forecast_days: 4,
      timezone:  'auto',
    },
  });

  const { daily } = response.data;

  const air_temperature  = daily.temperature_2m_max[0];           // today's high °C
  const rain_3d_mm       = daily.precipitation_sum                 // next 3 days total
    .slice(0, 3)
    .reduce((s, v) => s + v, 0);
  const et0_mm_per_day   = daily.et0_fao_evapotranspiration[0];   // today's ET₀

  return { air_temperature, rain_3d_mm, et0_mm_per_day };
}

// §9.1 — Fetch soil moisture and weather in parallel, merge into farmContext.
// center is [lng, lat] (GeoJSON order).
// Open-Meteo wants (lat, lng) — swap is performed here at the boundary.
async function getFarmContext(polygonId, center, apiKey, _http = axios) {
  const [lng, lat] = center; // GeoJSON [lng, lat] → extract for Open-Meteo

  const [soil_moisture, weather] = await Promise.all([
    fetchSoilMoisture(polygonId, apiKey, _http),
    fetchWeather(lat, lng, _http),       // lat first — see coordinate note above
  ]);

  return { soil_moisture, ...weather };
}

module.exports = { fetchSoilMoisture, fetchWeather, getFarmContext };
