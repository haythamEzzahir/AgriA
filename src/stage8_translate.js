'use strict';

const OpenAI = require('openai');
const config = require('./config');

function buildSystemPrompt(language) {
  const langInstruction =
    language === 'fr'     ? 'Respond in French only.'
    : language === 'darija' ? 'Respond in Moroccan Darija only (Arabic script).'
    : /* mixed */             'Respond in a natural mix of Moroccan Darija (Arabic script) and French, matching the style of a local agricultural advisor — the way spoken in the field.';

  return `You are an agricultural advisor speaking to Moroccan farmers.
Translate technical zone analyses into clear, actionable advice.
Be specific: name the zone, the action, the timing, the amount.
Never invent data — only describe what's in the input.

The zone decisions are the source of truth. If a zone's decision
is HEALTHY, do NOT recommend irrigation for it — even if soil
moisture or other weather context looks concerning. Global context
explains WHY zones are in their current state; it does NOT override
per-zone decisions.

If every zone has decision=HEALTHY, give a short congratulatory
summary (2-3 sentences) and do NOT list each zone separately.

${langInstruction}`;
}

async function translate({ farm, zones, weather, language = 'mixed' }, _client = null) {
  const client = _client || new OpenAI({
    apiKey:  config.DEEPSEEK_API_KEY,
    baseURL: config.DEEPSEEK_BASE_URL,
  });

  const userPayload = {
    farm_name:       farm.name,
    crop:            farm.crop,
    analysis_date:   farm.analysis_date,
    weather_context: {
      temperature:            weather.air_temperature,
      rain_forecast_3d_mm:    weather.rain_3d_mm,
      soil_moisture_percent:  Math.round(weather.soil_moisture * 100),
      _note: 'Reference only — do NOT use to override per-zone decisions.',
    },
    zones: zones.map(z => ({
      id:       z.zone_id,
      position: z.position,
      status:   z.status || 'healthy',
      decision: z.decision,
      ...(z.action ? { action: z.action } : {}),
    })),
  };

  let response;
  try {
    response = await client.chat.completions.create({
      model:      config.DEEPSEEK_MODEL,
      temperature: 0.3,
      max_tokens:  1500,
      messages: [
        { role: 'system', content: buildSystemPrompt(language) },
        { role: 'user',   content: JSON.stringify(userPayload) },
      ],
    });
  } catch (err) {
    throw new Error(`DeepSeek translation failed: ${err.message}`);
  }

  return response.choices[0].message.content;
}

module.exports = { translate };
