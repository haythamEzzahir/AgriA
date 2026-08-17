# 🌱 AgriA — AI Agricultural Copilot

> **An AI-powered agricultural assistant helping farmers make smarter irrigation and crop-management decisions using satellite imagery, weather data, and multilingual AI.**

🔗 **Live Demo:** [https://agri-a-puce.vercel.app](https://agri-a-puce.vercel.app)

AgriA is a smart agriculture platform designed to transform complex agricultural and satellite data into **simple, actionable recommendations for farmers**.

The platform combines **satellite imagery, weather conditions, AI-generated insights, interactive maps, and multilingual communication** to help farmers monitor their fields, detect potential water stress, and make better irrigation decisions.

---

## 🎯 The Problem

Farmers often have access to large amounts of agricultural data, but turning that data into useful decisions can be difficult.

Traditional agricultural monitoring can be:

* 📊 Too technical
* 🛰️ Difficult to interpret
* 💧 Reactive rather than predictive
* 🌍 Not adapted to local farming conditions
* 🗣️ Difficult to access for farmers who are more comfortable with Darija or Arabic

### Our approach

AgriA acts as an **AI agricultural copilot** that transforms raw environmental and satellite data into information that farmers can actually understand and use.

**Complex data → AI analysis → Simple agricultural recommendation**

---

## 🚀 Key Features

### 🛰️ Satellite-Based Farm Monitoring

AgriA uses satellite data to monitor agricultural fields and identify potential areas of crop or water stress.

The platform can analyze indicators such as:

* Vegetation health
* Water conditions
* Soil moisture
* Surface temperature

The technical indicators remain behind the scenes while the farmer receives a simple explanation.

---

### 💧 Intelligent Irrigation Recommendations

AgriA combines satellite observations with weather information to help determine whether irrigation may be necessary.

The system considers:

* Current field conditions
* Soil moisture
* Temperature
* Humidity
* Rain forecasts
* Crop type

The result is an understandable recommendation rather than a technical data dump.

---

### 🤖 AI Agricultural Assistant

The AI assistant converts farm data into a structured agricultural report containing two sections:

**1. Detection**

What is happening in the field?

**2. Advice**

What should the farmer consider doing?

The AI is specifically instructed to avoid technical terminology and communicate in a farmer-friendly way.

---

### 🌍 Multilingual AI

AgriA supports:

* 🇲🇦 Moroccan Darija
* 🇸🇦 Arabic
* 🇫🇷 French
* 🇬🇧 English

This makes the platform accessible to different types of users while keeping the same agricultural intelligence underneath.

---

### 🗺️ Interactive Farm Dashboard

The dashboard provides a visual overview of the farm, including:

* Farm location
* Satellite information
* Environmental conditions
* Water-related indicators
* Crop information
* Weather data
* AI recommendations

The goal is to make agricultural monitoring understandable at a glance.

---

### 📈 Agricultural Data Visualization

AgriA transforms raw measurements into visual information that helps users understand how their farm is evolving.

The dashboard can display:

* Environmental trends
* Farm health indicators
* Weather evolution
* Water conditions
* Weekly reports

---

### 🗣️ Farmer Communication

The platform includes a demonstration of a **voice-first communication experience** designed for farmers.

The AI-generated recommendation can be:

* 🔊 Read aloud
* 📩 Presented as a written report
* 📧 Prepared for email communication
* 📱 Presented as a mobile-message notification

The prototype uses browser-based speech synthesis to demonstrate the experience without requiring paid communication APIs.

---

# 🏗️ System Architecture

AgriA follows a modular architecture connecting the user interface, backend services, external data providers, database, and AI layer.

```text
                         ┌─────────────────────┐
                         │      AgriA UI       │
                         │ React + Tailwind    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Express API      │
                         │    Node.js Backend  │
                         └──────┬──────┬───────┘
                                │      │
                    ┌───────────┘      └────────────┐
                    ▼                              ▼
          ┌──────────────────┐            ┌─────────────────┐
          │ Agricultural Data│            │   AI Service    │
          │                  │            │   OpenRouter    │
          │ Satellite        │            │   LLM Models   │
          │ Weather          │            └─────────────────┘
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │    Supabase      │
          │   PostgreSQL     │
          └──────────────────┘
```

---

# 🧠 AI Pipeline

The AI reporting pipeline follows a simple process:

```text
Farm Data
    │
    ▼
Satellite + Weather Analysis
    │
    ▼
Agricultural Context
    │
    ▼
LLM Processing
    │
    ▼
Detection
    │
    ▼
Farmer-Friendly Advice
    │
    ▼
Multilingual Report
```

The AI layer uses **OpenRouter** and supports model fallback mechanisms to improve reliability.

---

# 🔌 Backend API

The backend exposes a REST API for generating agricultural reports.

### `POST /generate-report`

Generates an AI-powered agricultural report from farm, satellite, and weather data.

### Example Request

```json
{
  "farm_id": "farm_001",
  "user_id": "user_001",
  "location": "Oujda, Morocco",
  "crop_type": "tomato",
  "language": "darija",
  "satellite": {
    "ndvi": 0.22,
    "ndwi": 0.15,
    "soil_moisture": 0.18,
    "surface_temp": 38.5
  },
  "weather": {
    "temperature": 39,
    "humidity": 25,
    "rain_forecast": "none"
  }
}
```

### Example AI Output

```text
PART 1 - DETECTION

The tomatoes appear to be experiencing water stress
and the soil is relatively dry.

PART 2 - ADVICE

Consider irrigating early in the morning or later
in the afternoon, while monitoring the field closely.
```

The AI response is also returned with structured metadata such as:

* Report ID
* Farm ID
* User ID
* Creation timestamp
* Crop type
* Location
* Language
* AI model used

---

# 🛠️ Technology Stack

| Layer          | Technology           |
| -------------- | -------------------- |
| Frontend       | React                |
| Styling        | Tailwind CSS         |
| Maps           | Leaflet.js           |
| Charts         | Chart.js             |
| Backend        | Node.js + Express    |
| Database       | Supabase PostgreSQL  |
| Authentication | Supabase Auth        |
| Satellite Data | AgroMonitoring API   |
| Weather Data   | OpenWeather API      |
| AI             | OpenRouter           |
| Languages      | JavaScript / Node.js |
| Architecture   | REST API             |

---

# 🔐 Engineering Practices

The project was designed with several software-engineering principles in mind:

* RESTful API architecture
* Environment-based configuration
* API key protection through environment variables
* Modular backend structure
* External API integration
* AI model fallback handling
* Structured JSON responses
* Multilingual prompt design
* Frontend/backend separation
* Error handling and validation

---

# 👥 Team & Responsibilities

AgriA was developed as a collaborative project with responsibilities divided across different areas.

| Role   | Responsibility                       |
| ------ | ------------------------------------ |
| **R1** | Team Lead & Full Stack Development   |
| **R2** | Frontend — Maps & Data Visualization |
| **R3** | Frontend — Dashboard & UX            |
| **R4** | AI Integration & LLM Pipeline        |
| **R5** | Marketplace                          |
| **R6** | Authentication, DevOps & QA          |

---

# 🌾 Why AgriA?

AgriA is more than a dashboard.

It explores how **AI + Earth observation + weather intelligence** can be combined to create practical tools for agriculture.

The core idea is:

> **Turn complex agricultural data into decisions that farmers can understand.**

---

# 📸 Product Preview

Add screenshots or GIFs here to showcase the project.

Recommended screenshots:

1. 🏠 Main dashboard
2. 🗺️ Interactive farm map
3. 📊 Agricultural analytics
4. 🤖 AI assistant
5. 💧 Irrigation recommendation
6. 🌍 Language selection
7. 📱 Farmer communication interface

Example:

```text
/docs/screenshots/dashboard.png
/docs/screenshots/farm-map.png
/docs/screenshots/ai-assistant.png
/docs/screenshots/mobile-view.png
```

---

# 🚀 Getting Started

## Prerequisites

* Node.js 18+
* npm
* Supabase project
* OpenRouter API key
* AgroMonitoring API credentials
* OpenWeather API key

## Installation

```bash
git clone <repository-url>

cd agria

npm install
```

Create a `.env` file:

```env
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=openrouter/free
PORT=3000
```

Start the development server:

```bash
npm start
```

The API will be available at:

```text
http://localhost:3000
```

---

# 🔑 API Security

API keys should **never** be committed to Git.

Use environment variables and keep `.env` in `.gitignore`.

```text
.env
node_modules/
```

---

# 📌 Project Status

**Prototype / MVP**

AgriA currently demonstrates the complete concept from:

**Farm Data → Environmental Analysis → AI Interpretation → Farmer-Friendly Recommendation**

Future improvements could include:

* 📡 Real-time satellite updates
* 🌦️ More advanced weather forecasting
* 🤖 Predictive crop-health models
* 📱 Dedicated mobile application
* 🎙️ Real voice interaction with farmers
* 📞 Automated farmer communication
* 🧠 Personalized recommendations based on historical farm data
* 🏪 Agricultural marketplace integration

---

# 👨‍💻 Built With

**React · Node.js · Express · Supabase · Leaflet · Chart.js · OpenRouter · AgroMonitoring · OpenWeather**

---

## 🌱 AgriA

**AI-powered agricultural intelligence for smarter farming.**
