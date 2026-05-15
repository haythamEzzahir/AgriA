# 🛠️ AgriCopilot Core — Build Plan for Claude Code

> Keep this file in the project root next to `CORE_PIPELINE_SPEC.md`.
> Claude Code will read it before every stage to stay consistent.

---

## 0. Ground rules (read first, every session)

1. **The spec is law.** All implementation must match `CORE_PIPELINE_SPEC.md` exactly: function names, thresholds, formulas, output shapes, gotchas.
2. **One stage at a time.** Never skip ahead. Never combine stages. Each stage has its own prompt, its own files, its own tests.
3. **No invented data.** If a value is not in the spec, ask before assuming.
4. **Test before moving on.** Every stage ends with a working test. Red → green → next stage.
5. **Stop and confirm** before installing new dependencies or changing the folder structure below.

---

## 1. Tech stack (fixed)

- **Runtime:** Node.js 20+
- **Language:** JavaScript (CommonJS, `require`)
- **Package manager:** npm
- **Test runner:** Vitest (lightweight, no config drama)
- **Key libs (only these unless approved):**
  - `axios` — HTTP
  - `geotiff` — GeoTIFF decoding
  - `sharp` — PNG fallback
  - `@turf/turf` — geo math
  - `openai` — DeepSeek translation (OpenAI-compatible SDK)
  - `dotenv` — env vars

No frameworks. No database. No server yet. Pure pipeline modules.

---

## 2. Folder structure (fixed)

```
agricopilot-core/
├── .env.example
├── .gitignore
├── package.json
├── BUILD_PLAN.md              ← this file
├── CORE_PIPELINE_SPEC.md      ← the source of truth
├── src/
│   ├── config.js              ← env loading, constants
│   ├── stage1_polygon.js      ← Stage 1: register polygon
│   ├── stage2_imagery.js      ← Stage 2: search + download scenes
│   ├── stage3_decode.js       ← Stage 3: GeoTIFF → matrix
│   ├── stage4_mine.js         ← Stage 4: per-pixel mining
│   ├── stage5_zones.js        ← Stage 5: 3×3 grid + bucketize
│   ├── stage6_aggregate.js    ← Stage 6: per-zone stats
│   ├── stage7_rules.js        ← Stage 7: rule engine
│   ├── stage8_translate.js    ← Stage 8: Claude translation
│   ├── farm_context.js        ← soil moisture + Open-Meteo weather
│   └── pipeline.js            ← orchestrator: runs stages 1→8 in order
├── tests/
│   ├── stage1.test.js
│   ├── stage2.test.js
│   ├── stage3.test.js
│   ├── stage4.test.js
│   ├── stage5.test.js
│   ├── stage6.test.js
│   ├── stage7.test.js
│   ├── stage8.test.js
│   └── fixtures/              ← sample GeoTIFFs, polygons, scene responses
└── scripts/
    └── run_demo.js            ← end-to-end demo with the Souss-Massa example
```

**Rule:** each `stageN_*.js` file exports pure functions. No side effects at module load. No global state. The orchestrator wires them together.

---

## 3. Module contracts (what each stage takes and returns)

These contracts are the glue. Do not change them between stages.

### Stage 1 — `stage1_polygon.js`
```js
async function registerPolygon({ name, geoJson, apiKey }) → {
  agro_polygon_id, area_hectares, center, polygon_geojson
}
function validatePolygon(geoJson) → { ok: boolean, errors: string[] }
```

### Stage 2 — `stage2_imagery.js`
```js
async function searchScenes({ polygonId, daysBack, apiKey }) → Scene[]
function pickBestScene(scenes) → Scene | null
async function downloadIndex(scene, index) → Buffer   // index: 'ndvi' | 'ndwi'
```

### Stage 3 — `stage3_decode.js`
```js
async function decodeGeoTIFF(buffer) → { pixels, width, height, bbox }
function rawToNdvi8bit(raw) → number
function rawToNdvi16bit(raw) → number
async function calibrate(decoded, statsUrl) → { ok, yourMean, theirMean, diff }
```

### Stage 4 — `stage4_mine.js`
```js
function pixelToLngLat(col, row, width, height, bbox) → [lng, lat]
function isValidPixel(raw) → boolean
function isInsidePolygon(lng, lat, polygon) → boolean
function mineValidPixels(decoded, polygon, decoder) → [{lng, lat, value}, ...]
```

### Stage 5 — `stage5_zones.js`
```js
function computeZoneGrid(polygon) → Zone[9]
function findZoneIndex(lng, lat, zones) → number   // -1 if outside
function bucketize(validPixels, zones) → number[9][]   // 9 arrays of values
```

### Stage 6 — `stage6_aggregate.js`
```js
function aggregateZone(values) → { count, mean, min, max, median, std } | { count: 0, status: 'no_data' }
function mergeIndicesByZone(ndviBuckets, ndwiBuckets) → ZoneStats[9]
```

### Stage 7 — `stage7_rules.js`
```js
function classify(value, thresholds) → 'CRITICAL'|'WARNING'|'MODERATE'|'OK'
function scoreZone(zoneStats, farmContext) → { flags, water_score, heat_score, vegetation_score }
function decide(scores) → { code, priority, summary }
function computeIrrigationAmount(decision, farmContext, farmAreaHa) → { amount_mm, amount_liters, timing } | null
function runRuleEngine(zoneStatsArray, farmContext, farmAreaHa) → ZoneDecision[9]
```

### Farm context — `farm_context.js`
```js
async function fetchSoilMoisture(polygonId, apiKey) → number   // 0..1
async function fetchWeather(lat, lng) → { air_temperature, rain_3d_mm, et0_mm_per_day }
async function getFarmContext(polygonId, center, apiKey) → { soil_moisture, air_temperature, rain_3d_mm, et0_mm_per_day }
```

### Stage 8 — `stage8_translate.js`
```js
async function translate({ farm, zones, weather, language }) → string
```

### Orchestrator — `pipeline.js`
```js
async function runPipeline({ farm, language }) → {
  farm_id, analysis_date, satellite_date, summary, zones, narrative
}
```

---

## 4. Environment

`.env` keys (Claude Code creates `.env.example`, never commits `.env`):

```
AGROMONITORING_API_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
OPEN_METEO_BASE=https://api.open-meteo.com/v1
USE_AGRO_SAMPLE=true   # use sample endpoint during dev to save quota
```

---

## 5. Build order (DO NOT REORDER)

| Step | Stage | What gets built | What gets tested |
|---|---|---|---|
| 0 | — | Repo, package.json, .env.example, vitest config | `npm test` runs (zero tests) |
| 1 | Stage 1 | `stage1_polygon.js` + validation | Validation rules; mock register |
| 2 | Stage 2 | `stage2_imagery.js` | Scene filter logic with fixture JSON |
| 3 | Stage 3 | `stage3_decode.js` + calibration | Decode a sample GeoTIFF, compare to known mean |
| 4 | Stage 4 | `stage4_mine.js` | Pixel→latlng, polygon containment, full mining loop |
| 5 | Stage 5 | `stage5_zones.js` | 3×3 grid math, half-open intervals (gotcha 12.7) |
| 6 | Stage 6 | `stage6_aggregate.js` | mean/min/max/std, empty-zone handling (gotcha 12.4) |
| 7 | Farm context | `farm_context.js` | Mock soil + weather responses |
| 8 | Stage 7 | `stage7_rules.js` | Thresholds, scoring, decision tree, irrigation math |
| 9 | Stage 8 | `stage8_translate.js` | Claude SDK call, language switch (FR / Darija) |
| 10 | Pipeline | `pipeline.js` + `scripts/run_demo.js` | End-to-end Souss-Massa example matches spec §11 |

After each step: **stop, run tests, show output, wait for confirmation before continuing.**

---

## 6. Gotchas (lift directly from spec §12)

Claude Code must explicitly handle these in code and tests:

- **12.1** Coordinate order — assertion in `validatePolygon`
- **12.2** Pixel decoder calibration — `calibrate()` runs on every decode in dev mode
- **12.3** Row direction — `pixelToLngLat` uses `maxLat - …` (subtract)
- **12.4** Empty zones — `aggregateZone` returns `{ count: 0, status: 'no_data' }`
- **12.5** NDWI naming — comment at top of `stage7_rules.js` documenting we use AgroMonitoring's NDWI
- **12.7** Float precision — half-open intervals in `findZoneIndex`
- **12.8** API quota — `USE_AGRO_SAMPLE` env flag swaps to sample endpoint
- **12.9** Revisit gap — `satellite_date` carried through to final output

---

## 7. Definition of done (per stage)

A stage is "done" only when ALL of:
- [ ] Source file exists at the path in §2
- [ ] All functions in the contract (§3) are exported
- [ ] Vitest tests exist and pass
- [ ] Code references the spec line numbers it implements (comments)
- [ ] No `console.log` left in source (only in `scripts/`)
- [ ] No TODOs left unaddressed

---

*End of build plan. The spec answers "what", this plan answers "how & in what order".*
