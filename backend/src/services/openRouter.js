import { config } from '../config/index.js';

const BASE_URL = 'https://openrouter.ai/api/v1';

export async function queryAI(context, question) {
  const systemPrompt = `You are an AI Agricultural Assistant for Moroccan farmers.
Answer in simple, clear language. Use French, Darija (Arabic script), or English depending on the question.
Always use the farm's specific data below — never give generic advice when the data is provided.
Be concrete: name the zone, the crop, the amount, the timing. Reference the satellite date when relevant.
Never invent numbers — only describe what's in the input data.`;

  const farmBlock = `=== FARM PROFILE ===
Name: ${context.farm_name}
Region: ${context.region}
Crops: ${context.crops.length ? context.crops.join(', ') : 'unknown'}
Size: ${context.farm_size}
Irrigation method: ${context.irrigation}
Water access: ${context.water_access}`;

  const sensorBlock = `=== CURRENT CONDITIONS ${context.satellite_date ? `(Sentinel-2 · ${new Date(context.satellite_date).toLocaleDateString('en-GB')})` : ''} ===
NDVI (vegetation health): ${context.ndvi_status}
NDWI (water content): ${context.ndwi_status}
Soil moisture: ${context.soil_moisture}
Air temperature: ${context.air_temperature}
Rain forecast (3 days): ${context.rain_3d_mm}
Reference evapotranspiration: ${context.et0_mm_per_day}`;

  const zonesBlock = `=== ZONE ANALYSIS ===
Healthy: ${context.zone_counts.healthy} · Moderate: ${context.zone_counts.moderate} · Stressed: ${context.zone_counts.stressed} · Critical: ${context.zone_counts.critical}
Priority action: ${context.priority_action}
${context.stressed_zones.length ? `Stressed/critical zones:\n  - ${context.stressed_zones.join('\n  - ')}` : 'No stressed zones.'}
${context.irrigation_plan.length ? `Irrigation plan:\n  - ${context.irrigation_plan.join('\n  - ')}` : ''}
${context.total_water_needed_liters > 0 ? `Total water needed: ${context.total_water_needed_liters.toLocaleString()} L` : ''}`;

  const alertsBlock = context.alerts.length
    ? `=== ACTIVE ALERTS ===\n${context.alerts.map((a) => `- ${a}`).join('\n')}`
    : '';

  const userPrompt = `${farmBlock}\n\n${sensorBlock}\n\n${zonesBlock}\n${alertsBlock}\n\n=== QUESTION ===\n${question}\n\nProvide a helpful, practical, farm-specific response.`;

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
