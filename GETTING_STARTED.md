# AgriCopilot Core — Getting Started

Satellite-based farm health analysis pipeline. Processes Sentinel-2 imagery
into per-zone irrigation decisions with farmer-friendly narrative output.

---

## Requirements

- Node.js 20+
- npm 9+

---

## Installation

```bash
git clone <repo-url>
cd agricopilot-core
npm install
```

---

## Configuration

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

`.env` keys:

| Key | Required | Description |
|-----|----------|-------------|
| `AGROMONITORING_API_KEY` | For live mode | See below for which AgroMonitoring APIs are used |
| `DEEPSEEK_API_KEY` | For narrative | From [platform.deepseek.com](https://platform.deepseek.com) |
| `DEEPSEEK_BASE_URL` | No | Default: `https://api.deepseek.com/v1` |
| `DEEPSEEK_MODEL` | No | Default: `deepseek-chat` |
| `OPEN_METEO_BASE` | No | Default: `https://api.open-meteo.com/v1` |
| `USE_AGRO_SAMPLE` | No | `true` = sample mode, no AgroMonitoring key needed (default: `true`) |

### Which AgroMonitoring APIs does this project use?

This project uses **three** of the AgroMonitoring API products. A single
`AGROMONITORING_API_KEY` covers all three — they all use the same key via
the `appid` query parameter.

| API product | Used for | Endpoint called |
|-------------|----------|-----------------|
| **Polygon API** | Registering the farm boundary once so AgroMonitoring can process imagery for it | `POST /agro/1.0/polygons` |
| **Satellite Imagery API** | Searching for available Sentinel-2 passes and downloading the NDVI/NDWI GeoTIFFs | `GET /agro/1.0/image/search` and the `data.ndvi` / `data.ndwi` GeoTIFF URLs returned in search results |
| **Soil Data API** | Fetching current surface soil moisture for the farm (used as one of the irrigation rule inputs) | `GET /agro/1.0/soil` |

The following AgroMonitoring products are **not** used:

- NDVI history — the pipeline downloads raw GeoTIFFs and computes its own statistics per zone; the pre-computed history endpoint is not needed.
- Weather data — replaced by Open-Meteo (free, no key required).
- Accumulated parameters — not used.
- UV index — not used.

To get your key, sign up at [agromonitoring.com](https://agromonitoring.com),
create a subscription (free tier: 60 calls/min, up to 1000 ha total polygon area),
and copy the API key from your dashboard.

---

## Run the tests

```bash
npm test
```

Expected output: **144 tests passing, 1 skipped** (the skipped test is a live
DeepSeek integration test — un-skip it manually to eyeball narrative quality).

---

## Run the demo

### Sample mode (no API keys needed)

Uses a local fixture GeoTIFF and hardcoded farm context from spec §11. Runs
the full pixel-mining, zone-segmentation, and rule-engine pipeline locally.
Narrative translation is skipped unless `DEEPSEEK_API_KEY` is set.

```bash
npm run demo
# or explicitly:
USE_AGRO_SAMPLE=true npm run demo
```

### Sample mode with narrative

Set `DEEPSEEK_API_KEY` in `.env`, then:

```bash
npm run demo
```

The output will include a Darija/French narrative from DeepSeek at the bottom.

### Live mode (real APIs)

Requires both `AGROMONITORING_API_KEY` and `DEEPSEEK_API_KEY` in `.env`, and
a pre-registered polygon ID in the script.

```bash
USE_AGRO_SAMPLE=false npm run demo
```

---

## Pipeline overview

The core runs 8 stages in sequence:

```
GeoJSON polygon
  ↓
1. Search Sentinel-2 scenes (AgroMonitoring)
2. Download NDVI + NDWI GeoTIFFs
3. Decode GeoTIFFs → pixel matrices
4. Mine valid pixels (validity + polygon containment)
5. Segment into 3×3 zone grid
6. Aggregate per-zone statistics (mean, min, max, std)
7. Run rule engine → 9 zone decisions + irrigation amounts
8. Translate to Darija/French narrative (DeepSeek)
  ↓
JSON result: summary + 9 zones + narrative
```

---

## Project structure

```
agricopilot-core/
├── src/
│   ├── config.js              — env loading
│   ├── stage1_polygon.js      — polygon validation + AgroMonitoring registration
│   ├── stage2_imagery.js      — scene search + GeoTIFF download
│   ├── stage3_decode.js       — GeoTIFF → pixel matrix
│   ├── stage4_mine.js         — per-pixel mining + geo-location
│   ├── stage5_zones.js        — 3×3 grid segmentation + bucketizing
│   ├── stage6_aggregate.js    — per-zone statistics
│   ├── stage7_rules.js        — rule engine (thresholds → decisions)
│   ├── stage8_translate.js    — DeepSeek narrative translation
│   ├── farm_context.js        — soil moisture + weather fetching
│   └── pipeline.js            — orchestrator
├── tests/                     — Vitest test suite (one file per stage)
├── scripts/
│   ├── run_demo.js            — end-to-end demo
│   └── create_fixtures.js     — regenerate test GeoTIFF fixture
├── CORE_PIPELINE_SPEC.md      — full technical specification
├── BUILD_PLAN.md              — build order + module contracts
└── .env.example               — env template
```

---

## Regenerate test fixtures

If the fixture GeoTIFF is missing or corrupted:

```bash
node scripts/create_fixtures.js
```

This creates `tests/fixtures/ndvi_sample.tif` (4×4 pixels, Souss-Massa bbox).

---

## Optional: NDVI calibration check

Set `DEV_CALIBRATE=true` to compare your decoded NDVI mean against
AgroMonitoring's official stats endpoint during a live pipeline run.
A console warning is printed if the difference exceeds 0.05.

```bash
DEV_CALIBRATE=true USE_AGRO_SAMPLE=false npm run demo
```

---

## Troubleshooting

**`Missing required environment variable: AGROMONITORING_API_KEY`**
→ You're running in live mode. Either set the key in `.env` or run with
`USE_AGRO_SAMPLE=true`.

**`Missing required environment variable: DEEPSEEK_API_KEY`**
→ Translation is optional in sample mode. The demo prints a placeholder
and continues. Set the key in `.env` to enable it.

**`Fixture not found: tests/fixtures/ndvi_sample.tif`**
→ Run `node scripts/create_fixtures.js` to create it.

**`No satellite scenes available for this polygon in the last 30 days`**
→ The polygon has no Sentinel-2 coverage. Check that `agro_polygon_id`
belongs to an active AgroMonitoring polygon and that the area is not
permanently cloud-covered.
