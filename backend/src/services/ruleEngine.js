import { supabase } from '../config/supabase.js';

export async function runRuleEngine(farmId, sensorData) {
  const alerts = [];

  if (sensorData.soil_moisture != null && sensorData.ndwi != null) {
    if (sensorData.soil_moisture < 0.2 && sensorData.ndwi < 0.1) {
      alerts.push({
        farm_id: farmId,
        alert_type: 'water_stress',
        severity: 'high',
        message: 'Water Stress Detected: Low soil moisture and low NDWI indicate drought risk.',
      });
    }
  }

  if (sensorData.temperature != null && sensorData.ndvi != null) {
    if (sensorData.temperature > 38 && sensorData.ndvi < 0.3) {
      alerts.push({
        farm_id: farmId,
        alert_type: 'heat_stress',
        severity: 'high',
        message: `Heat Stress Alert: Temperature at ${sensorData.temperature}°C with low vegetation index.`,
      });
    } else if (sensorData.temperature > 35 && sensorData.ndvi < 0.4) {
      alerts.push({
        farm_id: farmId,
        alert_type: 'heat_stress',
        severity: 'moderate',
        message: 'Moderate Heat Risk: Consider irrigation scheduling.',
      });
    }
  }

  if (sensorData.ndvi != null) {
    if (sensorData.ndvi < 0.15) {
      alerts.push({
        farm_id: farmId,
        alert_type: 'vegetation_decline',
        severity: 'high',
        message: 'Critical Vegetation Decline: NDVI critically low, immediate action needed.',
      });
    } else if (sensorData.ndvi < 0.25) {
      alerts.push({
        farm_id: farmId,
        alert_type: 'vegetation_decline',
        severity: 'moderate',
        message: 'Vegetation Stress: NDVI below healthy threshold. Consider fertilization.',
      });
    }
  }

  for (const alert of alerts) {
    await supabase.from('stress_alerts').insert(alert);
  }

  return alerts;
}

export function getCropRecommendations(ndvi, soilMoisture, temperature) {
  const crops = [];

  if (soilMoisture > 0.3 && temperature >= 20 && temperature <= 30) {
    crops.push(
      { name: 'Tomatoes', match: 90, reason: 'High moisture + optimal temperature' },
      { name: 'Peppers', match: 85, reason: 'Warm and moist conditions ideal' },
    );
  }

  if (temperature >= 25 && temperature <= 38 && soilMoisture >= 0.15) {
    crops.push(
      { name: 'Corn', match: 80, reason: 'Good fit for warm climate' },
      { name: 'Sunflowers', match: 75, reason: 'Tolerant of moderate conditions' },
    );
  }

  if (temperature > 35 && soilMoisture < 0.2) {
    crops.push(
      { name: 'Olives', match: 88, reason: 'Drought-resistant, ideal for arid zones' },
      { name: 'Argan', match: 85, reason: 'Native to Moroccan dry climate' },
    );
  }

  if (temperature < 20 && soilMoisture > 0.25) {
    crops.push(
      { name: 'Potatoes', match: 82, reason: 'Cool weather crop' },
      { name: 'Carrots', match: 78, reason: 'Suitable for mild conditions' },
    );
  }

  return crops.sort((a, b) => b.match - a.match).slice(0, 3);
}
