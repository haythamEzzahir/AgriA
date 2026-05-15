# OpenRouter Auth Fix

## What was wrong

The root LLM service was not consistently using OpenRouter credentials. `index.js` referred to OpenRouter, but `llm.js` was loading and calling DeepSeek with `DEEPSEEK_API_KEY`. That mismatch can leave the OpenRouter request without a valid `Authorization` header and trigger:

```text
Failed to generate report: Missing Authentication header
```

The local diagnostic also showed that the current `.env` contains `DEEPSEEK_API_KEY`, but not `OPENROUTER_API_KEY`.

## What changed

- Added `check-env.js` to diagnose `.env` loading from the current working directory.
- Updated `llm.js` so `import "dotenv/config";` is the first statement.
- Updated `llm.js` to validate `OPENROUTER_API_KEY` before making any OpenRouter request.
- Updated the OpenRouter fetch headers to include:

```js
{
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "https://agricopilot-ai.com",
  "X-Title": "AgriCopilot AI",
}
```

- Updated `index.js` so dotenv is loaded before all other imports.
- Added startup validation against `https://openrouter.ai/api/v1/auth/key`.
- Logs now distinguish missing, invalid/rejected, and valid API keys while masking the key.

## How to verify

Run:

```bash
node check-env.js
```

Expected result:

```text
✅ OPENROUTER_API_KEY is defined
🔍 Starts with sk-or-v1-: yes
```

Your `.env` should contain:

```env
OPENROUTER_API_KEY=sk-or-v1-your_real_key_here
OPENROUTER_MODEL=deepseek/deepseek-chat
PORT=3000
```

Then start the service:

```bash
npm start
```

Expected startup log:

```text
✅ OpenRouter API key loaded and valid
```
