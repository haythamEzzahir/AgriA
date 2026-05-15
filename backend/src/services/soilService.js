import { config } from '../config/index.js';

const AGRO_BASE = 'https://api.agromonitoring.com/2.0';

async function fetchFromAgroMonitoring(polygon) {
  const url = `${AGRO_BASE}/soil?appid=${config.agroMonitoring.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      polygon: typeof polygon === 'string' ? JSON.parse(polygon) : polygon,
    }),
  });
  if (!res.ok) throw new Error(`AgroMonitoring soil error: ${res.status}`);
  return res.json();
}

const SOIL_TYPES_BY_REGION = {
  '33.5': { type: 'Clay Loam', texture: 'loam', drainage: 'moderate', base_n: 35, base_p: 14, base_k: 180, base_om: 2.2 },
  '31.6': { type: 'Silty Clay', texture: 'clay', drainage: 'slow', base_n: 28, base_p: 10, base_k: 220, base_om: 1.8 },
  '30.4': { type: 'Sandy Loam', texture: 'loam', drainage: 'well', base_n: 20, base_p: 8, base_k: 130, base_om: 1.2 },
  '34.0': { type: 'Loam', texture: 'loam', drainage: 'moderate', base_n: 30, base_p: 12, base_k: 160, base_om: 2.0 },
  default: { type: 'Loam', texture: 'loam', drainage: 'moderate', base_n: 25, base_p: 10, base_k: 150, base_om: 1.8 },
};

const PH_RANGES_BY_CROP = {
  wheat: [6.0, 7.0],
  olives: [6.5, 8.0],
  corn: [5.8, 7.0],
  tomatoes: [6.0, 6.8],
  peppers: [6.0, 6.8],
  grapes: [5.5, 7.0],
  argan: [6.0, 8.0],
  carrots: [5.5, 7.0],
  default: [6.0, 7.5],
};

function estimateSoilData({ ndvi, ndwi, temperature, humidity, rainfall, lat, lon, crops }) {
  const ndviNorm = ndvi != null ? Math.min(1, Math.max(0, ndvi)) : 0.5;
  const ndwiNorm = ndwi != null ? Math.min(1, Math.max(0, ndwi)) : 0.3;

  const latKey = lat ? `${lat.toFixed(1)}` : 'default';
  const region = SOIL_TYPES_BY_REGION[latKey] || SOIL_TYPES_BY_REGION.default;

  const crop = crops?.[0]?.toLowerCase();
  const phRange = PH_RANGES_BY_CROP[crop] || PH_RANGES_BY_CROP.default;
  const ph = +(phRange[0] + (phRange[1] - phRange[0]) * (0.4 + ndviNorm * 0.2)).toFixed(1);

  const fertilityFactor = 0.6 + ndviNorm * 0.4;

  const soilMoisture = ndwiNorm !== null
    ? +(ndwiNorm * 0.7 + ((humidity ?? 50) / 100) * 0.3).toFixed(2)
    : +((humidity ?? 50) / 100 * 0.6).toFixed(2);

  const soilTemperature = temperature != null
    ? +(temperature - 2.5).toFixed(1)
    : 25;

  const nitrogen = Math.round(region.base_n * fertilityFactor);
  const phosphorus = Math.round(region.base_p * fertilityFactor);
  const potassium = Math.round(region.base_k * fertilityFactor);
  const organicMatter = +(region.base_om * fertilityFactor).toFixed(1);

  const drainage = soilMoisture > 0.4 ? 'slow'
    : soilMoisture > 0.25 ? 'moderate'
    : 'well';

  const status = soilMoisture > 0.25 && ndviNorm > 0.4 ? 'healthy'
    : soilMoisture > 0.15 ? 'fair'
    : 'dry';

  return {
    soil_moisture: soilMoisture,
    soil_temperature: soilTemperature,
    ph,
    nitrogen,
    phosphorus,
    potassium,
    organic_matter: organicMatter,
    soil_type: region.type,
    texture: region.texture,
    drainage,
    depth: 120,
    status,
  };
}

export async function getSoilData({ polygon, lat, lon, ndviData, weatherData, crops }) {
  if (config.agroMonitoring.apiKey) {
    try {
      const agroData = await fetchFromAgroMonitoring(polygon);
      return {
        soil_moisture: +(agroData.moisture ?? 0).toFixed(2),
        soil_temperature: +(agroData.temperature ?? 25).toFixed(1),
        ...estimateSoilData({
          ndvi: ndviData?.ndvi,
          ndwi: ndviData?.ndwi,
          temperature: agroData.temperature ?? ndviData?.temperature,
          humidity: weatherData?.[0]?.humidity,
          rainfall: weatherData?.[0]?.rain,
          lat, lon, crops,
        }),
      };
    } catch (err) {
      console.warn('AgroMonitoring soil API failed, using estimation:', err.message);
    }
  }

  const humidity = weatherData?.[0]?.humidity;
  const temp = weatherData?.[0]?.temp ?? ndviData?.temperature;

  return estimateSoilData({
    ndvi: ndviData?.ndvi,
    ndwi: ndviData?.ndwi,
    temperature: temp,
    humidity,
    rainfall: weatherData?.[0]?.rain,
    lat, lon, crops,
  });
}
