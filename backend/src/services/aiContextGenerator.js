function describeNDVI(ndvi) {
  if (ndvi == null) return 'No data';
  if (ndvi > 0.5) return `Healthy (${ndvi.toFixed(2)})`;
  if (ndvi > 0.3) return `Moderate (${ndvi.toFixed(2)})`;
  if (ndvi > 0.15) return `Sparse (${ndvi.toFixed(2)})`;
  return `Critical / bare soil (${ndvi.toFixed(2)})`;
}

function describeNDWI(ndwi) {
  if (ndwi == null) return 'No data';
  if (ndwi > 0.3) return `High water content (${ndwi.toFixed(2)})`;
  if (ndwi > 0.0) return `Moderate water content (${ndwi.toFixed(2)})`;
  if (ndwi > -0.2) return `Low water content (${ndwi.toFixed(2)})`;
  return `Severe water stress (${ndwi.toFixed(2)})`;
}

export function generateContext(farm, analysis, alerts = []) {
  const stats = analysis?.statistics || {};
  const farmContext = analysis?.farm_context || {};
  const summary = analysis?.summary || {};
  const zones = analysis?.zones || [];

  const stressedZones = zones.filter((z) => z.status === 'stressed' || z.status === 'critical');
  const irrigationZones = zones.filter((z) => z.action?.amount_liters);

  return {
    farm_name: farm.name || 'Unknown',
    region: farm.region || 'Morocco',
    crops: Array.isArray(farm.crops) ? farm.crops : [],
    farm_size: farm.size || farm.custom_area || 'unknown',
    irrigation: farm.irrigation || 'unknown',
    water_access: farm.water_access || 'unknown',

    ndvi_status: describeNDVI(stats.ndvi?.mean),
    ndwi_status: describeNDWI(stats.ndwi?.mean),
    soil_moisture: farmContext.soil_moisture != null
      ? `${Math.round(farmContext.soil_moisture * 100)}%`
      : 'N/A',
    air_temperature: farmContext.air_temperature != null
      ? `${Math.round(farmContext.air_temperature)}°C`
      : 'N/A',
    rain_3d_mm: farmContext.rain_3d_mm != null
      ? `${farmContext.rain_3d_mm} mm`
      : 'N/A',
    et0_mm_per_day: farmContext.et0_mm_per_day != null
      ? `${farmContext.et0_mm_per_day} mm/day`
      : 'N/A',

    zone_counts: {
      healthy: summary.healthy ?? 0,
      moderate: summary.moderate ?? 0,
      stressed: summary.stressed ?? 0,
      critical: summary.critical ?? 0,
    },
    stressed_zones: stressedZones.map((z) => `${z.zone_id} (${z.position}) — ${z.decision}`),
    irrigation_plan: irrigationZones.map((z) => `Zone ${z.zone_id}: ${z.action.amount_liters.toLocaleString()} L ${z.action.timing === 'before_7am' ? 'before 7am' : 'within 24h'}`),
    priority_action: summary.priority_action || 'None',
    total_water_needed_liters: summary.total_water_needed_liters || 0,
    satellite_date: analysis?.satellite_date || null,
    alerts: alerts.map((a) => a.message),
  };
}
