# 🛰️ AgroSat

> **Satellite irrigation intelligence for Moroccan farmers.**
> No hardware. No sensors. Just your phone.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688.svg)](https://fastapi.tiangolo.com)
[![Satellite](https://img.shields.io/badge/Data-Sentinel--1%20%2B%202-orange.svg)](https://dataspace.copernicus.eu)
[![AI](https://img.shields.io/badge/AI-Claude%20API-blueviolet.svg)](https://anthropic.com)

---

## 📋 What Is AgroSat?

AgroSat analyzes farms from space every 5 days using free ESA Copernicus satellite data and generates a zone-by-zone irrigation action plan using AI — even through clouds, even at night.

```
Satellite (Sentinel-2 + Sentinel-1 SAR)
        ↓
  Python AI Pipeline
  NDVI · NDMI · NDRE · SAR Moisture
        ↓
  Claude API Reasoning
  "Zone C: irrigate today — 45L/ha — before 7am"
        ↓
  Farmer's Phone (React PWA)
```

**The problem it solves:** Moroccan farmers waste 40–60% of irrigation water making decisions by touching the soil. AgroSat replaces intuition with 10 million pixels of satellite data per farm.

---

## 🗂️ Repository Structure

```
agrosat/
│
├── 📁 backend/                        # Python FastAPI backend
│   ├── 📁 app/
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── 📁 api/
│   │   │   ├── farm.py                # /api/farm endpoints
│   │   │   ├── advice.py              # /api/farm/advice (Claude API)
│   │   │   └── alerts.py              # /api/alerts endpoints
│   │   ├── 📁 core/
│   │   │   ├── config.py              # Environment variables
│   │   │   └── database.py            # MongoDB Atlas connection
│   │   ├── 📁 satellite/
│   │   │   ├── sentinel2.py           # Sentinel-2 optical pipeline
│   │   │   ├── sentinel1_sar.py       # Sentinel-1 SAR radar pipeline
│   │   │   ├── indices.py             # NDVI, NDMI, NDRE, SAR moisture
│   │   │   ├── fusion.py              # Optical + SAR fusion logic
│   │   │   └── cloudy_strategy.py     # 4-level cloudy day fallback
│   │   ├── 📁 ai/
│   │   │   ├── claude_advisor.py      # Claude API irrigation advisor
│   │   │   ├── anomaly_detector.py    # Isolation Forest anomaly detection
│   │   │   ├── prompts.py             # Prompt templates (FR + Darija)
│   │   │   └── scoring.py             # Zone urgency scoring engine
│   │   ├── 📁 weather/
│   │   │   └── openmeteo.py           # OpenMeteo rainfall + ET0 forecast
│   │   └── 📁 models/
│   │       ├── farm.py                # Farm Pydantic model
│   │       └── analysis.py            # ZoneAnalysis Pydantic model
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── 📁 frontend/                       # React 18 dashboard
│   ├── 📁 src/
│   │   ├── 📁 components/
│   │   │   ├── 📁 map/
│   │   │   │   ├── FarmMap.jsx        # Leaflet farm zone map
│   │   │   │   ├── ZoneLayer.jsx      # Color-coded zone overlay
│   │   │   │   └── ZonePopup.jsx      # Zone detail popup
│   │   │   ├── 📁 dashboard/
│   │   │   │   ├── ActionPlan.jsx     # Daily irrigation action plan
│   │   │   │   ├── ZoneCard.jsx       # Single zone status card
│   │   │   │   ├── NDVIChart.jsx      # 30-day NDVI trend (Recharts)
│   │   │   │   └── WaterSaved.jsx     # Water savings estimate widget
│   │   │   ├── 📁 advice/
│   │   │   │   └── AIAdvice.jsx       # Claude API advice display
│   │   │   └── 📁 ui/
│   │   │       ├── StatusBadge.jsx    # 🟢🟡🔴🔵 status badges
│   │   │       ├── Spinner.jsx        # Loading states
│   │   │       └── WeatherBanner.jsx  # Rain forecast banner
│   │   ├── 📁 pages/
│   │   │   ├── Dashboard.jsx          # Main farm dashboard
│   │   │   ├── Analytics.jsx          # Season analytics page
│   │   │   └── Landing.jsx            # Public landing + waitlist
│   │   ├── 📁 hooks/
│   │   │   ├── useFarmAnalysis.js     # Farm data fetching hook
│   │   │   └── useWeather.js          # Weather forecast hook
│   │   ├── 📁 services/
│   │   │   └── api.js                 # Axios API client
│   │   └── 📁 styles/
│   │       └── globals.css            # Tailwind + custom CSS vars
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── 📁 satellite/                      # Standalone satellite scripts
│   ├── gee_ndvi.js                    # GEE JavaScript — NDVI in browser
│   ├── fetch_sentinel2.py             # Download Sentinel-2 bands
│   ├── fetch_sentinel1_sar.py         # Download Sentinel-1 SAR
│   ├── compute_indices.py             # Compute all 4 indices
│   ├── zone_segmentation.py           # Farm → 3x3 grid zones
│   └── demo_souss_massa.py            # 🔥 Run this first — demo farm
│
├── 📁 notebooks/                      # Jupyter exploration notebooks
│   ├── 01_sentinel2_exploration.ipynb # Explore Sentinel-2 for Morocco
│   ├── 02_sar_soil_moisture.ipynb     # SAR VV/VH moisture analysis
│   ├── 03_cloudy_day_strategy.ipynb   # Optical vs SAR comparison
│   └── 04_ai_recommendation.ipynb    # Claude API prompt testing
│
├── 📁 data/                           # Sample data (gitignored for large files)
│   ├── 📁 sample/
│   │   ├── souss_massa_farm.geojson   # Demo farm boundary polygon
│   │   └── zones_analysis_sample.json # Sample zone analysis output
│   └── .gitkeep
│
├── 📁 docs/                           # Documentation
│   ├── architecture.md                # System architecture diagram
│   ├── satellite_indices.md           # NDVI, NDMI, NDRE, SAR explained
│   ├── api_reference.md               # All API endpoints documented
│   ├── cloudy_day_strategy.md         # How we handle cloud cover
│   └── pitch_deck.pdf                 # Hackathon pitch deck
│
├── docker-compose.yml                 # Full stack local dev
├── .env.example                       # All required env variables
├── .gitignore
├── LICENSE
└── README.md                          # You are here
```

---

## ⚡ Quick Start (5 minutes)

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/agrosat.git
cd agrosat
cp .env.example .env
# Fill in your keys (see Environment Variables section)
```

### 2. Run the Demo (No setup needed)

```bash
cd satellite
pip install -r ../backend/requirements.txt
python demo_souss_massa.py
# → Pulls real Sentinel-2 data for a farm in Souss-Massa, Morocco
# → Computes NDVI + NDMI + NDRE per zone
# → Outputs zones_analysis.json
```

### 3. Full Stack with Docker

```bash
docker-compose up --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

### 4. Manual Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## 🌍 Environment Variables

```env
# .env.example

# Copernicus Data Space (free — dataspace.copernicus.eu)
COPERNICUS_EMAIL=your@email.com
COPERNICUS_PASSWORD=yourpassword

# Google Earth Engine (free — earthengine.google.com)
GEE_PROJECT_ID=your-gee-project

# Anthropic Claude API (anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# MongoDB Atlas (free — mongodb.com/atlas)
MONGODB_URI=mongodb+srv://...

# App
BACKEND_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000
```

---

## 🛰️ Satellite Data Sources

| Satellite | Data | Revisit | Cost | Used For |
|-----------|------|---------|------|----------|
| Sentinel-2 | Optical (13 bands) | 5 days | Free | NDVI, NDMI, NDRE |
| Sentinel-1 | SAR Radar (VV, VH) | 6 days | Free | Soil moisture, cloudy days |

Both accessed via [Copernicus Data Space](https://dataspace.copernicus.eu) or [Google Earth Engine](https://code.earthengine.google.com) — both completely free.

---

## 🧠 Vegetation Indices

| Index | Formula | Detects |
|-------|---------|---------|
| **NDVI** | `(NIR - Red) / (NIR + Red)` | Vegetation health |
| **NDMI** | `(NIR - SWIR) / (NIR + SWIR)` | Plant water content → irrigation trigger |
| **NDRE** | `(NIR - RedEdge) / (NIR + RedEdge)` | Nitrogen stress — 2–3 weeks early warning |
| **SAR Moisture** | `(VV - VH) / (VV + VH)` | Soil moisture — works through clouds |

---

## ☁️ Cloudy Day Strategy

When optical satellite is blocked by clouds:

```
Priority 1 → Sentinel-2 Optical    (clear sky, ~70% of year)
Priority 2 → Sentinel-1 SAR Radar  (all weather, 365 days)
Priority 3 → SAR + Aged Optical    (fusion with freshness flag)
Priority 4 → Water Balance Model   (ET0 + rainfall, no satellite)
```

Result: **zero data gaps, continuous 365-day coverage.**

---

## 🏗️ API Endpoints

```
GET  /api/farm/{farm_id}/analyze     → Zone analysis with all indices
GET  /api/farm/{farm_id}/advice      → Claude AI irrigation advice
GET  /api/farm/{farm_id}/history     → 30-day NDVI/NDMI trend
POST /api/farm/register              → Register a new farm
GET  /api/alerts/{user_id}/history   → Alert history
```

Full documentation: [`docs/api_reference.md`](docs/api_reference.md)

---

## 👥 Team

Built in 48 hours at AI Hackathon by a team of 5.

| Role | Responsibilities |
|------|-----------------|
| Data Engineer | Satellite pipeline, GEE, SAR processing |
| Backend Dev | FastAPI, Claude API integration, MongoDB |
| Frontend Dev | React dashboard, Leaflet maps, Recharts |
| AI Engineer | Prompts, anomaly detection, zone scoring |
| Pitch & Validation | Farmer interviews, landing page, pitch deck |

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

> *Powered by ESA Copernicus — free satellite data for all humanity.*
> *Built for Morocco's 1.4 million farmers.*
