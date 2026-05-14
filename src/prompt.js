function buildPrompt(data) {
  return `
You are an agricultural AI assistant.

Farm Data:
- NDVI: ${data.ndvi}
- Soil Moisture: ${data.soil_moisture}
- Temperature: ${data.temperature}
- Humidity: ${data.humidity}
- Rain Forecast: ${data.rain_forecast}

Generate:
1. Detection report
2. Recommendations

Language: ${data.language}
`;
}

module.exports = buildPrompt;