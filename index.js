import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'crypto';
import { buildPrompt } from './prompt.js';
import {
  DEFAULT_OPENROUTER_MODEL,
  generateReportWithLLM,
  maskApiKey,
} from './llm.js';
import { formatReportResponse } from './formatter.js';

const OPENROUTER_AUTH_URL = 'https://openrouter.ai/api/v1/auth/key';
const REQUEST_TIMEOUT_MS = 15_000;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

function validateFarmPayload(payload) {
  const requiredFields = ['farm_id', 'user_id', 'satellite', 'weather'];
  return requiredFields.filter((field) => payload?.[field] === undefined || payload?.[field] === null);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function validateOpenRouterApiKeyForStartup() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    return {
      valid: false,
      message: '❌ OPENROUTER_API_KEY is MISSING. Create .env file with your key from https://openrouter.ai/keys',
    };
  }

  if (!apiKey.startsWith('sk-or-')) {
    return {
      valid: false,
      message: '❌ OPENROUTER_API_KEY is INVALID. Check it at https://openrouter.ai/keys',
    };
  }

  try {
    const response = await fetchWithTimeout(OPENROUTER_AUTH_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agricopilot-ai.com',
        'X-Title': 'AgriCopilot AI',
      },
    });

    if (response.ok) {
      return {
        valid: true,
        message: `✅ OpenRouter API key loaded and valid (${maskApiKey(apiKey)})`,
      };
    }

    return {
      valid: false,
      message: '❌ OPENROUTER_API_KEY is INVALID. Check it at https://openrouter.ai/keys',
    };
  } catch (error) {
    return {
      valid: false,
      message: `⚠️ OPENROUTER_API_KEY could not be validated now: ${error.message}`,
    };
  }
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AgriCopilot AI is running. Use POST /generate-report.',
  });
});

app.post('/generate-report', async (req, res) => {
  try {
    console.log('🌾 Received report generation request');

    const missingFields = validateFarmPayload(req.body);
    if (missingFields.length > 0) {
      console.warn(`⚠️ Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missing_fields: missingFields,
      });
    }

    const reportId = randomUUID();
    const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
    const prompt = buildPrompt(req.body);

    console.log(`🤖 Calling OpenRouter with preferred model: ${model}`);
    const llmResult = await generateReportWithLLM(prompt, model);

    const response = formatReportResponse({
      reportId,
      farmData: req.body,
      reportText: llmResult.report,
      model: llmResult.model,
      tokensUsed: llmResult.tokensUsed,
    });

    console.log(`✅ Report generated successfully with model ${llmResult.model}: ${reportId}`);
    return res.status(200).json(response);
  } catch (error) {
    console.error(`❌ Failed to generate report: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      details: error.message,
    });
  }
});

const startupValidation = await validateOpenRouterApiKeyForStartup();
console.log(startupValidation.message);

if (!startupValidation.valid) {
  console.warn('⚠️ Server will still start, but /generate-report will fail until OPENROUTER_API_KEY is fixed.');
}

app.listen(PORT, () => {
  console.log('🌾 AgriCopilot AI startup');
  console.log(`🔍 Working directory: ${process.cwd()}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
