# AgriCopilot AI

AgriCopilot AI is a Node.js Express API for generating farmer-friendly multilingual reports from farm JSON data. It uses OpenRouter with free-model fallbacks and returns both a text report and structured JSON metadata.

## Features

- Express HTTP server
- `POST /generate-report` endpoint
- Native `fetch`, no axios
- OpenRouter API integration
- Automatic model fallbacks
- Live free-model backup discovery
- ES Modules
- Environment variables with `dotenv`
- Multilingual reports: `darija`, `arabic`, `french`, `english`

## Requirements

- Node.js 18 or newer
- OpenRouter API key

## Quick Setup

Install dependencies:

```bash
npm install
```

Create your local `.env` file:

```bash
copy .env.example .env
```

Open `.env` and paste your OpenRouter key:

```env
OPENROUTER_API_KEY=sk-or-v1-your_real_key_here
OPENROUTER_MODEL=openrouter/free
PORT=3000
```

Verify setup before starting the server:

```bash
node check-setup.js
```

Start the server:

```bash
npm start
```

The server runs at:

```text
http://localhost:3000
```

## Test the API

In one terminal, start the server:

```bash
npm start
```

In another terminal, run:

```bash
npm test
```

The test script reads `test-data.json`, sends it to `/generate-report`, and prints the API response.

You can also test manually on Windows:

```bash
curl -X POST http://localhost:3000/generate-report ^
  -H "Content-Type: application/json" ^
  -d @test-data.json
```

On macOS or Linux:

```bash
curl -X POST http://localhost:3000/generate-report \
  -H "Content-Type: application/json" \
  -d @test-data.json
```

## Generate a Report

Send a POST request to:

```text
POST http://localhost:3000/generate-report
```

Required fields:

- `farm_id`
- `user_id`
- `satellite`
- `weather`

Example request body:

```json
{
  "farm_id": "farm_001",
  "user_id": "user_ahmed_123",
  "location": "Oujda, Maroc",
  "crop_type": "tomate",
  "language": "darija",
  "date": "2026-05-14",
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

## Response Format

```json
{
  "success": true,
  "report": "PART 1 - DETECTION: ... PART 2 - ADVICE: ...",
  "data": {
    "report_id": "uuid-generated",
    "farm_id": "farm_001",
    "user_id": "user_ahmed_123",
    "created_at": "ISO timestamp",
    "satellite": {},
    "weather": {},
    "metadata": {
      "language": "darija",
      "crop_type": "tomate",
      "location": "Oujda, Maroc",
      "llm_model": "openrouter/free",
      "tokens_used": 0
    }
  }
}
```

## Report Rules

The AI report always contains exactly two parts:

```text
PART 1 - DETECTION
PART 2 - ADVICE
```

The final report must be simple and farmer-friendly. It must not use technical words like `NDVI` or `NDWI`.

Supported report languages:

- `darija`
- `arabic`
- `french`
- `english`

## Smart Farmer Communication Flow

The frontend includes a free demo-only smart communication simulation on the AI Assistant page. It does not use Twilio, paid phone APIs, or any backend calling service.

Flow:

1. The user clicks `📞 الاتصال بالفلاح`.
2. The UI shows `📞 جاري الاتصال بالفلاح...` with a ringing phone animation for 5 seconds.
3. The frontend randomly simulates one of two outcomes:
   - `الفلاح جاوب`: the browser reads the agriculture report aloud during the fake call.
   - `الفلاح ماجاوبش`: the UI shows `🎤 جاري إرسال رسالة صوتية ذكية...` and reads the same report aloud as a smart voice message.
4. After the voice finishes, the frontend always sends the written follow-up report and displays `📩 تم إرسال التقرير للفلاح`.
5. The farmer message preview uses Moroccan Darija written in Arabic letters:

```text
📌 الملاحظة
الطماطم باينة محتاجة شوية ديال الما والتراب ناشف.

🌱 النصيحة
من الأحسن تسقي بكري فالصباح ولا مع العشية.
```

The demo also includes:

- `🔊 إعادة الاستماع للنصيحة`
- `📧 إرسال عبر الإيميل`
- `📱 إرسال كرسالة`

All voice playback uses the browser's free `SpeechSynthesis` API. Email and message sending are UI simulations only.

## 🚨 Troubleshooting

### Get an OpenRouter API Key

1. Go to `https://openrouter.ai/keys`.
2. Sign in or create an account.
3. Click the button to create a new key. Screenshot description: the page shows an API keys table and a create-key button near the top; after creation, OpenRouter shows a key beginning with `sk-or-v1-`.
4. Copy the key immediately.
5. Paste it in `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-your_real_key_here
```

Never paste the key in `README.md`, terminal history screenshots, Git commits, or chat messages.

### Run the Setup Checker

Run this once after editing `.env`:

```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, Leaflet.js, Chart.js |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Satellite | AgroMonitoring API |
| Weather | OpenWeather API |
| AI | OpenRouter (Claude/Mistral) |

## Team Roles

- **R1**: Team Lead + Full Stack
- **R2**: Frontend (Map & Visualization)
- **R3**: Frontend (Dashboard & UX)
- **R4**: AI Integration
- **R5**: Marketplace
- **R6**: Auth, DevOps & QA
