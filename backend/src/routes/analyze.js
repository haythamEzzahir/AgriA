import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { DEMO_FARMS } from '../services/mockData.js';
import { runPipeline } from '../services/pipeline.js';

const router = Router();

router.use(requireAuth);

router.post('/:farmId', async (req, res) => {
  const { farmId } = req.params;
  const { language } = req.body;
  let farm;

  if (req.isDemo) {
    const farms = DEMO_FARMS[req.user.id] || [];
    farm = farms.find(f => f.id === farmId);
    if (!farm) return res.status(404).json({ error: 'Farm not found' });
  } else {
    const { supabase } = await import('../config/supabase.js');
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('user_id', req.user.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Farm not found' });
    farm = data;
  }

  const polygonGeojson = farm.polygon?.type === 'Feature'
    ? farm.polygon
    : { type: 'Feature', properties: {}, geometry: farm.polygon };

  try {
    const result = await runPipeline({
      farm: {
        id: farm.id,
        name: farm.name,
        crop: (farm.crops || [])[0] || 'unknown',
        polygon_geojson: polygonGeojson,
        center: [farm.longitude, farm.latitude],
        lat: farm.latitude,
        lon: farm.longitude,
      },
      language: language || 'mixed',
    });
    res.json(result);
  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(502).json({ error: 'Analysis failed', details: err.message });
  }
});

export default router;
