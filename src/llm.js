const axios = require("axios");

const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const DEFAULT_OPENROUTER_FALLBACK_MODELS = [];

function parseModelList(value) {
  return value
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean) || [];
}

function getModelCandidates() {
  return [
    process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    ...parseModelList(process.env.OPENROUTER_FALLBACK_MODELS),
    ...DEFAULT_OPENROUTER_FALLBACK_MODELS,
  ].filter((model, index, models) => models.indexOf(model) === index);
}

async function generateReport(prompt) {
  const failures = [];

  for (const model of getModelCandidates()) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AgriCopilot AI",
          },
          timeout: 30000,
        }
      );

      const report = response.data?.choices?.[0]?.message?.content?.trim();
      if (report) {
        return report;
      }

      failures.push(`${model}: empty response`);
    } catch (error) {
      const detail = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      console.error(`OpenRouter model failed (${model}):`, detail);
      failures.push(`${model}: ${detail}`);
    }
  }

  throw new Error(`LLM generation failed. ${failures.join(" | ")}`);
}

module.exports = generateReport;
