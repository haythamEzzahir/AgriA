import 'dotenv/config';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const REQUEST_TIMEOUT_MS = 30_000;

export const FALLBACK_MODELS = [
  'openrouter/free',
  'deepseek/deepseek-chat:free',
  'deepseek/deepseek-r1:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
];

export const DEFAULT_OPENROUTER_MODEL = FALLBACK_MODELS[0];

let cachedFreeModels = [];
let freeModelsReady = Promise.resolve([]);

export function maskApiKey(apiKey) {
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

export function getOpenRouterApiKey({ throwOnInvalid = true } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    const message = '❌ OPENROUTER_API_KEY is MISSING. Create .env file with your key from https://openrouter.ai/keys';
    if (throwOnInvalid) {
      throw new Error(message);
    }
    return null;
  }

  if (!apiKey.startsWith('sk-or-')) {
    const message = '❌ OPENROUTER_API_KEY is INVALID. Check it at https://openrouter.ai/keys';
    if (throwOnInvalid) {
      throw new Error(message);
    }
    return null;
  }

  return apiKey;
}

function validateApiKeyAtModuleLoad() {
  const apiKey = getOpenRouterApiKey({ throwOnInvalid: false });

  if (!apiKey) {
    console.warn('❌ OPENROUTER_API_KEY is missing or malformed. /generate-report will fail until .env is fixed.');
    return;
  }

  console.log(`🔍 OpenRouter API key loaded (${maskApiKey(apiKey)})`);
}

function buildOpenRouterHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://agricopilot-ai.com',
    'X-Title': 'AgriCopilot AI',
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonSafely(response) {
  const text = await response.text();

  if (!text) {
    return { text, data: null };
  }

  try {
    return { text, data: JSON.parse(text) };
  } catch {
    return { text, data: null };
  }
}

function extractOpenRouterError(status, text, data) {
  return data?.error?.message || data?.message || text || `HTTP ${status}`;
}

function uniqueModels(models) {
  return [...new Set(models.filter(Boolean))];
}

function getConfiguredModels() {
  return uniqueModels([
    process.env.OPENROUTER_MODEL?.trim(),
    ...FALLBACK_MODELS,
    ...cachedFreeModels,
  ]);
}

export async function fetchFreeOpenRouterModels(apiKey = getOpenRouterApiKey()) {
  try {
    console.log('🔍 Fetching live OpenRouter free model list...');

    const response = await fetchWithTimeout(OPENROUTER_MODELS_URL, {
      method: 'GET',
      headers: buildOpenRouterHeaders(apiKey),
    });
    const { text, data } = await readJsonSafely(response);

    if (!response.ok) {
      const detail = extractOpenRouterError(response.status, text, data);
      throw new Error(`OpenRouter models request failed: ${detail}`);
    }

    const freeModels = Array.isArray(data?.data)
      ? data.data
          .map((model) => model?.id)
          .filter((id) => typeof id === 'string' && id.endsWith(':free'))
      : [];

    cachedFreeModels = uniqueModels(freeModels);
    console.log(`✅ Live free model backup ready (${cachedFreeModels.length} models)`);
    return cachedFreeModels;
  } catch (error) {
    console.warn(`⚠️ Could not fetch live free models: ${error.message}`);
    return [];
  }
}

async function callOpenRouterCompletion({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature }) {
  const response = await fetchWithTimeout(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const { text, data } = await readJsonSafely(response);

  if (!response.ok) {
    const detail = extractOpenRouterError(response.status, text, data);
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function generateReportWithLLM(prompt, model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL) {
  const apiKey = getOpenRouterApiKey();
  await freeModelsReady.catch(() => []);

  const systemPrompt =
    'You generate simple farmer-friendly farm reports in the requested language: darija, arabic, french, or english. Never include technical index names in the final report.';
  const modelsToTry = uniqueModels([model, ...getConfiguredModels()]);
  const errors = [];

  console.log(`🌾 Starting report generation with ${modelsToTry.length} model option(s)`);

  for (const candidateModel of modelsToTry) {
    try {
      console.log(`🤖 Trying OpenRouter model: ${candidateModel}`);

      const data = await callOpenRouterCompletion({
        apiKey,
        model: candidateModel,
        systemPrompt,
        userPrompt: prompt,
        maxTokens: 800,
        temperature: 0.7,
      });

      const report = data?.choices?.[0]?.message?.content?.trim();
      if (!report) {
        throw new Error('OpenRouter returned an empty report.');
      }

      const succeededModel = data?.model || candidateModel;
      console.log(`✅ OpenRouter model succeeded: ${succeededModel}`);

      return {
        report,
        model: succeededModel,
        requestedModel: candidateModel,
        tokensUsed: data?.usage?.total_tokens || 0,
      };
    } catch (error) {
      const status = error.status ? `HTTP ${error.status}` : 'network/error';
      errors.push(`${candidateModel}: ${status} ${error.message}`);

      if (error.status === 404) {
        console.warn(`🔄 Model not found: ${candidateModel}. Trying next fallback...`);
        continue;
      }

      if (error.status === 401 || error.status === 403) {
        console.error(`❌ OpenRouter rejected the API key (${maskApiKey(apiKey)}). Check https://openrouter.ai/keys`);
        throw new Error('OPENROUTER_API_KEY is INVALID. Check it at https://openrouter.ai/keys');
      }

      console.warn(`🔄 Model failed: ${candidateModel} (${status}). Trying next fallback...`);
    }
  }

  throw new Error(`❌ All OpenRouter models failed. Tried: ${errors.join(' | ')}`);
}

validateApiKeyAtModuleLoad();

const startupApiKey = getOpenRouterApiKey({ throwOnInvalid: false });
if (startupApiKey) {
  freeModelsReady = fetchFreeOpenRouterModels(startupApiKey);
}
