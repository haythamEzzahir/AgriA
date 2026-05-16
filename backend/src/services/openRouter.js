import { config } from '../config/index.js';

const BASE_URL = 'https://openrouter.ai/api/v1';
const REQUEST_TIMEOUT_MS = 30000;

function getModelCandidates() {
  return [
    config.openRouter.model,
    ...config.openRouter.fallbackModels,
  ].filter((model, index, models) => model && models.indexOf(model) === index);
}

function getErrorMessage(status, responseText, data) {
  return data?.error?.message || data?.message || responseText || `OpenRouter error: ${status}`;
}

export async function queryAI(context, question) {
  if (!config.openRouter.apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const systemPrompt = `You are an AI Agricultural Assistant for Moroccan farmers.
Answer in simple, clear language. Use French, Darija, or English based on the question.
You receive processed farm data - never mention raw satellite indices.
Provide actionable advice about irrigation, fertilization, pest control, and planting.`;

  const userPrompt = `Here is the current farm status:
- Farm: ${context.farm_name}
- Crop Health: ${context.crop_health}
- Soil Moisture: ${context.soil_moisture}
- Temperature: ${context.temperature}
- Active Alerts: ${context.alerts.length > 0 ? context.alerts.join(', ') : 'None'}

Farmer's question: ${question}

Provide a helpful, practical response.`;

  const failures = [];

  for (const model of getModelCandidates()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openRouter.apiKey}`,
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'AgriCopilot Backend',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      const responseText = await res.text();
      let data = null;

      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (error) {
        failures.push(`${model}: invalid JSON response (${error.message})`);
        continue;
      }

      if (!res.ok) {
        failures.push(`${model}: ${getErrorMessage(res.status, responseText, data)}`);
        continue;
      }

      const answer = data?.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        failures.push(`${model}: empty response`);
        continue;
      }

      return answer;
    } catch (error) {
      const detail = error.name === 'AbortError'
        ? `request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
        : error.message;

      failures.push(`${model}: ${detail}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`All OpenRouter models failed. ${failures.join(' | ')}`);
}
