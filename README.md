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
node check-setup.js
```

The script checks:

- `.env` exists
- `OPENROUTER_API_KEY` is defined
- the key starts with `sk-or-v1-`
- OpenRouter accepts the key
- free models can be fetched
- a tiny `Hello` completion works

Every failing check prints a specific fix command or link.

### Common Windows Pitfalls

- `.env.txt`: Windows Notepad can create `.env.txt` while hiding file extensions. In File Explorer, enable `View > Show > File name extensions`, then rename it to `.env`.
- Wrong folder: run commands from the project root, the folder containing `package.json`. The server startup banner prints the working directory.
- Spaces around `=`: use `OPENROUTER_API_KEY=sk-or-v1-...`, not `OPENROUTER_API_KEY = sk-or-v1-...`.
- Quotes around the key: use the raw key without quotes.
- Extra spaces: do not add spaces before or after the key.
- Old variable name: use `OPENROUTER_API_KEY`, not `DEEPSEEK_API_KEY`.

### Error Messages

- `❌ OPENROUTER_API_KEY is MISSING. Create .env file with your key from https://openrouter.ai/keys`
  Create `.env` with `copy .env.example .env`, then paste your key.
- `❌ OPENROUTER_API_KEY is INVALID. Check it at https://openrouter.ai/keys`
  The key is missing, malformed, expired, revoked, or rejected by OpenRouter. Create a new key.
- `⚠️ Server will still start, but /generate-report will fail until OPENROUTER_API_KEY is fixed.`
  Startup continues so you can test non-LLM routes, but report generation will fail.
- `🔄 Model not found ... Trying next fallback...`
  One model returned 404. The app is self-healing and tries the next configured model.
- `❌ All OpenRouter models failed`
  The preferred model, built-in fallbacks, and live free-model backup did not produce a completion.
- `✅ OpenRouter API key loaded and valid (sk-or-v1-****1234)`
  The server validated your key. The real key is never logged.
