export function generateContext(farm, ndviData, alerts) {
  return {
    farm_name: farm.name,
    crop_health: describeNDVI(ndviData.ndvi),
    soil_moisture: ndviData.soil_moisture != null
      ? `${(ndviData.soil_moisture * 100).toFixed(0)}%`
      : 'N/A',
    temperature: ndviData.temperature != null
      ? `${ndviData.temperature}°C`
      : 'N/A',
    alerts: alerts.map((a) => a.message),
  };
}

function describeNDVI(ndvi) {
  if (ndvi == null) return 'No data';
  if (ndvi > 0.5) return 'Healthy vegetation';
  if (ndvi > 0.3) return 'Moderate vegetation';
  if (ndvi > 0.15) return 'Sparse vegetation';
  return 'Critical / bare soil';
}
