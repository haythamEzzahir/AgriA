import 'dotenv/config';
import { existsSync } from 'fs';
import { resolve } from 'path';

const OPENROUTER_AUTH_URL = 'https://openrouter.ai/api/v1/auth/key';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 20_000;
const FALLBACK_MODELS = [
  'openrouter/free',
  'deepseek/deepseek-chat:free',
  'deepseek/deepseek-r1:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
];

function maskApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return 'missing';
  }

  const trimmed = apiKey.trim();
  const last4 = trimmed.slice(-4).padStart(4, '*');

  if (trimmed.startsWith('sk-or-v1-')) {
    return `sk-or-v1-****${last4}`;
  }

  if (trimmed.startsWith('sk-or-')) {
    return `sk-or-****${last4}`;
  }

  return `****${last4}`;
}

function openRouterHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://agricopilot-ai.com',
    'X-Title': 'AgriCopilot AI',
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function printPass(message) {
  console.log(`✅ ${message}`);
}

function printFail(message, fix) {
  console.log(`❌ ${message}`);
  console.log(`🔧 Fix: ${fix}`);
}

async function checkAuth(apiKey) {
  try {
    const response = await fetchWithTimeout(OPENROUTER_AUTH_URL, {
      method: 'GET',
      headers: openRouterHeaders(apiKey),
    });

    if (response.ok) {
      printPass(`API key is valid (${maskApiKey(apiKey)})`);
      return true;
    }

    printFail('API key invalid.', 'Get a new one at https://openrouter.ai/keys and update OPENROUTER_API_KEY in .env');
    return false;
  } catch (error) {
    printFail(`Could not validate API key: ${error.message}`, 'Check your internet connection, then run: node check-setup.js');
    return false;
  }
}

async function checkFreeModels(apiKey) {
  try {
    const response = await fetchWithTimeout(OPENROUTER_MODELS_URL, {
      method: 'GET',
      headers: openRouterHeaders(apiKey),
    });
    const data = await readJsonSafely(response);

    if (!response.ok) {
      printFail('Could not fetch free models.', 'Check your API key at https://openrouter.ai/keys and try again');
      return [];
    }

    const freeModels = Array.isArray(data?.data)
      ? data.data.map((model) => model?.id).filter((id) => typeof id === 'string' && id.endsWith(':free'))
      : [];

    printPass(`Free models fetched: ${freeModels.length}`);
    return freeModels;
  } catch (error) {
    printFail(`Could not fetch free models: ${error.message}`, 'Check your internet connection, then run: node check-setup.js');
    return [];
  }
}

async function checkCompletion(apiKey, freeModels) {
  const modelsToTry = [...new Set([process.env.OPENROUTER_MODEL, ...FALLBACK_MODELS, ...freeModels].filter(Boolean))];

  for (const model of modelsToTry) {
    try {
      const response = await fetchWithTimeout(OPENROUTER_CHAT_URL, {
        method: 'POST',
        headers: openRouterHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 8,
          temperature: 0,
        }),
      });

      if (response.ok) {
        printPass(`Tiny completion worked with ${model}`);
        return true;
      }

      if (response.status !== 404) {
        const data = await readJsonSafely(response);
        const detail = data?.error?.message || data?.message || `HTTP ${response.status}`;
        printFail(`Tiny completion failed: ${detail}`, 'Check your OpenRouter account limits and API key at https://openrouter.ai/keys');
        return false;
      }
    } catch (error) {
      printFail(`Tiny completion failed: ${error.message}`, 'Check your internet connection and run: node check-setup.js');
      return false;
    }
  }

  printFail('Tiny completion failed because every fallback model returned 404.', 'Set OPENROUTER_MODEL=openrouter/free in .env or choose a free model from https://openrouter.ai/models');
  return false;
}

async function main() {
  console.log('🔍 AgriCopilot setup check');
  console.log(`🔍 Working directory: ${process.cwd()}`);

  const envPath = resolve(process.cwd(), '.env');
  const envExists = existsSync(envPath);
  if (envExists) {
    printPass('.env file found');
  } else {
    printFail('.env file not found.', 'Run: copy .env.example .env');
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (apiKey) {
    printPass(`OPENROUTER_API_KEY is defined (${maskApiKey(apiKey)})`);
  } else {
    printFail('OPENROUTER_API_KEY is not defined.', 'Run: copy .env.example .env, then paste your key from https://openrouter.ai/keys');
    process.exitCode = 1;
    return;
  }

  if (apiKey.startsWith('sk-or-v1-')) {
    printPass('OPENROUTER_API_KEY starts with sk-or-v1-');
  } else {
    printFail('OPENROUTER_API_KEY does not start with sk-or-v1-.', 'Get a new OpenRouter key at https://openrouter.ai/keys and paste it without quotes or spaces');
    process.exitCode = 1;
    return;
  }

  const keyValid = await checkAuth(apiKey);
  if (!keyValid) {
    process.exitCode = 1;
    return;
  }

  const freeModels = await checkFreeModels(apiKey);
  if (freeModels.length === 0) {
    process.exitCode = 1;
    return;
  }

  const completionOk = await checkCompletion(apiKey, freeModels);
  if (!completionOk) {
    process.exitCode = 1;
    return;
  }

  console.log('🌾 Setup looks ready. Next command: npm start');
}

main().catch((error) => {
  console.error(`❌ Setup check crashed: ${error.message}`);
  console.log('🔧 Fix: Check Node.js 18+ with: node -v');
  process.exitCode = 1;
});
