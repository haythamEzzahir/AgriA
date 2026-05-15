# 🎯 Claude Code Prompts — AgriCopilot Core (paste in order)

**How to use:**
1. Put `CORE_PIPELINE_SPEC.md` and `BUILD_PLAN.md` in the same folder.
2. Open Claude Code in that folder: `cd agricopilot-core && claude`
3. Paste **Prompt 0** first. Wait for it to finish and confirm tests pass.
4. Paste **Prompt 1**. Wait. Confirm. Continue.
5. **Never paste two prompts at once.** Each prompt assumes the previous one is done and tested.

---

## 🟢 Prompt 0 — Project bootstrap

```
Read CORE_PIPELINE_SPEC.md and BUILD_PLAN.md from the project root. Then:

1. Confirm you understand: this project builds the AgriCopilot CORE pipeline,
   8 stages, exactly as described in the spec. The build plan defines the
   folder structure, module contracts, and build order. You will follow them
   without deviation.

2. Bootstrap the project:
   - Initialize package.json (type: commonjs, Node 20+)
   - Install dev dep: vitest
   - Install runtime deps: axios geotiff sharp @turf/turf openai dotenv
   - Create the empty folder structure from BUILD_PLAN.md §2
     (src/, tests/, tests/fixtures/, scripts/)
   - Create .gitignore (node_modules, .env, coverage)
   - Create .env.example with the 4 keys from BUILD_PLAN.md §4
   - Add an npm "test" script that runs vitest
   - Create src/config.js that loads dotenv and exports the env vars
     (throw a clear error if a required key is missing, but only when
      it's actually used — config.js itself should just load and export)

3. Verify: run `npm test` and show me it runs (it will say "no tests found",
   that's fine).

4. Stop. Do not start Stage 1 yet. Show me the file tree when done.
```

---

## 🟢 Prompt 1 — Stage 1: Polygon registration

```
Implement Stage 1 per CORE_PIPELINE_SPEC.md §3 and the contract in BUILD_PLAN.md §3.

Create src/stage1_polygon.js with:
- validatePolygon(geoJson) — enforces all 5 constraints from spec §3 table:
    min area 1 ha, max 3000 ha, closed polygon, ≥4 points, no self-intersection.
    Use @turf/turf for area and self-intersection checks.
    Returns { ok, errors: [] }.
- registerPolygon({ name, geoJson, apiKey }) — POSTs to AgroMonitoring,
    returns the persisted shape from spec §3 ("What to persist").
    Validates first; throws if invalid.

Hard rules:
- GeoJSON coordinate order is [lng, lat] (gotcha 12.1). Add an assertion
  that flags suspicious order (e.g., values that look like lat in lng slot).
- Use axios. Read AGROMONITORING_API_KEY from src/config.js.
- Comment each function with the spec section it implements.

Create tests/stage1.test.js covering:
- Valid 1.84 ha polygon (the Souss-Massa example from §11.1) passes validation.
- Polygon under 1 ha fails with clear error.
- Polygon over 3000 ha fails.
- Unclosed polygon fails.
- Polygon with swapped lat/lng order fails validation.
- registerPolygon: mock axios, verify it posts the correct body and parses
  the response into the persisted shape.

Run `npm test` and show me all tests pass. Then stop.
```

---

## 🟢 Prompt 2 — Stage 2: Imagery acquisition

```
Implement Stage 2 per spec §4 and the contract in BUILD_PLAN.md §3.

Create src/stage2_imagery.js with:
- searchScenes({ polygonId, daysBack = 14, apiKey }) — GET /image/search
    with unix timestamps. Returns the raw scene array.
- pickBestScene(scenes) — exactly the function from spec §4 step 2.2:
    filter type==='s2', cl < 0.3, dc > 80, sort by dt desc, return [0].
    If empty, return null.
- pickBestSceneWithFallback(scenes, scenesExtended) — if first pass is null,
    take most recent from extended search and mark { stale: true }.
- downloadIndex(scene, index) — GET scene.data[index] as arraybuffer,
    return a Node Buffer. Throws if scene.data[index] is missing.

Hard rules:
- Always use the `data.*` (GeoTIFF) URL, not `image.*` (PNG) — spec §4 step 2.3.
- Honor USE_AGRO_SAMPLE env flag — if true, swap the search endpoint to
  the sample endpoint from gotcha 12.8 (still use sample appid + polyid).

Create tests/stage2.test.js:
- Save a fixture JSON in tests/fixtures/scenes_sample.json with 3 scenes
  matching the §11.3 example (cl=0.05, cl=0.45, cl=0.10).
- pickBestScene picks the 2026-05-13 one.
- pickBestScene returns null when all scenes have cl > 0.3.
- searchScenes builds the correct URL (mock axios).
- downloadIndex throws clearly when the URL is missing.

Run tests, show pass. Stop.
```

---

## 🟢 Prompt 3 — Stage 3: GeoTIFF decoding + calibration

```
Implement Stage 3 per spec §5 and the contract in BUILD_PLAN.md §3.

Create src/stage3_decode.js with:
- decodeGeoTIFF(buffer) — exactly the function from spec §5 "Decoding code".
    Returns { pixels, width, height, bbox }.
- rawToNdvi8bit(raw) and rawToNdvi16bit(raw) — exactly spec §5 formulas.
- detectBitDepth(pixels) — inspect array type / max value, return 8 or 16.
- calibrate(decoded, statsUrl) — fetch official stats, compute your mean
  ignoring invalid pixels (0 and 255 for 8-bit), return:
    { ok: |your-theirs| < 0.05, yourMean, theirMean, diff }.

Hard rules:
- Implement gotcha 12.2: calibration must be callable from tests with a
  fixture so we can catch decoder drift.
- Implement gotcha 12.3 conceptually here (decoder returns matrix as-is;
  row=0 is north — the lat math lives in Stage 4, but document this in
  decodeGeoTIFF's JSDoc).

Create tests/stage3.test.js:
- rawToNdvi8bit(0) === -1, rawToNdvi8bit(255) ≈ 1, rawToNdvi8bit(127.5) === 0.
- detectBitDepth on a Uint8Array returns 8; on a Uint16Array returns 16.
- decodeGeoTIFF on a real sample GeoTIFF (tests/fixtures/ndvi_sample.tif).
    Note: if no fixture exists, generate one with a tiny script that
    encodes a known 4×4 NDVI matrix, save it once, then test against it.
- calibrate: mock the stats endpoint, verify ok=true when means match,
  ok=false when they diverge by > 0.05.

Run tests, show pass. Stop.
```

---

## 🟢 Prompt 4 — Stage 4: Per-pixel mining

```
Implement Stage 4 per spec §6 and the contract in BUILD_PLAN.md §3.

Create src/stage4_mine.js with:
- pixelToLngLat(col, row, width, height, bbox) — exactly spec §6.1.
    MUST use maxLat - (...) for latitude (gotcha 12.3). Use pixel center
    (col + 0.5, row + 0.5).
- isValidPixel(raw) — exactly spec §6.2.
- isInsidePolygon(lng, lat, farmPolygon) — turf.booleanPointInPolygon.
- mineValidPixels(decoded, farmPolygon, decoder) — exactly spec §6.4 loop.
    `decoder` is the function from Stage 3 (rawToNdvi8bit or 16bit).
    Returns [{ lng, lat, value }, ...].

Hard rules:
- decoder is injected, not hardcoded — so the same mine function works for
  NDVI and NDWI.
- Returned objects use the key `value`, not `ndvi`, so the function is
  index-agnostic. (Spec §6.5 shows `ndvi` because the example is NDVI;
  our contract generalizes it.)

Create tests/stage4.test.js:
- pixelToLngLat at (0,0) returns near (minLng, maxLat). At (width-1, height-1)
  returns near (maxLng, minLat). Verifies north-is-top.
- isValidPixel: 0 → false, 255 → false, 128 → true, null/NaN → false.
- mineValidPixels: build a 4×4 decoded fixture with known values and a
  small polygon that excludes the corners; assert the right number of
  pixels survive and the lng/lat of each is correct.

Run tests, show pass. Stop.
```

---

## 🟢 Prompt 5 — Stage 5: Zone segmentation

```
Implement Stage 5 per spec §7 and the contract in BUILD_PLAN.md §3.

Create src/stage5_zones.js with:
- ZONE_LABELS = ['A','B','C','D','E','F','G','H','I']
- ZONE_POSITIONS = ['NW','N','NE','W','Center','E','SW','S','SE']
- computeZoneGrid(farmPolygon) — exactly spec §7.1. Note the loop order:
    j from 2 down to 0 (so the first zone is the NW one, matching labels).
    Returns 9 zones with { bounds: [w,s,e,n], polygon, zone_id, position }.
- findZoneIndex(lng, lat, zones) — exactly spec §7.3 with half-open
    intervals: lng >= west && lng < east && lat >= south && lat < north
    (gotcha 12.7).
- bucketize(validPixels, zones) — exactly spec §7.4.

Hard rules:
- Half-open intervals are non-negotiable. Add a test that puts a point
  exactly on a boundary and asserts it lands in exactly one zone.
- Each zone is tagged with its zone_id (A..I) and position (NW..SE) so
  downstream stages don't have to recompute the mapping.

Create tests/stage5.test.js:
- computeZoneGrid on the §11.1 polygon produces 9 zones whose unioned
  bbox equals the polygon's bbox.
- A point at the exact center of the polygon lands in zone E.
- A point on the boundary between A and B lands in exactly one zone
  (not both, not neither).
- bucketize with synthetic pixels at known positions puts the right
  count in each zone.

Run tests, show pass. Stop.
```

---

## 🟢 Prompt 6 — Stage 6: Per-zone aggregation

```
Implement Stage 6 per spec §8 and the contract in BUILD_PLAN.md §3.

Create src/stage6_aggregate.js with:
- aggregateZone(values) — exactly spec §8.1.
    Empty array returns { count: 0, status: 'no_data' } (gotcha 12.4).
- mergeIndicesByZone(ndviBuckets, ndwiBuckets) — exactly spec §8.2.
    Output shape exactly matches spec §8.3.

Create tests/stage6.test.js:
- aggregateZone([0.5, 0.6, 0.7]) returns mean=0.6, min=0.5, max=0.7, count=3,
  median=0.6, and a positive std.
- aggregateZone([]) returns { count: 0, status: 'no_data' }.
- aggregateZone with one element returns std=0.
- mergeIndicesByZone with the §11.8 example values produces the §8.3 shape
  for at least zones A and C (use rounded values).

Run tests, show pass. Stop.
```

---

## 🟢 Prompt 7 — Farm context (soil + weather)

```
Implement the farm context loader per spec §9.1 inputs.

Create src/farm_context.js with:
- fetchSoilMoisture(polygonId, apiKey) — GET AgroMonitoring /soil endpoint,
    extract the surface soil moisture (0..1 fraction).
- fetchWeather(lat, lng) — GET Open-Meteo daily forecast. Pull:
    - air_temperature_2m_max for today (today's high)
    - precipitation_sum for next 3 days, summed → rain_3d_mm
    - et0_fao_evapotranspiration for today → et0_mm_per_day
- getFarmContext(polygonId, center, apiKey) — runs both in parallel,
    returns { soil_moisture, air_temperature, rain_3d_mm, et0_mm_per_day }.

Hard rules:
- center is [lng, lat] (GeoJSON order). Open-Meteo expects (lat, lng) in
  the query — convert at the boundary. Add a comment about this.
- Read OPEN_METEO_BASE from config.

Create tests/farm_context.test.js:
- Mock axios. Verify fetchWeather sends correct lat/lng (not swapped).
- Verify it sums 3 days of precipitation correctly.
- Verify getFarmContext merges both responses into the expected shape.

Run tests, show pass. Stop.
```

---

## 🟢 Prompt 8 — Stage 7: Rule engine

```
Implement Stage 7 per spec §9 and the contract in BUILD_PLAN.md §3.

Create src/stage7_rules.js with, in this order:
- File-level comment documenting gotcha 12.5: "We use AgroMonitoring's
  NDWI (NIR-SWIR formula). Thresholds below are for this NDWI, not NDMI."
- All four threshold objects exactly as spec §9.2.
- FLAG_POINTS exactly as spec §9.3.
- classify(value, thresholds) — spec §9.2.
- scoreZone(zone, farmContext) — spec §9.3.
- decide(scores) — spec §9.4, exact order of conditions.
- computeIrrigationAmount(decision, farmContext, farmAreaHa) — spec §9.5.
- runRuleEngine(zoneStatsArray, farmContext, farmAreaHa) — for each zone,
    skip if zone.ndvi.status === 'no_data' (gotcha 12.4), otherwise run
    score → decide → computeIrrigationAmount and return the full per-zone
    object exactly as spec §9.6.
- Add a `confidence` field per zone: HIGH if pixel_count >= 15,
  MEDIUM if 8-14, LOW if < 8.

Create tests/stage7.test.js — these are the most important tests in the
project:
- classify boundary cases: NDVI 0.2 is WARNING (not CRITICAL — strict <),
  NDVI 0.199 is CRITICAL.
- scoreZone on the §11.10 zone C values produces water_score=8,
  heat_score=2, vegetation_score=3.
- decide({water_score:8, heat_score:2, vegetation_score:3}) returns
  URGENT_IRRIGATION.
- decide cascading: water_score=6 only → IRRIGATE_SOON. water_score=4 →
  MONITOR_WATER. All zeros → HEALTHY.
- computeIrrigationAmount on §11.10 inputs (et0=6.2, soil_moisture=0.14,
  area 1.84 ha) produces amount_mm ≈ 9.92 and amount_liters ≈ 20283.
- runRuleEngine skips a no_data zone without throwing.
- runRuleEngine on the §11.8 nine-zone fixture produces the §11.11 summary
  (5 healthy, 0 moderate per spec — verify the count for each status).

Run tests, show pass. Stop.
```

---

## 🟢 Prompt 9 — Stage 8: DeepSeek translation

```
Implement Stage 8 per spec §10 using DeepSeek via the openai SDK.

Create src/stage8_translate.js with:
- translate({ farm, zones, weather, language = 'mixed' }, _client) — calls
  DeepSeek with the system prompt from spec §10.1, passing a JSON-stringified
  user payload matching §10.1's structure.
- Support languages: 'fr' (French), 'darija' (Moroccan Arabic), 'mixed'
  (the spec's default — mixed Darija + French as in §11.12).
- The system prompt must include the "never invent data" rule from §10.1.

Hard rules:
- Use openai SDK pointed at DeepSeek base URL. Model from DEEPSEEK_MODEL
  (default: deepseek-chat). DEEPSEEK_API_KEY from config.
- If the SDK call fails, throw a clear error mentioning "DeepSeek" — do NOT
  silently return a fallback string.

Create tests/stage8.test.js:
- Inject a mock client via the _client parameter (DI pattern).
- Verify the system prompt contains the §10.1 instructions.
- Verify the user message contains the zone data we passed in.
- Verify language parameter affects the prompt.
- One integration test (skipped by default with .skip) that actually calls
  the API with the §11.11 fixture and prints the result for human review.

Run tests, show pass. Stop.
```

---

## 🟢 Prompt 10 — Pipeline orchestrator + demo

```
Wire everything together per BUILD_PLAN.md §3 (pipeline contract) and
spec §11 (end-to-end example).

Create src/pipeline.js with:
- runPipeline({ farm, language }) where `farm` is:
    { agro_polygon_id, polygon_geojson, area_hectares, center, name, crop }

  Steps, in order:
  1. searchScenes(14 days). If empty → searchScenes(30 days). Pick best.
     If still none, throw with a clear message.
  2. Download ndvi and ndwi GeoTIFFs in parallel.
  3. Decode both. Run calibrate() on NDVI in dev mode (env DEV_CALIBRATE=true)
     and log a warning if it fails.
  4. Mine valid pixels for both indices.
  5. Compute zone grid (once). Bucketize both.
  6. Aggregate per zone. Merge NDVI + NDWI.
  7. Fetch farm context in parallel with steps 2-6 (kick it off early).
  8. Run rule engine.
  9. Build the summary object (counts per status, total water needed,
     priority_action string) exactly as spec §11.11.
  10. Call translate() to get the narrative.
  11. Return the final object matching §11.11 + narrative field.

- Carry satellite_date through to the output (gotcha 12.9).
- If the chosen scene was the stale fallback, set summary.stale_data = true.

Create scripts/run_demo.js that:
- Uses the Souss-Massa polygon from spec §11.1.
- If USE_AGRO_SAMPLE=true, uses the sample polygon ID from gotcha 12.8
  instead of registering a real one.
- Runs the full pipeline and pretty-prints the result.
- Exits 0 on success, 1 on failure.

Add an npm "demo" script that runs this.

Run `npm test` — all tests should still pass.
Then run `npm run demo` with sample mode and show me the output.

That's the full core. Stop here.
```

---

## 🔁 If something goes wrong mid-build

Paste this:

```
We are mid-build on the AgriCopilot core pipeline. Re-read CORE_PIPELINE_SPEC.md
and BUILD_PLAN.md. List which stages from BUILD_PLAN.md §5 are complete
(source file exists + tests pass) and which are not. Do not write any code
yet — just report status. Then wait for my next instruction.
```

---

## 🧪 If you want to add a new feature later

Don't bolt it onto an existing stage. Add a new module and a new prompt
that follows the same pattern: contract first, tests second, integration third.
The 8-stage pipeline above is the spine — keep it untouched.

---

*End of prompts. Total: 11 prompts, run in order, one at a time.*
