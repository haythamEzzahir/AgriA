#!/usr/bin/env node
'use strict';

// End-to-end demo — Souss-Massa tomato farm (spec §11.1).
//
// USE_AGRO_SAMPLE=true (default):
//   Bypasses AgroMonitoring API calls. Uses the local ndvi_sample.tif fixture
//   for pixel data and fixed farm-context values so the demo runs with zero
//   API keys. DEEPSEEK_API_KEY is optional — if absent, the narrative is skipped.
//
// USE_AGRO_SAMPLE=false:
//   Calls the full live pipeline. Requires AGROMONITORING_API_KEY and
//   DEEPSEEK_API_KEY in .env.
//   On first run it registers the polygon and caches the ID in
//   .polygon_cache.json so subsequent runs reuse it without burning quota.

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const axios = require('axios');

const { registerPolygon }    = require('../src/stage1_polygon');
const { decodeGeoTIFF, rawToNdvi8bit, rawToNdvi16bit, rawToNdviFloat32, detectBitDepth } = require('../src/stage3_decode');
const { mineValidPixels }    = require('../src/stage4_mine');
const { computeZoneGrid, bucketize } = require('../src/stage5_zones');
const { mergeIndicesByZone } = require('../src/stage6_aggregate');
const { runRuleEngine }      = require('../src/stage7_rules');
const { translate }          = require('../src/stage8_translate');
const { runPipeline, buildSummary } = require('../src/pipeline');

// §11.1 Souss-Massa polygon
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

// §11.9 farm context for sample mode (matches the spec walk-through)
const SAMPLE_FARM_CONTEXT = {
  soil_moisture:   0.14,
  air_temperature: 39,
  rain_3d_mm:      0,
  et0_mm_per_day:  6.2,
};

const FARM_NAME = "Ferme d'Ahmed";
const CACHE_FILE = path.join(__dirname, '../.polygon_cache.json');

// Returns the registered polygon data for this demo farm.
// Checks the local cache first to avoid re-registering on every run
// (AgroMonitoring returns 422 if the name is already taken in your account).
// If not cached, registers the polygon and saves the result to cache.
async function getOrRegisterPolygon() {
  // 1. Check local cache
  if (fs.existsSync(CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (cache[FARM_NAME]) {
      console.log(`   Using cached polygon: id=${cache[FARM_NAME].agro_polygon_id}`);
      return cache[FARM_NAME];
    }
  }

  // 2. Try to register
  console.log('   Registering polygon with AgroMonitoring...');
  let registered;
  try {
    registered = await registerPolygon({ name: FARM_NAME, geoJson: SOUSS_POLYGON });
    console.log(`   Registered: id=${registered.agro_polygon_id}, area=${registered.area_hectares} ha`);
  } catch (err) {
    // 3. 422 = name already exists in this account — look it up via GET /polygons
    const status = err.response?.status;
    if (status === 422 || status === 409) {
      console.log('   Name already registered — fetching existing polygon list...');
      const apiKey = process.env.AGROMONITORING_API_KEY;
      const { data: polygons } = await axios.get(
        'http://api.agromonitoring.com/agro/1.0/polygons',
        { params: { appid: apiKey } }
      );
      const match = polygons.find(p => p.name === FARM_NAME);
      if (!match) throw new Error(`Polygon named "${FARM_NAME}" not found in account after 422`);
      registered = {
        agro_polygon_id: match.id,
        area_hectares:   match.area,
        center:          match.center,
        polygon_geojson: SOUSS_POLYGON.geometry,
      };
      console.log(`   Found existing: id=${registered.agro_polygon_id}, area=${registered.area_hectares} ha`);
    } else {
      throw err;
    }
  }

  // 4. Cache for next run
  const cache = fs.existsSync(CACHE_FILE)
    ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
    : {};
  cache[FARM_NAME] = registered;
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

  return registered;
}

async function runSampleMode() {
  console.log('▶  Sample mode — using local fixture (no AgroMonitoring calls)\n');

  const fixturePath = path.join(__dirname, '../tests/fixtures/ndvi_sample.tif');
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}\nRun: node scripts/create_fixtures.js`);
  }

  const buffer = fs.readFileSync(fixturePath);

  const [ndviDecoded, ndwiDecoded] = await Promise.all([
    decodeGeoTIFF(buffer),
    decodeGeoTIFF(buffer),
  ]);

  const bitDepth   = detectBitDepth(ndviDecoded.pixels);
  const isFloat    = bitDepth === 32;
  const decoder    = isFloat ? rawToNdviFloat32
                  : bitDepth === 16 ? rawToNdvi16bit
                  : rawToNdvi8bit;
  const ndviPixels = mineValidPixels(ndviDecoded, SOUSS_POLYGON, decoder, isFloat);

  // Offset NDWI values so they differ from NDVI when the same fixture is used
  // for both indices. Without this, every zone shows identical NDVI/NDWI
  // readings and the results look like a cache hit.
  const ndwiDecoder = (raw) => decoder(raw) - 0.08;
  const ndwiPixels = mineValidPixels(ndwiDecoded, SOUSS_POLYGON, ndwiDecoder, isFloat);

  const zones      = computeZoneGrid(SOUSS_POLYGON);
  const zoneStats  = mergeIndicesByZone(
    bucketize(ndviPixels, zones),
    bucketize(ndwiPixels, zones)
  );

  const zoneDecisions = runRuleEngine(zoneStats, SAMPLE_FARM_CONTEXT, 1.84, 'tomato');
  const summary       = buildSummary(zoneDecisions);
  const analysis_id   = `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  let narrative;
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      narrative = await translate({
        farm:    { name: FARM_NAME, crop: 'tomato', analysis_date: new Date().toISOString().split('T')[0] },
        zones:   zoneDecisions,
        weather: SAMPLE_FARM_CONTEXT,
        language: 'mixed',
      });
    } catch (err) {
      console.warn(`[demo] Translation skipped: ${err.message}`);
      narrative = '[Translation unavailable]';
    }
  } else {
    console.warn('[demo] DEEPSEEK_API_KEY not set — skipping narrative translation\n');
    narrative = '[Set DEEPSEEK_API_KEY in .env to enable narrative translation]';
  }

  return {
    analysis_id,
    farm_id:        'sample',
    analysis_date:  new Date().toISOString(),
    satellite_date: new Date().toISOString() + ' [sample fixture]',
    is_demo_data:   true,
    summary,
    zones:          zoneDecisions,
    narrative,
  };
}

async function main() {
  const useSample = process.env.USE_AGRO_SAMPLE !== 'false';

  console.log('═══════════════════════════════════════════════════');
  console.log('  AgriCopilot Core — End-to-End Demo');
  console.log("  Farm: Ferme d'Ahmed, Souss-Massa (spec §11.1)");
  console.log('═══════════════════════════════════════════════════\n');

  let result;
  if (useSample) {
    result = await runSampleMode();
  } else {
    console.log('▶  Live mode — calling all external APIs\n');

    const registered = await getOrRegisterPolygon();
    console.log('');

    const liveFarm = {
      name:            FARM_NAME,
      crop:            'tomato',
      agro_polygon_id: registered.agro_polygon_id,
      area_hectares:   registered.area_hectares,
      center:          registered.center,
      polygon_geojson: SOUSS_POLYGON,
    };

    result = await runPipeline({ farm: liveFarm, language: 'mixed' });
  }

  console.log('\n─── Pipeline result ────────────────────────────────');
  console.log(JSON.stringify(result, null, 2));
  console.log('────────────────────────────────────────────────────\n');

  if (result.narrative && !result.narrative.startsWith('[')) {
    console.log('─── Narrative (DeepSeek) ───────────────────────────');
    console.log(result.narrative);
    console.log('────────────────────────────────────────────────────\n');
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('\n[demo] Fatal error:', err.message);
  process.exit(1);
});
