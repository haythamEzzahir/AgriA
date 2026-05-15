# 🛰️ AgriCopilot (formerly TerraSat) — *Satellite Intelligence for Moroccan Agriculture*

> **Note:** This is the aspirational vision document. The current implementation uses a **Node.js/Express backend** with AgroMonitoring API, OpenWeather, and OpenRouter AI. The Python FastAPI + Sentinel pipeline described below is the planned future architecture.

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Problem](#2-the-problem)
3. [The Solution](#3-the-solution)
4. [System Architecture (Planned)](#4-system-architecture-planned)
5. [Module 1 — AgroSat (Land)](#5-module-1--agrosat-land)
6. [Module 2 — OceanSat (Sea)](#6-module-2--oceansat-sea)
7. [Data Sources](#7-data-sources)
8. [Core Functions & How They Work](#8-core-functions--how-they-work)
9. [AI Layer](#9-ai-layer)
10. [Tech Stack](#10-tech-stack)
11. [API Endpoints](#11-api-endpoints)
12. [Frontend Features](#12-frontend-features)
13. [Business Model](#13-business-model)
14. [72h Hackathon Roadmap](#14-72h-hackathon-roadmap)
15. [Future Roadmap (Post-Hackathon)](#15-future-roadmap-post-hackathon)

---

## 1. Project Overview

**AgriCopilot** is a satellite intelligence platform that solves two of Morocco's most critical resource problems:

| Module | Target | Problem Solved |
|--------|--------|----------------|
| 🌾 **AgroSat** | Farmers | Wasted irrigation water, crop stress, yield loss |
| 🌊 **OceanSat** | Fishermen | Wasted fuel searching for fish, dangerous sea conditions |

Both modules are powered by **free ESA Copernicus satellite data** (Sentinel-1 SAR + Sentinel-2 Optical + Sentinel-3 Ocean), processed by AI, and delivered through a **simple mobile-first dashboard** — no sensors, no hardware, no installation required.

### Why "Impossible Without AI"

| Task | Human Capability | TerraSat |
|------|-----------------|----------|
| Monitor 10 hectares for water stress | Walk field every few days | Every 5 days from space, automatically |
| Detect crop disease before visible | Impossible until symptoms appear | 2–3 weeks early via NDRE anomaly |
| Find fish in 200km² ocean | Pure guesswork | Thermal + chlorophyll analysis daily |
| Monitor during cloudy/rainy season | Impossible (no visibility) | SAR radar sees through clouds 24/7 |
| Process 13 spectral bands per pixel | Impossible manually | AI computes in seconds |

---

## 2. The Problem

### 🌾 Agriculture
- Morocco uses **85% of national freshwater** on agriculture
- Small farmers lose **40–60% of crops** due to bad irrigation timing
- A human agronomist costs **500–2000 MAD per visit** — unaffordable for most
- **70%+ of irrigated land** still uses traditional, inefficient methods
- Rainy season (Oct–March) = when moisture data matters most = when farmers are blindest

### 🌊 Ocean & Fishing
- Morocco has **3,500 km of coastline** — one of the richest fishing zones in the world
- Small fishermen waste **40–60% of fuel** searching blindly for fish
- No affordable real-time ocean intelligence exists for small fishing boats
- Toxic algae blooms can destroy entire aquaculture farms overnight with **zero warning**
- Illegal fishing is nearly impossible to detect and enforce manually

---

## 3. The Solution

```
TerraSat Platform
│
├── 🛰️ Satellite Layer (Free ESA Data)
│     ├── Sentinel-1 (SAR Radar)    → All-weather, day+night
│     ├── Sentinel-2 (Optical)      → Crop health, vegetation
│     └── Sentinel-3 (Ocean Color)  → Sea temperature, plankton
│
├── 🧠 AI Processing Layer (Python)
│     ├── NDVI / NDMI / NDRE computation
│     ├── SAR backscatter → soil moisture
│     ├── SST + Chlorophyll → fish zone prediction
│     └── Claude API → natural language advice in Darija/French
│
├── ⚡ Backend (FastAPI)
│     ├── Data ingestion pipeline
│     ├── Zone analysis engine
│     ├── Alert generation
│     └── REST API for frontend
│
└── 📱 Frontend (React + Leaflet)
      ├── Interactive farm/ocean map
      ├── Zone health dashboard
      ├── Daily action plan
      └── WhatsApp / SMS alerts
```

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                           │
│   Farmer (Mobile PWA)          Fisherman (Mobile PWA)       │
└────────────────────┬───────────────────────┬────────────────┘
                     │                       │
┌────────────────────▼───────────────────────▼────────────────┐
│                   REACT FRONTEND                            │
│   Farm Map (Leaflet)    │    Ocean Map (Leaflet)            │
│   Zone Dashboard        │    Fishing Zone Predictor         │
│   Action Plan           │    Weather + Wave Alerts          │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API calls
┌────────────────────────▼────────────────────────────────────┐
│                  FASTAPI BACKEND                            │
│                                                             │
│  /api/farm/analyze     →  AgroSat Engine                   │
│  /api/ocean/zones      →  OceanSat Engine                  │
│  /api/alerts           →  Alert Generator                  │
│  /api/advice           →  Claude AI Advisor                │
└────┬──────────────┬──────────────┬──────────────┬──────────┘
     │              │              │              │
┌────▼────┐  ┌──────▼──────┐  ┌───▼────┐  ┌─────▼─────┐
│Sentinel │  │  Sentinel-2  │  │Sentinel│  │ OpenMeteo │
│   -1    │  │  (Optical)   │  │   -3   │  │ (Weather) │
│  (SAR)  │  │              │  │(Ocean) │  │           │
└─────────┘  └─────────────┘  └────────┘  └───────────┘
     │              │              │              │
┌────▼──────────────▼──────────────▼──────────────▼──────────┐
│                   MongoDB Atlas                             │
│   farms | analyses | alerts | fishermen | ocean_data       │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Module 1 — AgroSat (Land)

### What It Does

Every 5 days (or after cloud clears), AgroSat:
1. Downloads the latest Sentinel-2 image of the farm
2. Downloads latest Sentinel-1 SAR image (works through clouds)
3. Computes 4 vegetation/moisture indices per farm zone
4. Cross-references with rainfall forecast (OpenMeteo)
5. Generates zone-by-zone irrigation action plan
6. Sends alert via WhatsApp/email if critical zone detected

### Farm Zone System

The farm is divided into a **configurable grid** (default 3×3 = 9 zones). Each zone gets its own independent analysis.

```
Farm Grid Example (9 zones):
┌─────────┬─────────┬─────────┐
│ Zone A1 │ Zone A2 │ Zone A3 │
│  🟢 OK  │  🟡 Warn│  🔴 Crit│
├─────────┼─────────┼─────────┤
│ Zone B1 │ Zone B2 │ Zone B3 │
│  🟢 OK  │  🟢 OK  │  🟡 Warn│
├─────────┼─────────┼─────────┤
│ Zone C1 │ Zone C2 │ Zone C3 │
│  🔵 Over│  🟢 OK  │  🟢 OK  │
└─────────┴─────────┴─────────┘

🟢 Good    → No action needed
🟡 Warning → Water within 2 days  
🔴 Critical → Water TODAY
🔵 Over    → Stop irrigation — overwatered
```

### Indices Computed Per Zone

#### NDVI — Vegetation Health
```
Formula: (NIR - Red) / (NIR + Red)
Bands:   Sentinel-2 B8 (NIR) and B4 (Red)

Score Interpretation:
  0.8 – 1.0  →  Very healthy, dense crop
  0.5 – 0.8  →  Healthy
  0.2 – 0.5  →  Stressed / sparse
  0.0 – 0.2  →  Bare soil or dying
  < 0.0      →  Water / non-vegetation
```

#### NDMI — Water Moisture Content
```
Formula: (NIR - SWIR) / (NIR + SWIR)
Bands:   Sentinel-2 B8 (NIR) and B11 (SWIR)

Score Interpretation:
  0.4 – 1.0  →  Well watered
  0.0 – 0.4  →  Moderate moisture
 -0.2 – 0.0  →  Water stressed ⚠️
  < -0.2     →  Severely drought stressed 🔴
  
This is the PRIMARY irrigation trigger index.
```

#### NDRE — Nitrogen Stress (Early Warning)
```
Formula: (NIR - RedEdge) / (NIR + RedEdge)
Bands:   Sentinel-2 B8 (NIR) and B5 (Red Edge)

Why: Detects nitrogen deficiency 2–3 weeks BEFORE
     visible yellowing — saving yield before it's lost.

Score Interpretation:
  High  →  Good nitrogen levels
  Low   →  Add fertilizer this week
```

#### SAR Soil Moisture (VV/VH)
```
Source: Sentinel-1 GRD product
Bands:  VV polarization + VH polarization

Formula: Moisture Proxy = (VV - VH) / (VV + VH)

Why use SAR:
  - Works through clouds (critical Oct–March in Morocco)
  - Works at night
  - Measures SURFACE soil moisture directly
  - Complements NDMI which measures plant water content

Score Interpretation:
  High proxy value  →  Moist soil
  Low proxy value   →  Dry soil → irrigate
```

### Decision Engine Logic

```python
def generate_zone_recommendation(ndvi, ndmi, ndre, sar_moisture, rainfall_forecast_mm):
    
    # Check if rain is coming
    rain_coming = rainfall_forecast_mm > 5  # mm in next 48h
    
    # Primary moisture check
    if ndmi < -0.2 and sar_moisture < 0.3:
        urgency = "CRITICAL"
        action = "Irrigate today — both satellite and radar confirm drought stress"
        
    elif ndmi < 0.0 and not rain_coming:
        urgency = "WARNING"
        action = "Irrigate within 48 hours"
        
    elif ndmi < 0.0 and rain_coming:
        urgency = "MONITOR"
        action = "Rain expected — skip irrigation, monitor after rain"
        
    elif ndmi > 0.4:
        urgency = "OVERWATERED"
        action = "Stop irrigation — soil already saturated"
        
    else:
        urgency = "GOOD"
        action = "No action needed today"
    
    # Secondary nitrogen check
    fertilizer_needed = ndre < 0.2
    
    return {
        "urgency": urgency,
        "action": action,
        "fertilizer_alert": fertilizer_needed,
        "health_score": round(ndvi * 100),
        "moisture_score": round((ndmi + 1) / 2 * 100)
    }
```

---

## 6. Module 2 — OceanSat (Sea)

### What It Does

Every day, OceanSat:
1. Downloads Sentinel-3 ocean color image of Moroccan Atlantic coast
2. Downloads Sentinel-1 SAR for vessel detection and wave conditions
3. Computes SST (sea surface temperature) and Chlorophyll-a maps
4. Identifies thermal fronts where fish concentrate
5. Detects dangerous wave conditions
6. Generates "Today's Best Fishing Zones" for each port city

### Fish Zone Prediction Logic

Fish don't swim randomly — they follow physics:
- **Cold upwelling zones** bring nutrients from deep ocean → plankton blooms → fish
- **Thermal fronts** (boundary between cold/warm water) = fish superhighways
- **High chlorophyll** = plankton = food = fish

```python
def predict_fish_zones(sst_map, chlorophyll_map, wave_height_map):
    
    zones = []
    
    for zone in grid_zones:
        sst = sst_map[zone]
        chl = chlorophyll_map[zone]
        waves = wave_height_map[zone]
        
        # Thermal front detection
        sst_gradient = compute_gradient(sst_map, zone)
        is_thermal_front = sst_gradient > 0.5  # °C per km
        
        # Fish probability score
        score = 0
        if 16 <= sst <= 20:       score += 30  # Optimal temp for sardines
        if chl > 2.0:             score += 30  # High plankton
        if is_thermal_front:      score += 25  # Thermal front
        if waves < 1.5:           score += 15  # Safe conditions
        
        zones.append({
            "zone_id": zone.id,
            "lat": zone.center_lat,
            "lon": zone.center_lon,
            "fish_probability": score,
            "sst": sst,
            "chlorophyll": chl,
            "wave_height": waves,
            "safe_to_fish": waves < 2.0,
            "distance_from_port_km": zone.distance
        })
    
    return sorted(zones, key=lambda x: x["fish_probability"], reverse=True)
```

### Ocean Indices

#### SST — Sea Surface Temperature
```
Source: Sentinel-3 SLSTR instrument
Resolution: 1 km

Optimal ranges by species:
  Sardines:   16–20°C
  Anchovies:  15–19°C  
  Octopus:    18–22°C
  Swordfish:  20–28°C

Usage: Match current SST to target species temperature range
```

#### Chlorophyll-a Concentration
```
Source: Sentinel-3 OLCI instrument
Formula: Ocean color algorithm (OC4Me)
Unit: mg/m³

Interpretation:
  < 0.5   →  Oligotrophic — few fish
  0.5–2.0 →  Moderate — some fish
  > 2.0   →  Productive — good fishing zone 🐟
  > 10.0  →  Potential algae bloom ⚠️
```

#### SAR Vessel Detection
```
Source: Sentinel-1 SAR
Method: Constant False Alarm Rate (CFAR) detector

Ships appear as bright point targets on dark ocean background.
Useful for:
  - Detecting where other boats are fishing (social signal)
  - Identifying illegal fishing vessels
  - Port traffic monitoring
```

#### SAR Ocean Anomaly Detection
```
Oil spills / toxic algae:
  Dampen surface waves → very low SAR backscatter
  Appear as dark patches on ocean surface

Alert thresholds:
  SAR backscatter < -20 dB over large area → potential spill/bloom
  Cross-reference with chlorophyll → confirm algae bloom
```

---

## 7. Data Sources

| Source | Data Type | Revisit | Resolution | Cost |
|--------|-----------|---------|------------|------|
| **Sentinel-1 SAR** | Radar backscatter (VV, VH) | 6 days | 10m | ✅ Free |
| **Sentinel-2 MSI** | Multispectral optical (13 bands) | 5 days | 10–60m | ✅ Free |
| **Sentinel-3 OLCI** | Ocean color, chlorophyll | 2 days | 300m | ✅ Free |
| **Sentinel-3 SLSTR** | Sea surface temperature | 2 days | 1km | ✅ Free |
| **OpenMeteo** | Weather forecast (rain, wind, temp) | Hourly | 1km grid | ✅ Free |
| **Copernicus Marine** | Ocean currents, wave height | Daily | 5km | ✅ Free |
| **Google Earth Engine** | Cloud processing platform | Real-time | Various | ✅ Free |

### Access Method

```python
# Copernicus Data Space Ecosystem
BASE_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1"

# Authentication
TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

# OpenMeteo (no auth needed)
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

# Copernicus Marine
MARINE_URL = "https://nrt.cmems-du.eu/motu-web/Motu"
```

---

## 8. Core Functions & How They Work

### 8.1 `get_satellite_token()`
```
Purpose: Authenticate with Copernicus Data Space
Input:   Email + password (from env variables)
Output:  JWT access token (valid 10 minutes)
How:     POST request to Keycloak identity server
```

### 8.2 `search_sentinel2(lat, lon, date_range, cloud_max=20)`
```
Purpose: Find best available Sentinel-2 image for a location
Input:   Farm coordinates, date range, max cloud cover %
Output:  List of available product IDs sorted by cloud cover
How:     OData API query with spatial + temporal + quality filters
         Returns only images with < cloud_max% cloud cover
```

### 8.3 `download_bands(product_id, bands=['B4','B8','B11','B5'])`
```
Purpose: Download specific spectral bands (not full image)
Input:   Product ID, list of band names needed
Output:  GeoTiff files per band saved to temp directory
How:     Partial download via Copernicus S3 API
         Only downloads needed bands (saves 90% bandwidth)
         Full image = 800MB, needed bands = ~80MB
```

### 8.4 `compute_ndvi(red_band, nir_band)`
```
Purpose: Compute vegetation health index
Input:   Red band array (B4), NIR band array (B8)
Output:  2D array of NDVI values (-1 to 1) per pixel
How:
  1. Read both bands as numpy arrays
  2. Convert to float32 to avoid integer overflow
  3. Apply formula: (NIR - Red) / (NIR + Red + epsilon)
  4. Clip result to valid range [-1, 1]
  5. Handle division by zero with epsilon = 1e-10
```

### 8.5 `compute_ndmi(nir_band, swir_band)`
```
Purpose: Compute plant water content index
Input:   NIR band array (B8), SWIR band array (B11)
Output:  2D array of NDMI values (-1 to 1) per pixel
How:     Same as NDVI but with SWIR instead of Red band
         SWIR is absorbed by water in leaves
         Lower NDMI = less water in plant = need irrigation
```

### 8.6 `compute_sar_moisture(vv_array, vh_array)`
```
Purpose: Compute soil moisture proxy from radar data
Input:   VV polarization array, VH polarization array (in dB)
Output:  Normalized moisture map (0–100%)
How:
  1. Convert from dB to linear: linear = 10^(dB/10)
  2. Compute ratio: moisture_proxy = VV_linear / VH_linear
  3. Apply Water Cloud Model correction for vegetation
  4. Normalize to 0–100% scale using percentile stretch
  5. Mask out water bodies (very low VV < -20 dB)
```

### 8.7 `segment_farm_zones(farm_geojson, grid_size=3)`
```
Purpose: Split farm polygon into analysis zones
Input:   Farm boundary as GeoJSON, grid size (default 3x3)
Output:  List of zone polygons with IDs and center coordinates
How:
  1. Load farm boundary polygon
  2. Compute bounding box
  3. Divide into grid_size × grid_size equal cells
  4. Intersect each cell with farm polygon
  5. Return only cells that overlap farm boundary
  6. Assign zone IDs (A1, A2, B1, etc.)
```

### 8.8 `analyze_zone(zone_polygon, ndvi_map, ndmi_map, ndre_map, sar_map)`
```
Purpose: Compute mean indices for a single farm zone
Input:   Zone polygon, all computed index maps
Output:  Dict with mean NDVI, NDMI, NDRE, SAR moisture per zone
How:
  1. Create raster mask from zone polygon
  2. Apply mask to each index map
  3. Compute nanmean (ignoring nodata pixels)
  4. Return aggregated statistics
```

### 8.9 `generate_irrigation_plan(zone_analyses, weather_forecast)`
```
Purpose: Convert satellite data into actionable irrigation plan
Input:   Zone analysis results, 7-day rainfall forecast
Output:  Prioritized action list per zone + overall farm summary
How:
  1. For each zone, check NDMI vs thresholds
  2. Check if rain is forecast in next 48h
  3. Check SAR moisture as secondary confirmation
  4. Apply decision tree (see Module 1 section)
  5. Sort zones by urgency (Critical first)
  6. Add water quantity estimate based on crop type + area
  7. Format as human-readable action plan
```

### 8.10 `get_ai_advice(zone_plan, crop_type, language='fr')`
```
Purpose: Generate natural language advice via Claude API
Input:   Zone plan dict, crop type, language preference
Output:  Plain text advice in French or Darija
How:
  1. Format zone data as structured prompt
  2. Send to Claude API with system prompt:
     "You are an expert Moroccan agronomist.
      Give practical, simple advice in {language}.
      Be specific about quantities and timing.
      Address a farmer with primary education."
  3. Parse response and return text
  4. Cache result for 24h to save API credits
```

### 8.11 `predict_fish_zones(lat_center, lon_center, radius_km=100)`
```
Purpose: Identify best fishing zones for today
Input:   Port coordinates, search radius
Output:  Ranked list of fishing zones with probability scores
How:
  1. Download Sentinel-3 SST + chlorophyll for the area
  2. Divide ocean into 10×10 km grid zones
  3. For each zone compute fish probability score
  4. Detect thermal fronts (SST gradient > 0.5°C/km)
  5. Check wave height from Copernicus Marine API
  6. Filter zones with unsafe wave conditions
  7. Return top 5 zones sorted by probability
  8. Include estimated fuel cost per zone
```

### 8.12 `detect_ocean_anomalies(sar_ocean_image)`
```
Purpose: Detect oil spills, algae blooms, dangerous conditions
Input:   Sentinel-1 SAR image of ocean area
Output:  List of anomaly polygons with type and severity
How:
  1. Compute mean ocean backscatter for the scene
  2. Flag pixels significantly below mean (dark patches)
  3. Label connected anomaly regions
  4. Filter by minimum area (> 1 km²)
  5. Cross-reference with Sentinel-3 chlorophyll:
     - High chlorophyll + dark SAR = algae bloom
     - Low chlorophyll + dark SAR = potential oil spill
  6. Generate alert with coordinates and severity
```

### 8.13 `send_alert(user_id, alert_type, message, channel='whatsapp')`
```
Purpose: Notify farmer/fisherman of critical conditions
Input:   User ID, alert type, message text, delivery channel
Output:  Delivery confirmation
Channels:
  - WhatsApp via Twilio API
  - Email via Resend.com
  - In-app push notification
Alert types:
  - CRITICAL_DROUGHT → Irrigate today
  - RAIN_COMING → Skip irrigation
  - DISEASE_RISK → Check field + potential treatment
  - GOOD_FISHING_ZONE → Best zone today
  - DANGEROUS_SEA → Do not go out today
  - ALGAE_BLOOM → Alert aquaculture farm
```

---

## 9. AI Layer

### Claude API Integration

```python
SYSTEM_PROMPT_FARMER = """
You are an expert agronomist specialized in Moroccan agriculture.
You speak directly to small-scale farmers.
Rules:
- Give concrete, actionable advice only
- Use simple language (primary school level)
- Be specific: quantities, timing, amounts
- Respond in {language} (French or Darija)
- Never use technical jargon without explanation
- Always mention cost implications when relevant
"""

SYSTEM_PROMPT_FISHERMAN = """
You are an expert Moroccan fishing guide and ocean navigator.
You help small artisanal fishermen maximize catch and stay safe.
Rules:
- Give GPS coordinates or clear compass directions
- Always mention safety conditions first
- Estimate fuel cost for each recommendation
- Respond in {language} (French or Darija)
- Include best time of day to fish each zone
"""
```

### Data Fusion Logic

```
When optical (Sentinel-2) is available (clear sky):
  Primary:   NDMI for moisture
  Secondary: SAR VV/VH for confirmation
  Output:    High confidence recommendation

When clouds block optical:
  Primary:   SAR VV/VH for moisture (all-weather)
  Secondary: Previous optical reading + trend
  Output:    Medium confidence recommendation

When both available (ideal):
  Fusion:    Weighted average (60% optical, 40% SAR)
  Output:    Highest confidence recommendation
```

---

## 10. Tech Stack

> **Current implementation** (MVP delivered in hackathon):

### Backend

```
Language:     Node.js 20 (ES modules)
Framework:    Express.js
Satellite:    AgroMonitoring API (NDVI/NDWI/temperature/soil moisture)
AI:           OpenRouter API (Claude 3 Haiku)
Weather:      OpenWeather API (5-day forecast)
Database:     Supabase (PostgreSQL)
Auth:         Supabase Auth (JWT) + demo tokens
```

### Frontend

```
Framework:    React 18 + Vite
Maps:         Leaflet.js + React-Leaflet
              3D Globe: globe.gl
Styling:      Tailwind CSS
State:        React Context + useState
HTTP:         Fetch API (native)
Hosting:      Vite dev server / static build
```

### Infrastructure

```
Backend host:   Node.js server (port 5000)
Database:       Supabase (PostgreSQL, free tier)
Satellite data: Google Earth Engine (free for research)
                Copernicus Data Space (free)
Domain:         Vercel subdomain (free)
CI/CD:          GitHub Actions (free)
```

---

## 11. API Endpoints

### Farm Endpoints

```
POST /api/farm/register
  Body: { name, lat, lon, area_hectares, crop_type }
  Returns: { farm_id, zones: [...] }

GET /api/farm/{farm_id}/analyze
  Query: ?date=2024-11-01
  Returns: {
    zones: [{ id, ndvi, ndmi, ndre, sar_moisture, status, action }],
    overall_health: 0-100,
    action_plan: [...],
    next_satellite_pass: "2024-11-06"
  }

GET /api/farm/{farm_id}/advice
  Query: ?language=fr
  Returns: { advice_text: "...", generated_at: "..." }

GET /api/farm/{farm_id}/history
  Query: ?days=30
  Returns: { dates: [...], ndvi_trend: [...], ndmi_trend: [...] }
```

### Ocean Endpoints

```
GET /api/ocean/fishing-zones
  Query: ?port=agadir&radius_km=100&species=sardine
  Returns: {
    zones: [{ lat, lon, probability, sst, chlorophyll, distance_km, fuel_estimate_L }],
    weather: { wind_kmh, wave_height_m, safe_to_fish: bool },
    best_time: "05:00–11:00"
  }

GET /api/ocean/alerts
  Query: ?lat=30.4&lon=-9.6&radius_km=50
  Returns: {
    alerts: [{ type, severity, description, coordinates }]
  }

GET /api/ocean/vessels
  Query: ?lat=30.4&lon=-9.6&radius_km=30
  Returns: { vessels: [{ lat, lon, confidence }] }
```

### Alert Endpoints

```
POST /api/alerts/subscribe
  Body: { user_id, farm_id, channel: "whatsapp"|"email", phone_or_email }

GET /api/alerts/{user_id}/history
  Returns: [{ type, message, sent_at, delivered: bool }]
```

---

## 12. Frontend Features

### AgroSat Dashboard

```
Screen 1 — Farm Map
  ├── Leaflet map with farm boundary
  ├── Color-coded zone overlay (green/yellow/red/blue)
  ├── Click zone → show detailed stats
  ├── Toggle: Optical view / SAR moisture view / NDVI heatmap
  └── Last updated timestamp + next update date

Screen 2 — Daily Action Plan
  ├── Priority-sorted zone list
  ├── Each zone: status badge + specific action + estimated water volume
  ├── Weather integration: "Rain in 2 days — skip Zone B3"
  └── Export as PDF (for farmers without constant internet)

Screen 3 — Season Analytics
  ├── NDVI trend chart (30/60/90 days)
  ├── NDMI trend chart
  ├── Water saved vs traditional irrigation (estimate)
  └── Yield forecast vs regional average
```

### OceanSat Dashboard

```
Screen 1 — Ocean Zone Map
  ├── Leaflet map centered on nearest port
  ├── Color-coded fishing zones (probability heatmap)
  ├── SST layer toggle (temperature color scale)
  ├── Chlorophyll layer toggle (green = productive)
  └── Detected vessel positions (SAR)

Screen 2 — Today's Fishing Plan
  ├── Top 3 zones ranked by fish probability
  ├── Each zone: distance, fuel estimate, best species, wave height
  ├── Safety banner if waves > 2m: "DO NOT GO OUT TODAY"
  └── Best departure time recommendation

Screen 3 — Alerts
  ├── Active alerts (algae bloom, oil spill, dangerous weather)
  ├── Historical alert log
  └── Alert subscription settings (WhatsApp / email)
```

---

## 13. Business Model

### Pricing Tiers

| Tier | Target | Price | Features |
|------|--------|-------|----------|
| **Free** | Trial users | 0 MAD | 1 farm/boat, monthly analysis, basic map |
| **Pro Farmer** | Small/medium farms | 99 MAD/month | 3 farms, weekly analysis, SMS alerts, AI advice |
| **Pro Fisherman** | Individual boat | 49 MAD/month | Daily zones, weather alerts, fuel optimizer |
| **Cooperative** | Farmer/fishing coops | 499 MAD/month | Unlimited users, fleet dashboard, API access |
| **Enterprise/Gov** | Ministries, OCP, ports | Custom | Regional dashboard, data exports, SLA |

### Revenue Streams

1. **SaaS subscriptions** — monthly recurring from farmers/fishermen
2. **Cooperative licensing** — bulk deals with agricultural cooperatives
3. **Government contracts** — water audit tools for Ministry of Agriculture
4. **Data licensing** — anonymized crop stress / ocean productivity maps
5. **Agri-insurance** — risk scores sold to insurance companies
6. **OCP Partnership** — fertilizer optimization recommendations

---

## 14. 72h Hackathon Roadmap

### ⏰ Day 1 (Hour 0–24) — Data Pipeline

```
Hour 0–2:   Environment setup
            ├── Google Earth Engine account + Python API
            ├── Copernicus Data Space account
            ├── OpenMeteo test call
            └── MongoDB Atlas cluster

Hour 2–8:   Sentinel-2 pipeline
            ├── Pull image for Souss-Massa farm (real location)
            ├── Compute NDVI + NDMI + NDRE
            └── Output zone JSON

Hour 8–14:  Sentinel-1 SAR pipeline
            ├── Pull SAR image same location
            ├── Compute VV/VH moisture proxy
            └── Merge with optical results

Hour 14–20: FastAPI backend
            ├── /api/farm/analyze endpoint (mock farm)
            ├── /api/ocean/fishing-zones endpoint
            └── OpenMeteo integration

Hour 20–24: Claude API integration
            ├── Advice generator function
            └── French + Darija prompt testing
```

### ⏰ Day 2 (Hour 24–48) — Product

```
Hour 24–32: React farm map
            ├── Leaflet map setup
            ├── GeoJSON zone overlay
            └── Color-coded zone status

Hour 32–40: Dashboard screens
            ├── Action plan component
            ├── Zone detail popup
            └── NDVI trend chart (Recharts)

Hour 40–48: Ocean module UI
            ├── Fishing zone probability map
            ├── Safety banner component
            └── Top zones ranking list
```

### ⏰ Day 3 (Hour 48–72) — Polish & Pitch

```
Hour 48–54: Integration + bug fixing
            ├── Connect all frontend → backend
            └── Real data flowing through demo

Hour 54–60: Demo preparation
            ├── Real Souss-Massa farm satellite imagery
            ├── Real Atlantic coast fishing zones
            └── Live AI advice generation

Hour 60–66: Pitch assets
            ├── Landing page with waitlist
            ├── 5-slide pitch deck
            └── 2-minute demo video

Hour 66–72: Rehearsal + final polish
```

---

## 15. Future Roadmap (Post-Hackathon)

### V2 — SAR Fusion (Month 2–3)
- Full Sentinel-1 + Sentinel-2 data fusion
- 365-day continuous coverage (no cloud gaps)
- Flood detection alerts for farmers
- Improved soil moisture accuracy

### V3 — IoT Optional Layer (Month 4–6)
- Optional cheap soil sensor ($15) for premium users
- Sensor data validates and calibrates satellite readings
- Smart irrigation valve integration (auto-irrigate)

### V4 — Prediction Models (Month 6–12)
- Yield prediction 30 days ahead
- Disease outbreak risk maps
- Seasonal planning assistant
- Carbon credit reporting for sustainable farms

### V5 — MENA Expansion (Year 2)
- Egypt: Nile Delta agriculture + Mediterranean fishing
- Tunisia: Similar climate and farming patterns
- Senegal: Atlantic fishing + sub-Saharan agriculture
- Same satellite data, same platform, different markets

---

## 🚀 Why TerraSat Wins

> *"Every morning, 120,000 Moroccan fishermen leave port and guess where the fish are. Every season, millions of farmers guess when to water their fields. We end the guessing — for both. One satellite platform. Two industries. Zero hardware required."*

| Metric | Value |
|--------|-------|
| Total addressable market (Morocco) | $50M+ |
| Total addressable market (MENA) | $2B+ |
| Satellite data cost | $0 |
| Hardware required | None |
| Time to first value for farmer | < 5 minutes |
| Water savings potential | 30–40% |
| Fuel savings potential for fishermen | 40–60% |

---

*Built with ❤️ for Moroccan farmers and fishermen.*  
*Powered by ESA Copernicus — free satellite data for all humanity.*
