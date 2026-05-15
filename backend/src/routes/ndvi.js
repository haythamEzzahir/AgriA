import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { fetchNDVI, getSatelliteImageUrl } from '../services/agroMonitoring.js';
import { DEMO_NDVI, DEMO_FARMS } from '../services/mockData.js';

const router = Router();

router.use(requireAuth);

router.get('/:farmId', async (req, res) => {
  const { farmId } = req.params;

  let farm;
  if (req.isDemo) {
    const farms = DEMO_FARMS[req.user.id] || [];
    farm = farms.find((f) => f.id === farmId);
  } else {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('user_id', req.user.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Farm not found' });
    farm = data;
  }

  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  try {
    const ndviData = await fetchNDVI(farm.polygon);
    return res.json(ndviData);
  } catch (err) {
    console.warn('NDVI API failed, using mock:', err.message);
    if (req.isDemo) {
      const mock = DEMO_NDVI[farmId];
      if (mock) return res.json(mock.current);
    }
    return res.json({ ndvi: null, ndwi: null, soil_moisture: null, temperature: null });
  }
});

router.get('/:farmId/history', async (req, res) => {
  const { farmId } = req.params;

  if (req.isDemo) {
    const ndvi = DEMO_NDVI[farmId];
    if (!ndvi) return res.json([]);
    return res.json(ndvi.history);
  }

  const { data, error } = await supabase
    .from('ndvi_history')
    .select('*')
    .eq('farm_id', farmId)
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
