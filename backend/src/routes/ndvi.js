import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getNDVIData } from '../services/agroMonitoring.js';
import { runRuleEngine } from '../services/ruleEngine.js';
import { supabase } from '../config/supabase.js';

const router = Router();

router.use(requireAuth);

router.get('/:farmId', async (req, res) => {
  const { farmId } = req.params;

  const { data: farm } = await supabase
    .from('farms')
    .select('polygon')
    .eq('id', farmId)
    .eq('user_id', req.user.id)
    .single();

  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  try {
    const satelliteData = await getNDVIData(farm.polygon);

    const { data: savedData, error: saveError } = await supabase
      .from('ndvi_history')
      .insert({
        farm_id: farmId,
        ndvi: satelliteData.ndvi,
        ndwi: satelliteData.ndwi,
        soil_moisture: satelliteData.soil_moisture,
        temperature: satelliteData.temperature,
      })
      .select()
      .single();

    if (saveError) return res.status(500).json({ error: saveError.message });

    const alerts = await runRuleEngine(farmId, satelliteData);

    res.json({ ndvi: savedData, alerts });
  } catch (err) {
    res.status(502).json({ error: 'Satellite data fetch failed' });
  }
});

router.get('/:farmId/history', async (req, res) => {
  const { data, error } = await supabase
    .from('ndvi_history')
    .select('*')
    .eq('farm_id', req.params.farmId)
    .order('date', { ascending: false })
    .limit(30);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
