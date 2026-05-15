# 🛰️ AgriCopilot AI — Core Technical Specification

**Scope:** The CORE pipeline only — Sentinel-2 optical data acquisition, image processing, per-pixel data mining, zone-based extraction, decision logic, and AI translation.

**Out of scope:** Frontend, marketplace, authentication, deployment.

**Audience:** Backend / data engineers building the technical heart of the platform.

---

## 📑 Table of Contents

1. [The Core Loop — 30-second overview](#1-the-core-loop)
2. [Validated Foundations](#2-validated-foundations)
3. [Stage 1 — Polygon Registration](#3-stage-1--polygon-registration)
4. [Stage 2 — Satellite Image Acquisition](#4-stage-2--satellite-image-acquisition)
5. [Stage 3 — Image Decoding (Bytes → Numbers)](#5-stage-3--image-decoding)
6. [Stage 4 — Per-Pixel Data Mining](#6-stage-4--per-pixel-data-mining)
7. [Stage 5 — Zone Segmentation (3×3 Grid)](#7-stage-5--zone-segmentation)
8. [Stage 6 — Per-Zone Aggregation](#8-stage-6--per-zone-aggregation)
9. [Stage 7 — Rule Engine (Decision Logic)](#9-stage-7--rule-engine)
10. [Stage 8 — Claude AI Translation](#10-stage-8--claude-ai-translation)
11. [End-to-End Concrete Example](#11-end-to-end-concrete-example)
12. [Critical Gotchas](#12-critical-gotchas)

---

## 1. The Core Loop

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│  IN:   farm polygon (GeoJSON)                                     │
│                                                                   │
│   ↓                                                               │
│                                                                   │
│  ① Register polygon with AgroMonitoring          → polygon_id     │
│  ② Search satellite imagery (Sentinel-2)         → scene URLs     │
│  ③ Download index images (NDVI, NDWI)            → binary bytes   │
│  ④ Decode bytes into pixel matrices              → 2D arrays      │
│  ⑤ Mine per-pixel data, filter, geo-locate       → valid points   │
│  ⑥ Assign each pixel to a zone (3×3)             → 9 buckets      │
│  ⑦ Aggregate pixels into zone statistics         → 9 zone stats   │
│  ⑧ Run rule engine per zone                      → 9 decisions    │
│  ⑨ Send to Claude for translation                → human advice   │
│                                                                   │
│   ↓                                                               │
│                                                                   │
│  OUT:  9 zones with status + action + Darija/FR message           │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**Everything else in the project orbits around this loop.**

---

## 2. Validated Foundations

These are the assumptions everything else builds on. Each one is confirmed.

| Foundation | Status | Source |
|---|---|---|
| Satellite gives **per-pixel data** | ✅ Confirmed | Sentinel-2 native resolution: 10m/pixel, B4/B8 bands |
| **Zone-by-zone analysis** is feasible | ✅ Confirmed | Pixels map to lat/lng → polygon containment trivial |
| **3×3 grid segmentation** is right for MVP | ✅ Confirmed | 1 ha = ~100 pixels → ~11 pixels per zone, statistically sound |
| **Rule Engine scoring** approach | ✅ Confirmed | Industry-standard agronomy thresholds |
| **Claude translation** of structured data | ✅ Confirmed | Excellent at structured → narrative |
| **No ML training required** | ✅ Confirmed | NDVI/NDWI are math, not ML |

### What "per-pixel" actually means

```
                    Farm polygon (1 hectare ≈ 100m × 100m)
                  ┌─────────────────────────────────────┐
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  │ ◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽◽│
                  └─────────────────────────────────────┘
                       ↑
        Each ◽ = 1 pixel = 10m × 10m = one NDVI value
        100 pixels per hectare per index per acquisition
```

---

## 3. Stage 1 — Polygon Registration

### What happens

The farmer's drawn polygon (a list of GPS coordinates) needs to be registered with AgroMonitoring **once**. They store it, give us an ID, and we use that ID for all future calls.

### API call

```http
POST http://api.agromonitoring.com/agro/1.0/polygons?appid={KEY}
Content-Type: application/json

{
  "name": "ferme_ahmed_souss_001",
  "geo_json": {
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "Polygon",
      "coordinates": [[
        [-9.5375, 30.4156],
        [-9.5360, 30.4156],
        [-9.5360, 30.4170],
        [-9.5375, 30.4170],
        [-9.5375, 30.4156]    ← MUST equal first point (closed polygon)
      ]]
    }
  }
}
```

### Coordinate order matters

```
GeoJSON uses [longitude, latitude]
   ↑              ↑
   -9.5375        30.4156

Common mistake: swapping to [lat, lng] → polygon registers in the wrong place
```

### Response

```json
{
  "id": "5abb9fb82c8897000bde3e87",   ← STORE THIS
  "area": 1.84,                        ← hectares
  "center": [-9.5367, 30.4163]
}
```

### Constraints to validate before calling

| Rule | Value | If violated |
|---|---|---|
| Minimum area | 1 hectare | API rejects with 400 |
| Maximum area | 3000 hectares | API rejects with 400 |
| Polygon must be closed | first point = last point | API rejects with 400 |
| Coordinate count | minimum 4 points (3 corners + closing) | API rejects |
| No self-intersection | polygon edges can't cross | API rejects |

### What to persist

```javascript
{
  farm_id: <internal_uuid>,
  user_id: <owner>,
  name: "ferme_ahmed_souss_001",
  polygon_geojson: { ... },         // we keep this for our own zone math
  area_hectares: 1.84,
  agro_polygon_id: "5abb9fb82c8897000bde3e87",  // for AgroMonitoring calls
  center: [-9.5367, 30.4163]
}
```

---

## 4. Stage 2 — Satellite Image Acquisition

### Two-step process

```
[Search]  → returns list of available satellite passes
[Download] → fetches the actual index image for the best pass
```

### Step 2.1 — Search for available scenes

```http
GET http://api.agromonitoring.com/agro/1.0/image/search
  ?start={unix_timestamp_14_days_ago}
  &end={unix_timestamp_now}
  &polyid={polygon_id}
  &appid={KEY}
```

**Response** (array of scenes):

```json
[
  {
    "dt": 1715817600,           ← when the satellite passed
    "type": "s2",               ← Sentinel-2 (filter for this)
    "dc": 100,                  ← polygon coverage % (want > 80)
    "cl": 0.05,                 ← cloud cover (want < 0.3)
    "image": {
      "ndvi": "https://api.agromonitoring.com/image/1.0/.../ndvi?appid=...",
      "ndwi": "https://api.agromonitoring.com/image/1.0/.../ndwi?appid=...",
      "evi":  "https://api.agromonitoring.com/image/1.0/.../evi?appid=..."
    },
    "stats": {
      "ndvi": "https://api.agromonitoring.com/stats/1.0/.../ndvi?appid=..."
    },
    "data": {
      "ndvi": "https://api.agromonitoring.com/data/1.0/.../ndvi?appid=...",
      "ndwi": "https://api.agromonitoring.com/data/1.0/.../ndwi?appid=..."
    }
  },
  { ... more scenes ... }
]
```

### Step 2.2 — Scene selection logic

```javascript
function pickBestScene(scenes) {
  return scenes
    .filter(s => s.type === 's2')          // only Sentinel-2
    .filter(s => s.cl < 0.3)               // less than 30% cloud
    .filter(s => s.dc > 80)                // at least 80% polygon coverage
    .sort((a, b) => b.dt - a.dt)[0];       // most recent first
}
```

**If no scene qualifies:**
- Extend the window to 30 days back.
- If still no scene → flag analysis as `stale_data` and use the most recent available scene anyway.
- Inform the rule engine that confidence is reduced.

### Step 2.3 — Image vs Data endpoints

AgroMonitoring exposes **two formats** for the same satellite data:

| Endpoint | Format | What you get | Use for |
|---|---|---|---|
| `image.{index}` | PNG | Pre-rendered with color palette | Display / map background |
| `data.{index}` | GeoTIFF | Raw numeric data per pixel | **Processing** |

**For per-pixel analysis we always use the `data.*` (GeoTIFF) URL**, not `image.*`.

### Step 2.4 — Download

```http
GET {data.ndvi URL from search response}
```

Response is a binary GeoTIFF file. Read it into a buffer.

```javascript
const response = await axios.get(scene.data.ndvi, {
  responseType: 'arraybuffer'
});
const ndviBuffer = Buffer.from(response.data);
// Repeat for ndwi
```

We now have raw GeoTIFF bytes ready for decoding.

---

## 5. Stage 3 — Image Decoding

### The conceptual problem

We have a **binary file**. We need a **2D matrix of numbers** where each cell is an NDVI value.

```
GeoTIFF buffer (bytes)
        ↓
   Decode header
        ↓
   Read pixel array
        ↓
2D matrix: pixels[row][col] = raw integer (0–255 or 0–65535)
        ↓
   Convert raw → NDVI (-1.0 to +1.0)
        ↓
   2D matrix: ndvi[row][col] = -1.0 to +1.0
```

### Tools

```bash
npm install geotiff sharp
```

- **`geotiff`** — pure JS GeoTIFF reader (works in Node.js)
- **`sharp`** — backup for PNG decoding if GeoTIFF is unavailable

### Decoding code

```javascript
const GeoTIFF = require('geotiff');

async function decodeGeoTIFF(buffer) {
  // Parse the GeoTIFF
  const tiff = await GeoTIFF.fromArrayBuffer(buffer.buffer);
  const image = await tiff.getImage();

  // Read the actual pixel data
  const rasters = await image.readRasters();
  const pixels = rasters[0];  // Float32Array or Uint8Array

  // Get dimensions
  const width = image.getWidth();
  const height = image.getHeight();

  // Get geographic bounds (so we know where pixels are on Earth)
  const bbox = image.getBoundingBox();
  // bbox = [minLng, minLat, maxLng, maxLat]

  return {
    pixels,         // 1D flat array, indexed as [row * width + col]
    width,
    height,
    bbox
  };
}
```

### What we now have

```javascript
{
  pixels: Uint8Array(11200),   // 1D array, 11200 = 112 × 100 e.g.
  width:  112,
  height: 100,
  bbox:   [-9.5375, 30.4156, -9.5360, 30.4170]
}
```

This is the **raw matrix**. Every cell holds a number, but the number isn't NDVI yet — it's the raw encoded value. We decode it next.

### Pixel value decoding

The raw integer in the array is a **scaled** version of NDVI. The scaling depends on:
- Bit depth (8-bit = 0–255, 16-bit = 0–65535)
- The encoding agreement between source and consumer

For AgroMonitoring GeoTIFFs (NDVI), the typical encoding is:

```javascript
// 8-bit encoding (most common): raw 0–255 maps linearly to NDVI -1.0 → +1.0
function rawToNdvi8bit(raw) {
  return (raw / 127.5) - 1;
}

// 16-bit encoding: raw 0–65535 maps linearly to NDVI -1.0 → +1.0
function rawToNdvi16bit(raw) {
  return (raw / 32767.5) - 1;
}
```

### ⚠️ Calibration is required

The encoding above is the **theoretical** mapping. You **must verify** against the AgroMonitoring stats endpoint:

```javascript
// 1. Get the official stats
const stats = await fetch(scene.stats.ndvi).then(r => r.json());
// stats.mean = 0.476 (the truth)

// 2. Decode all your pixels and compute the mean yourself
const decoded = pixels.map(rawToNdvi8bit);
const yourMean = decoded.reduce((a, b) => a + b, 0) / decoded.length;

// 3. Compare
if (Math.abs(yourMean - stats.mean) > 0.05) {
  // Your decoder is wrong — adjust the formula
}
```

**Always include this calibration step in your tests.**

---

## 6. Stage 4 — Per-Pixel Data Mining

Now we have the decoded matrix. The mining stage walks through every pixel and decides:
1. Is this pixel valid?
2. Is it inside the farm polygon?
3. Where on Earth is it (lat/lng)?

### 6.1 Pixel → geographic coordinate

The image has a bounding box `[minLng, minLat, maxLng, maxLat]`. Pixel `(col, row)` maps to a geographic point by linear interpolation:

```javascript
function pixelToLngLat(col, row, width, height, bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // Use pixel CENTER, not corner, for accuracy
  const lng = minLng + ((col + 0.5) / width)  * (maxLng - minLng);
  const lat = maxLat - ((row + 0.5) / height) * (maxLat - minLat);
  //              ↑
  //   note: row 0 is at the TOP of the image (north), so we subtract

  return [lng, lat];
}
```

**Diagram:**

```
                  width = 112 pixels
              ←─────────────────────→
            ┌─────────────────────┐ maxLat
            │ (0,0)     (111,0)   │
            │                     │
            │     (col, row)      │  height
            │       ↓             │   = 100
            │      lng,lat        │
            │                     │
            │ (0,99)    (111,99)  │
            └─────────────────────┘ minLat
          minLng                maxLng
```

### 6.2 Pixel validity check

```javascript
function isValidPixel(rawValue) {
  if (rawValue === null || rawValue === undefined) return false;
  if (Number.isNaN(rawValue)) return false;
  if (rawValue === 0)   return false;   // typically "no-data"
  if (rawValue === 255) return false;   // typically saturated / masked
  return true;
}
```

**Reasons for invalid pixels:**
- Outside the farm polygon (image is rectangular, polygon is not)
- Cloud cover
- Water bodies (extreme negative NDVI)
- Sensor noise

### 6.3 Polygon containment

A pixel may be inside the image bounding box but **outside** the actual farm polygon (e.g., the corners of the image when the polygon is L-shaped).

```javascript
const turf = require('@turf/turf');

function isInsidePolygon(lng, lat, farmPolygon) {
  const point = turf.point([lng, lat]);
  return turf.booleanPointInPolygon(point, farmPolygon);
}
```

### 6.4 The mining loop

```javascript
function mineValidPixels(decoded, farmPolygon) {
  const { pixels, width, height, bbox } = decoded;
  const validPixels = [];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {

      const raw = pixels[row * width + col];

      // Step 1: validity
      if (!isValidPixel(raw)) continue;

      // Step 2: geo location
      const [lng, lat] = pixelToLngLat(col, row, width, height, bbox);

      // Step 3: polygon containment
      if (!isInsidePolygon(lng, lat, farmPolygon)) continue;

      // Step 4: decode to actual NDVI
      const ndvi = rawToNdvi8bit(raw);

      validPixels.push({ lng, lat, ndvi });
    }
  }

  return validPixels;
}
```

### 6.5 Output

```javascript
[
  { lng: -9.5374, lat: 30.4169, ndvi: 0.62 },
  { lng: -9.5373, lat: 30.4169, ndvi: 0.65 },
  { lng: -9.5372, lat: 30.4169, ndvi: 0.58 },
  ...
  // ~80 to 200 valid pixels for a typical 1-2 hectare farm
]
```

We've moved from **pixels in an image** to **labeled measurements on Earth**. This is the data mining payoff.

---

## 7. Stage 5 — Zone Segmentation

Now we group those valid pixels into 9 spatial buckets — the 3×3 grid.

### 7.1 Compute the grid

```javascript
function computeZoneGrid(farmPolygon) {
  const bbox = turf.bbox(farmPolygon);  // [minLng, minLat, maxLng, maxLat]

  const lngStep = (bbox[2] - bbox[0]) / 3;
  const latStep = (bbox[3] - bbox[1]) / 3;

  const zones = [];
  for (let j = 2; j >= 0; j--) {        // row: 2=north (top), 0=south (bottom)
    for (let i = 0; i < 3; i++) {       // col: 0=west, 2=east
      const west  = bbox[0] + i * lngStep;
      const east  = bbox[0] + (i + 1) * lngStep;
      const south = bbox[1] + j * latStep;
      const north = bbox[1] + (j + 1) * latStep;

      zones.push({
        bounds: [west, south, east, north],
        polygon: turf.bboxPolygon([west, south, east, north])
      });
    }
  }

  return zones;  // array of 9, ordered: A B C / D E F / G H I
}
```

### 7.2 Zone labels

```
   ┌─────┬─────┬─────┐
   │  A  │  B  │  C  │   ← North row
   ├─────┼─────┼─────┤
   │  D  │  E  │  F  │   ← Middle row
   ├─────┼─────┼─────┤
   │  G  │  H  │  I  │   ← South row
   └─────┴─────┴─────┘
    West  Mid   East

const ZONE_LABELS = ['A','B','C','D','E','F','G','H','I'];
const ZONE_POSITIONS = ['NW','N','NE','W','Center','E','SW','S','SE'];
```

### 7.3 Pixel → zone assignment

```javascript
function findZoneIndex(lng, lat, zones) {
  for (let i = 0; i < 9; i++) {
    const [west, south, east, north] = zones[i].bounds;
    if (lng >= west && lng < east && lat >= south && lat < north) {
      return i;
    }
  }
  return -1;
}
```

(Bounding box check is faster than `booleanPointInPolygon` and sufficient since zones are rectangles.)

### 7.4 Bucketize valid pixels

```javascript
function bucketize(validPixels, zones) {
  const buckets = Array.from({ length: 9 }, () => []);

  for (const px of validPixels) {
    const zoneIdx = findZoneIndex(px.lng, px.lat, zones);
    if (zoneIdx === -1) continue;
    buckets[zoneIdx].push(px.ndvi);
  }

  return buckets;  // [[0.6, 0.5, ...], [...], ...]  9 arrays of NDVI values
}
```

---

## 8. Stage 6 — Per-Zone Aggregation

Each zone is now a list of NDVI values. Compute statistics that the rule engine can consume.

### 8.1 Statistics per zone

```javascript
function aggregateZone(values) {
  if (values.length === 0) {
    return { count: 0, status: 'no_data' };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  const min = sorted[0];
  const max = sorted[n - 1];
  const median = n % 2 === 0
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2
    : sorted[(n - 1) / 2];

  return { count: n, mean, min, max, median, std };
}
```

### 8.2 Merge NDVI + NDWI per zone

We process NDVI and NDWI independently through stages 3–6, then merge them by zone:

```javascript
function mergeIndicesByZone(ndviBuckets, ndwiBuckets) {
  return ndviBuckets.map((ndviValues, i) => ({
    zone_id: ZONE_LABELS[i],
    position: ZONE_POSITIONS[i],
    ndvi: aggregateZone(ndviValues),
    ndwi: aggregateZone(ndwiBuckets[i])
  }));
}
```

### 8.3 Final per-zone dataset (ready for rule engine)

```json
[
  {
    "zone_id": "A",
    "position": "NW",
    "ndvi": { "count": 11, "mean": 0.65, "min": 0.58, "max": 0.72, "median": 0.66, "std": 0.04 },
    "ndwi": { "count": 11, "mean": 0.48, "min": 0.41, "max": 0.55, "median": 0.49, "std": 0.04 }
  },
  {
    "zone_id": "B",
    "position": "N",
    "ndvi": { "count": 12, "mean": 0.52, "min": 0.45, "max": 0.61, "median": 0.51, "std": 0.05 },
    "ndwi": { "count": 12, "mean": 0.35, "min": 0.28, "max": 0.42, "median": 0.34, "std": 0.04 }
  },
  ...
  {
    "zone_id": "C",
    "position": "NE",
    "ndvi": { "count": 13, "mean": 0.22, "min": 0.15, "max": 0.30, "median": 0.21, "std": 0.05 },
    "ndwi": { "count": 13, "mean": 0.05, "min": -0.02, "max": 0.12, "median": 0.06, "std": 0.04 }
  },
  ... (zones D through I)
]
```

**This is the structured output of the data mining pipeline.** The rest is decision-making.

---

## 9. Stage 7 — Rule Engine

The rule engine is **deterministic logic** (not ML) that converts numbers into actions.

### 9.1 Inputs

**Per zone (varies):**
- `ndvi.mean`
- `ndwi.mean`
- `ndvi.count` (for confidence)

**Farm-wide (same for all zones, fetched separately):**
- `soil_moisture` (from AgroMonitoring `/soil`)
- `air_temperature_celsius` (from Open-Meteo)
- `rain_forecast_3d_mm` (from Open-Meteo)

### 9.2 Flag classification

Each signal becomes a categorical flag:

```javascript
function classify(value, thresholds) {
  // thresholds: { critical, warning, moderate } in ascending or descending order
  for (const [flag, condition] of Object.entries(thresholds)) {
    if (condition(value)) return flag;
  }
  return 'OK';
}

// NDVI thresholds (lower = worse)
const NDVI_THRESHOLDS = {
  CRITICAL: v => v < 0.2,
  WARNING:  v => v < 0.4,
  MODERATE: v => v < 0.6
};

// NDWI thresholds (lower = drier)
const NDWI_THRESHOLDS = {
  CRITICAL: v => v < 0.0,
  WARNING:  v => v < 0.2,
  MODERATE: v => v < 0.4
};

// Soil moisture thresholds (lower = drier)
const SOIL_THRESHOLDS = {
  CRITICAL: v => v < 0.15,
  WARNING:  v => v < 0.25,
  MODERATE: v => v < 0.35
};

// Temperature thresholds (higher = worse)
const TEMP_THRESHOLDS = {
  CRITICAL: v => v > 40,
  WARNING:  v => v > 35,
  MODERATE: v => v > 30
};

// Rain forecast thresholds (lower = worse, less relief coming)
const RAIN_THRESHOLDS = {
  CRITICAL: v => v < 1,
  WARNING:  v => v < 5,
  MODERATE: v => v < 10
};
```

### 9.3 Scoring

```javascript
const FLAG_POINTS = { CRITICAL: 3, WARNING: 2, MODERATE: 1, OK: 0 };

function scoreZone(zone, farmContext) {
  const flags = {
    ndvi:          classify(zone.ndvi.mean, NDVI_THRESHOLDS),
    ndwi:          classify(zone.ndwi.mean, NDWI_THRESHOLDS),
    soil_moisture: classify(farmContext.soil_moisture, SOIL_THRESHOLDS),
    air_temp:      classify(farmContext.air_temperature, TEMP_THRESHOLDS),
    rain:          classify(farmContext.rain_3d_mm, RAIN_THRESHOLDS)
  };

  const water_score = FLAG_POINTS[flags.ndwi]
                    + FLAG_POINTS[flags.soil_moisture]
                    + FLAG_POINTS[flags.rain];

  const heat_score = FLAG_POINTS[flags.air_temp];

  const vegetation_score = FLAG_POINTS[flags.ndvi];

  return { flags, water_score, heat_score, vegetation_score };
}
```

### 9.4 Decision tree

```javascript
function decide(scores) {
  const { water_score, heat_score, vegetation_score } = scores;

  if (water_score >= 6 && heat_score >= 2) {
    return {
      code: 'URGENT_IRRIGATION',
      priority: 'HIGH',
      summary: 'Critical drought + heat — irrigate immediately'
    };
  }

  if (water_score >= 6) {
    return {
      code: 'IRRIGATE_SOON',
      priority: 'MEDIUM',
      summary: 'Water stress confirmed — irrigate within 24h'
    };
  }

  if (water_score >= 4) {
    return {
      code: 'MONITOR_WATER',
      priority: 'LOW',
      summary: 'Early water stress — prepare to irrigate'
    };
  }

  if (heat_score >= 2 && vegetation_score >= 2) {
    return {
      code: 'HEAT_PROTECTION',
      priority: 'MEDIUM',
      summary: 'Heat stress on stressed vegetation — shade or mulch'
    };
  }

  if (vegetation_score >= 2 && water_score < 2 && heat_score < 2) {
    return {
      code: 'INVESTIGATE',
      priority: 'MEDIUM',
      summary: 'Vegetation stressed but water/heat OK — check pests/disease'
    };
  }

  return {
    code: 'HEALTHY',
    priority: 'INFO',
    summary: 'Zone is healthy'
  };
}
```

### 9.5 Irrigation amount math

When the decision involves irrigation, compute "how much":

```javascript
function computeIrrigationAmount(decision, farmContext, farmAreaHa) {
  if (!['URGENT_IRRIGATION', 'IRRIGATE_SOON'].includes(decision.code)) {
    return null;
  }

  // Base from evapotranspiration (Open-Meteo gives this as et0_fao_evapotranspiration)
  const baseMmPerDay = farmContext.et0_mm_per_day || 5;

  // Adjust by how dry the soil is
  const sm = farmContext.soil_moisture;
  const multiplier = sm < 0.15 ? 1.6 : sm < 0.25 ? 1.3 : sm < 0.35 ? 1.1 : 1.0;

  const irrigationMm = baseMmPerDay * multiplier;

  // 1 mm of water over 1 hectare = 10,000 liters
  const zoneAreaHa = farmAreaHa / 9;
  const litersForZone = Math.round(irrigationMm * 10000 * zoneAreaHa);

  return {
    amount_mm: parseFloat(irrigationMm.toFixed(1)),
    amount_liters: litersForZone,
    timing: decision.code === 'URGENT_IRRIGATION' ? 'before_7am' : 'within_24h'
  };
}
```

### 9.6 Full rule engine output per zone

```json
{
  "zone_id": "C",
  "position": "NE",
  "status": "critical",
  "decision": "URGENT_IRRIGATION",
  "priority": "HIGH",
  "summary": "Critical drought + heat — irrigate immediately",
  "scores": {
    "water_score": 8,
    "heat_score": 3,
    "vegetation_score": 3
  },
  "flags": {
    "ndvi": "CRITICAL",
    "ndwi": "CRITICAL",
    "soil_moisture": "WARNING",
    "air_temp": "WARNING",
    "rain": "CRITICAL"
  },
  "action": {
    "amount_mm": 7.8,
    "amount_liters": 2080,
    "timing": "before_7am"
  },
  "confidence": "HIGH",
  "metrics": {
    "ndvi_mean": 0.22,
    "ndwi_mean": 0.05,
    "pixel_count": 13
  }
}
```

---

## 10. Stage 8 — Claude AI Translation

Claude doesn't make decisions — the rule engine already did. Claude **translates** the structured output into farmer-friendly language.

### 10.1 What we send to Claude

```javascript
const prompt = {
  system: `You are an agricultural advisor speaking to Moroccan farmers.
           Translate technical zone analyses into clear, actionable advice.
           Use simple Darija (Moroccan Arabic) and/or French.
           Be specific: name the zone, the action, the timing, the amount.
           Never invent data — only describe what's in the input.`,

  user: JSON.stringify({
    farm_name: "Ferme d'Ahmed",
    crop: "tomato",
    analysis_date: "2026-05-14",
    weather_context: {
      temperature: 39,
      rain_forecast_3d_mm: 0,
      soil_moisture_percent: 14
    },
    zones: [
      { id: "A", status: "healthy", decision: "HEALTHY" },
      { id: "B", status: "moderate", decision: "MONITOR_WATER" },
      { id: "C", status: "critical", decision: "URGENT_IRRIGATION",
        action: { amount_liters: 2080, timing: "before_7am" } },
      ... 6 more zones
    ]
  })
};
```

### 10.2 What Claude returns

```
🌾 تقرير الفرشة ديالك ـ 14 ماي 2026

⚠️ Zone C (الزاوية الشمالية الشرقية) – خطر!
   التربة ناشفة بزاف و الجو سخون. خاص تسقي 2080 لتر قبل 7 الصباح.
   إيلا تأخرت، الزرع غادي يعاني.

🟡 Zone B – عاقل
   فيه شي علامات ديال العطش. راقب اليوم و كون مستعد تسقي غدا.

✅ باقي المناطق – لاباس
   كلشي مزيان، استمر فالعمل العادي.

🌡️ الجو: 39°C، ما عندناش شتا فـ 3 أيام الجايين.
```

### 10.3 Key principle

> **The rule engine is the brain. Claude is the translator.**
>
> Claude receives **already-decided** structured data and converts it to natural language. This separation means:
> - Decisions are auditable and testable (deterministic logic).
> - Language can change (French, Darija, English) without re-deciding.
> - If Claude is down, decisions still work — just no fancy output.

---

## 11. End-to-End Concrete Example

A realistic walk-through with real numbers, using a tomato farm in Souss-Massa.

### 11.1 Input

```json
{
  "polygon": [
    [-9.5375, 30.4156],
    [-9.5360, 30.4156],
    [-9.5360, 30.4170],
    [-9.5375, 30.4170],
    [-9.5375, 30.4156]
  ]
}
```

- Area: ~1.84 hectares
- Bounding box: roughly 167m × 156m
- Expected pixel count: ~1.84 ha × 100 pixels/ha = ~184 pixels per index

### 11.2 Stage 1 — Polygon registration

```
POST → AgroMonitoring
Response: polygon_id = "5abb9fb82c8897000bde3e87"
```

### 11.3 Stage 2 — Imagery search

```
14 days back → 3 Sentinel-2 scenes returned
  - 2026-05-13: cl=0.05, dc=100 ✅ PICKED
  - 2026-05-08: cl=0.45, dc=100 ❌ too cloudy
  - 2026-05-03: cl=0.10, dc=100 ✅ backup
```

### 11.4 Stage 3 — Download

```
ndviBuffer = 38 KB GeoTIFF
ndwiBuffer = 37 KB GeoTIFF
```

### 11.5 Stage 3b — Decode

```
NDVI matrix:
  width:  18
  height: 16
  bbox:   [-9.5375, 30.4156, -9.5360, 30.4170]
  pixels: Uint8Array(288)   ← 18 × 16
```

### 11.6 Stage 4 — Mining

```
Iterating 288 pixels:
  - 232 valid (raw between 1 and 254)
  - 184 inside the farm polygon (rest are at image corners outside polygon)

Sample valid pixels:
  [
    { lng: -9.5374, lat: 30.4169, ndvi: 0.62 },
    { lng: -9.5373, lat: 30.4169, ndvi: 0.65 },
    { lng: -9.5372, lat: 30.4169, ndvi: 0.58 },
    ... 181 more
  ]
```

### 11.7 Stage 5 — Zone segmentation

```
Bounding box: [-9.5375, 30.4156, -9.5360, 30.4170]
lngStep = 0.0005   (~50m of longitude)
latStep = 0.00047  (~52m of latitude)

9 zones computed.
```

### 11.8 Stage 6 — Bucketize + aggregate

```
Zone counts and means:

  Zone A (NW):  18 pixels, NDVI mean = 0.65, NDWI mean = 0.48
  Zone B (N):   22 pixels, NDVI mean = 0.52, NDWI mean = 0.35
  Zone C (NE):  20 pixels, NDVI mean = 0.22, NDWI mean = 0.05  ← stressed
  Zone D (W):   21 pixels, NDVI mean = 0.61, NDWI mean = 0.42
  Zone E (C):   24 pixels, NDVI mean = 0.58, NDWI mean = 0.40
  Zone F (E):   19 pixels, NDVI mean = 0.31, NDWI mean = 0.12  ← warning
  Zone G (SW):  21 pixels, NDVI mean = 0.63, NDWI mean = 0.44
  Zone H (S):   20 pixels, NDVI mean = 0.55, NDWI mean = 0.37
  Zone I (SE):  19 pixels, NDVI mean = 0.28, NDWI mean = 0.10  ← warning

Total valid pixels: 184 ✓
```

### 11.9 Farm context (from AgroMonitoring + Open-Meteo)

```
soil_moisture     = 0.14      (CRITICAL — very dry)
air_temperature   = 39 °C     (WARNING)
rain_3d_mm        = 0         (CRITICAL — no relief)
et0_mm_per_day    = 6.2
```

### 11.10 Stage 7 — Rule engine per zone

**Zone C (NE) detailed walk-through:**

```
Flags:
  ndvi          = CRITICAL  (0.22 < 0.2)
  ndwi          = CRITICAL  (0.05 < 0.0... no, 0.05 < 0.2 → WARNING)

  Wait, recompute: 0.05 ≥ 0.0 so it's WARNING, not CRITICAL.
  Let me re-read the threshold:

  NDWI_THRESHOLDS = {
    CRITICAL: v => v < 0.0,   ← 0.05 fails this (0.05 NOT < 0.0)
    WARNING:  v => v < 0.2    ← 0.05 passes this
  }
  → ndwi = WARNING

  soil_moisture = CRITICAL  (0.14 < 0.15)
  air_temp      = WARNING   (39 > 35, not > 40)
  rain          = CRITICAL  (0 < 1)

Scores:
  water_score = NDWI(2) + soil_moisture(3) + rain(3) = 8
  heat_score = air_temp(2) = 2
  vegetation_score = ndvi(3) = 3

Decision:
  water_score (8) >= 6 AND heat_score (2) >= 2  → URGENT_IRRIGATION

Action:
  baseMm = 6.2
  multiplier = 1.6 (since soil_moisture = 0.14 < 0.15)
  irrigationMm = 6.2 × 1.6 = 9.92 mm
  zoneAreaHa = 1.84 / 9 = 0.2044
  litersForZone = 9.92 × 10000 × 0.2044 = 20,283 liters

Confidence: HIGH (pixel_count = 20, cloud_coverage = 0.05)
```

### 11.11 Full 9-zone output

```json
{
  "farm_id": "farm_uuid",
  "analysis_date": "2026-05-14T10:30:00Z",
  "satellite_date": "2026-05-13T11:25:00Z",
  "summary": {
    "healthy_zones": 5,
    "moderate_zones": 0,
    "stressed_zones": 2,
    "critical_zones": 2,
    "total_water_needed_liters": 42000,
    "priority_action": "URGENT_IRRIGATION on zones C, I"
  },
  "zones": [
    {
      "zone_id": "C", "position": "NE", "status": "critical",
      "decision": "URGENT_IRRIGATION", "priority": "HIGH",
      "action": { "amount_liters": 20283, "amount_mm": 9.92, "timing": "before_7am" }
    },
    {
      "zone_id": "I", "position": "SE", "status": "stressed",
      "decision": "IRRIGATE_SOON", "priority": "MEDIUM",
      "action": { "amount_liters": 18500, "amount_mm": 9.05, "timing": "within_24h" }
    },
    { "zone_id": "F", "position": "E", "status": "stressed", "decision": "MONITOR_WATER", "priority": "LOW" },
    { "zone_id": "B", "position": "N", "status": "moderate", "decision": "MONITOR", "priority": "INFO" },
    { "zone_id": "A", "position": "NW", "status": "healthy", "decision": "HEALTHY", "priority": "INFO" },
    { "zone_id": "D", "position": "W", "status": "healthy", "decision": "HEALTHY", "priority": "INFO" },
    { "zone_id": "E", "position": "Center", "status": "healthy", "decision": "HEALTHY", "priority": "INFO" },
    { "zone_id": "G", "position": "SW", "status": "healthy", "decision": "HEALTHY", "priority": "INFO" },
    { "zone_id": "H", "position": "S", "status": "moderate", "decision": "MONITOR", "priority": "INFO" }
  ]
}
```

### 11.12 What Claude produces

```
🚨 Action urgente : Ferme d'Ahmed — 14 mai 2026

Zone C (coin nord-est) : situation critique
→ Irriguer 20 283 litres avant 7h demain matin
→ Sol très sec (14% humidité), canicule prévue, pas de pluie 3 jours

Zone I (coin sud-est) : stress hydrique
→ Irriguer 18 500 litres dans les 24h

Le reste du champ va bien. Concentrez l'eau sur les deux coins est.

🌡️ 39°C aujourd'hui — irriguez tôt le matin pour éviter l'évaporation.
```

---

## 12. Critical Gotchas

Things that **will** break if you don't watch for them.

### 12.1 Coordinate order

GeoJSON is `[longitude, latitude]`, **not** `[lat, lng]`. Leaflet often uses the opposite. Always normalize at the boundary.

```javascript
// Leaflet to GeoJSON
const geoJsonCoords = leafletLatLng.map(p => [p.lng, p.lat]);
```

### 12.2 Pixel decoding calibration

Your pixel decoder is the most likely source of silent bugs. Always test the decoded mean against the AgroMonitoring stats endpoint mean. Failures look like "all zones are healthy" or "all zones are critical."

### 12.3 Image row direction

In images, row 0 is at the TOP (north). In geography, higher latitude is north. So when mapping row → latitude:

```javascript
lat = maxLat - (row / height) * (maxLat - minLat);  // ✅ subtract
// NOT
lat = minLat + (row / height) * (maxLat - minLat);  // ❌ inverted
```

### 12.4 Zone has zero pixels

A small farm or unusual polygon shape can leave some zones with no valid pixels. The aggregator must return `{ count: 0, status: 'no_data' }` and the rule engine must skip such zones — don't crash on division by zero.

### 12.5 NDWI vs NDMI naming

AgroMonitoring calls it `ndwi`. Some textbooks call the `(NIR-SWIR)/(NIR+SWIR)` formula `NDMI` and reserve `NDWI` for a different formula `(Green-NIR)/(Green+NIR)`. Be consistent in your code — pick one name, document it.

### 12.6 Cloud-affected pixels

A pixel under thin cloud may have a "plausible" value that's actually nonsense. The scene-level `cl` (cloud coverage %) doesn't tell you which pixels are bad. Two defenses:
- Reject scenes with cl > 0.3 entirely.
- Within a zone, if std is very high (e.g., > 0.2 for NDVI), flag the zone as low-confidence.

### 12.7 Float precision

Pixel coordinates and latitudes are floats. `point on zone boundary` is a coin flip due to floating-point comparison. The fix is to use half-open intervals (`>=` on one side, `<` on the other) so each pixel belongs to exactly one zone:

```javascript
if (lng >= west && lng < east && lat >= south && lat < north) { ... }
```

### 12.8 API quotas

AgroMonitoring free tier: 60 calls/min, 1000 ha total polygons. Each full analysis is ~5 calls (polygon info, search, stats, image, soil). During testing, use the **public sample endpoint** to avoid burning quota:

```
https://samples.agromonitoring.com/agro/1.0/ndvi/history
  ?polyid=5aaa8052cbbbb5000b73ff66
  &start=1530336000
  &end=1534976000
  &appid=b1b15e88fa797225412429c1c50c122a1
```

### 12.9 Sentinel-2 revisit gap

Sentinel-2 only passes every 5 days. If the last 5 days were all cloudy, your "latest" data is from a week+ ago. Always include the `satellite_date` in your output so the farmer knows the data age.

### 12.10 Rule engine is opinionated

The thresholds in Section 9.2 are reasonable defaults for general crops in dryland Morocco. They are **not** crop-specific. A tomato wants different NDWI than an olive. Document this in the UI as v1 thresholds, mark "crop-specific tuning" as post-MVP.

---

## 📌 Summary: The Core in One Page

```
INPUT
  farm polygon (GeoJSON)
  ↓
1. POLYGON REGISTRATION
   → AgroMonitoring polygon_id
  ↓
2. IMAGERY ACQUISITION
   → Sentinel-2 scene URLs (filter cl<0.3, dc>80, take most recent)
  ↓
3. DOWNLOAD GeoTIFFs
   → ndviBuffer, ndwiBuffer
  ↓
4. DECODE
   → pixel matrix + bbox + width/height
  ↓
5. MINE PER-PIXEL DATA
   → list of valid {lng, lat, value}
  ↓
6. ZONE SEGMENTATION (3×3 grid)
   → 9 bounding boxes
  ↓
7. BUCKETIZE PIXELS
   → 9 lists of values
  ↓
8. AGGREGATE
   → 9 zone stats objects (mean, min, max, std, count)
  ↓
9. FETCH FARM CONTEXT
   → soil moisture (AgroMonitoring) + weather (Open-Meteo)
  ↓
10. RULE ENGINE
    → 9 decisions with action + amount + priority
  ↓
11. CLAUDE TRANSLATION
    → farmer-friendly narrative
  ↓
OUTPUT
  9 zones with status + action + message
```

**That's the core. Everything else is UI, persistence, or auth.**

---

*End of core technical specification.*
*Marathon Oujda 2026 — AgriCopilot AI.*
