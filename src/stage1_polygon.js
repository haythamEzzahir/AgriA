'use strict';

// Stage 1 — Polygon Registration
// Implements CORE_PIPELINE_SPEC.md §3

const axios = require('axios');
const turf  = require('@turf/turf');
const config = require('./config');

const AGRO_BASE   = 'http://api.agromonitoring.com/agro/1.0';
const MIN_AREA_HA = 1;      // §3 constraints table
const MAX_AREA_HA = 3000;   // §3 constraints table
const M2_PER_HA   = 10_000;

// §3 "Constraints to validate before calling"
// Returns { ok: boolean, errors: string[] }
function validatePolygon(geoJson) {
  const errors = [];

  // Normalise to geometry
  let geometry;
  if (geoJson && geoJson.type === 'Feature') {
    geometry = geoJson.geometry;
  } else if (geoJson && geoJson.type === 'Polygon') {
    geometry = geoJson;
  } else {
    return { ok: false, errors: ['geoJson must be a GeoJSON Feature or Polygon'] };
  }

  if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) {
    return { ok: false, errors: ['geometry must be type Polygon with coordinates'] };
  }

  const ring = geometry.coordinates[0];

  // §3: minimum 4 coordinate pairs (3 corners + closing point)
  if (!ring || ring.length < 4) {
    return { ok: false, errors: ['Polygon must have at least 4 coordinate pairs (3 corners + closing point)'] };
  }

  // §3: polygon must be closed — last point must equal first
  const first = ring[0];
  const last  = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    errors.push('Polygon is not closed: the last coordinate must equal the first');
  }

  // Gotcha 12.1: detect likely [lat, lng] swap.
  // In GeoJSON, index 0 is longitude and index 1 is latitude.
  // A classic Leaflet mistake produces first elements in (0, 90) — typical lat range —
  // while second elements are negative — typical western longitude.
  const allFirstInLatRange = ring.every(c => c[0] > 0 && c[0] < 90);
  const allSecondNegative  = ring.every(c => c[1] < 0);
  if (allFirstInLatRange && allSecondNegative) {
    errors.push(
      'Coordinates appear to be [lat, lng] order; GeoJSON requires [longitude, latitude] (gotcha 12.1)'
    );
  }

  // Hard range checks — lat outside [-90,90] or lng outside [-180,180] is always invalid
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    if (lng < -180 || lng > 180) {
      errors.push(`Point ${i}: longitude ${lng} is outside [-180, 180]`);
    }
    if (lat < -90 || lat > 90) {
      errors.push(`Point ${i}: latitude ${lat} is outside [-90, 90]`);
    }
  }

  // Return early — area/intersection checks need valid coordinates
  if (errors.length > 0) return { ok: false, errors };

  const feature = geoJson.type === 'Feature' ? geoJson : turf.feature(geometry);

  // §3: area between 1 ha and 3000 ha
  const areaHa = turf.area(feature) / M2_PER_HA;
  if (areaHa < MIN_AREA_HA) {
    errors.push(`Area is ${areaHa.toFixed(4)} ha — minimum is ${MIN_AREA_HA} ha`);
  } else if (areaHa > MAX_AREA_HA) {
    errors.push(`Area is ${areaHa.toFixed(2)} ha — maximum is ${MAX_AREA_HA} ha`);
  }

  // §3: no self-intersection
  const kinks = turf.kinks(feature);
  if (kinks.features.length > 0) {
    errors.push(`Polygon has ${kinks.features.length} self-intersection(s)`);
  }

  return { ok: errors.length === 0, errors };
}

// §3 "API call" + "What to persist"
// Validates, POSTs to AgroMonitoring, returns persisted shape.
// farm_id / user_id are omitted — they belong to the persistence layer above this module.
// _http is an optional HTTP client (defaults to axios) used for unit-test injection.
async function registerPolygon({ name, geoJson, apiKey, duplicated = false, _http = axios }) {
  const validation = validatePolygon(geoJson);
  if (!validation.ok) {
    throw new Error(`Invalid polygon: ${validation.errors.join('; ')}`);
  }

  const key      = apiKey || config.AGROMONITORING_API_KEY;
  const geometry = geoJson.type === 'Feature' ? geoJson.geometry : geoJson;

  // §3 "API call" — exact body shape
  const body = {
    name,
    geo_json: {
      type: 'Feature',
      properties: {},
      geometry,
    },
  };

  const params = { appid: key };
  if (duplicated) params.duplicated = true;

  const response = await _http.post(
    `${AGRO_BASE}/polygons`,
    body,
    { params }
  );

  const { id, area, center } = response.data;

  // §3 "What to persist" (contract from BUILD_PLAN.md §3)
  return {
    agro_polygon_id: id,
    area_hectares:   area,
    center,
    polygon_geojson: geometry,
  };
}

module.exports = { validatePolygon, registerPolygon };
