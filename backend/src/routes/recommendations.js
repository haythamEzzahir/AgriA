import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { getCropRecommendations } from '../services/ruleEngine.js';
import { DEMO_RECOMMENDATIONS } from '../services/mockData.js';

const router = Router();

router.use(requireAuth);

router.get('/:farmId', async (req, res) => {
  const { farmId } = req.params;

  if (req.isDemo) return res.json(DEMO_RECOMMENDATIONS[farmId] || []);

  const { data: ndviData } = await supabase
    .from('ndvi_history')
    .select('*')
    .eq('farm_id', farmId)
    .order('date', { ascending: false })
    .limit(1);

  const latest = ndviData?.[0] || {};
  const crops = getCropRecommendations(
    latest.ndvi,
    latest.soil_moisture,
    latest.temperature,
  );

  res.json(crops);
});

export default router;
