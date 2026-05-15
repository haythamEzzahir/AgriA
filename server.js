'use strict';

// AgriCopilot Web Server — Express API + static frontend

require('dotenv').config();

const express    = require('express');
const path       = require('path');
const { validatePolygon, registerPolygon } = require('./src/stage1_polygon');
const { runPipeline } = require('./src/pipeline');
const config = require('./src/config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/health — liveness check
app.get('/api/health', (_req, res) => {
  const hasAgro   = !!process.env.AGROMONITORING_API_KEY;
  const hasDS     = !!process.env.DEEPSEEK_API_KEY;
  res.json({
    ok: true,
    started: serverStartTime,
    env: {
      AGROMONITORING_API_KEY: hasAgro,
      DEEPSEEK_API_KEY:       hasDS,
      USE_AGRO_SAMPLE:        process.env.USE_AGRO_SAMPLE !== 'false',
    },
  });
});

// In-memory polygon cache — avoids re-registering the same farm-polygon pair on
// every analysis. Keyed by farm name + a crc32 of the coordinate ring so that a
// change in the drawn polygon always triggers a fresh registration.
// Persists only for the lifetime of this server process.
const polygonCache = new Map();

function polygonCacheKey(name, coordinates) {
  // Simple numeric hash of the coords ring — enough to distinguish different polygons.
  let h = 0;
  for (const pair of coordinates) {
    h = ((h << 5) - h + Math.round(pair[0] * 1e7)) | 0;
    h = ((h << 5) - h + Math.round(pair[1] * 1e7)) | 0;
  }
  return `${name}::${h}`;
}

// POST /api/analyze — full pipeline run
app.post('/api/analyze', async (req, res) => {
  const { name, crop, coordinates, language } = req.body;

  // Basic input validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Farm name is required' });
  }
  if (!Array.isArray(coordinates) || coordinates.length < 4) {
    return res.status(400).json({ error: 'At least 4 coordinate pairs required (closed polygon)' });
  }

  const geoJson = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };

  // Validate polygon client-side rules first
  const validation = validatePolygon(geoJson);
  if (!validation.ok) {
    return res.status(422).json({ error: 'Invalid polygon', details: validation.errors });
  }

  try {
    const farmName = name.trim();
    const cacheKey = polygonCacheKey(farmName, coordinates);

    // Use cached polygon ID if we've registered this exact farm+polygon before
    let registered = polygonCache.get(cacheKey);
    if (registered) {
      console.log(`[server] Using cached polygon "${farmName}" (key=${cacheKey}): id=${registered.agro_polygon_id}`);
    } else {
      console.log(`[server] Registering polygon "${farmName}"...`);
      // duplicated=true allows re-registering with the same name (avoids 422 when
      // shape differs slightly; the cache already prevents unnecessary API calls).
      registered = await registerPolygon({
        name: farmName,
        geoJson,
        duplicated: true,
      });
      polygonCache.set(cacheKey, registered);
      console.log(`[server] Polygon registered: id=${registered.agro_polygon_id}, area=${registered.area_hectares} ha`);
    }

    console.log(`[server] Running pipeline...`);

    const result = await runPipeline({
      farm: {
        name: farmName,
        crop: crop || 'unknown',
        agro_polygon_id: registered.agro_polygon_id,
        area_hectares:   registered.area_hectares,
        center:          registered.center,
        polygon_geojson: registered.polygon_geojson,
      },
      language: language || 'mixed',
    });

    console.log(`[server] Pipeline complete — ${result.zones.length} zones analyzed`);
    res.json(result);
  } catch (err) {
    console.error(`[server] Pipeline failed:`, err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));

    // Classify known errors
    const msg = err.message || String(err);
    if (msg.includes('Invalid polygon')) {
      return res.status(422).json({ error: 'Invalid polygon', details: msg });
    }
    if (msg.includes('status code 4') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return res.status(502).json({ error: 'Upstream API unavailable', details: msg });
    }
    // Dev mode: always return full error details so we can diagnose
    res.status(500).json({ error: 'Pipeline failed', details: msg });
  }
});

const serverStartTime = new Date().toISOString();
app.listen(PORT, () => {
  console.log(`\n🌾  AgriCopilot Web Server`);
  console.log(`   http://localhost:${PORT}\n`);
});
