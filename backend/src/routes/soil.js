import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { getSoilData } from '../services/soilService.js';
import { DEMO_SOIL, DEMO_FARMS } from '../services/mockData.js';

const router = Router();

router.use(requireAuth);

router.get('/:farmId', async (req, res) => {
  const { farmId } = req.params;

  let farm, ndviData, weatherData;

  if (req.isDemo) {
    const farms = DEMO_FARMS[req.user.id] || [];
    farm = farms.find((f) => f.id === farmId);
    if (!farm) return res.status(404).json({ error: 'Farm not found' });

    const soilMock = DEMO_SOIL[farmId];
    if (soilMock) return res.json(soilMock);

    ndviData = {};
    weatherData = [];
  } else {
    const { data: farmData, error: farmErr } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('user_id', req.user.id)
      .single();
    if (farmErr || !farmData) return res.status(404).json({ error: 'Farm not found' });
    farm = farmData;

    const { data: ndviResult } = await supabase
      .from('ndvi_history')
      .select('ndvi, ndwi, soil_moisture, temperature')
      .eq('farm_id', farmId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    ndviData = ndviResult || {};

    const { data: weatherResult } = await supabase
      .from('weather_history')
      .select('*')
      .eq('farm_id', farmId)
      .order('date', { ascending: false })
      .limit(7);
    weatherData = weatherResult || [];
  }

  try {
    const soil = await getSoilData({
      polygon: farm.polygon,
      lat: farm.latitude,
      lon: farm.longitude,
      ndviData,
      weatherData,
      crops: farm.crops,
    });
    return res.json(soil);
  } catch (err) {
    console.error('Soil service error:', err.message);
    return res.status(502).json({ error: 'Soil data unavailable' });
  }
});

export default router;
