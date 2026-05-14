import { config } from '../config/index.js';

const BASE_URL = 'https://openrouter.ai/api/v1';

export async function queryAI(context, question) {
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

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openRouter.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openRouter.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);

  const data = await res.json();
  return data.choices[0].message.content;
}
