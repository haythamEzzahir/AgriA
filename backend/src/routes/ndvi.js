import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { fetchNDVI } from '../services/agroMonitoring.js';

const router = Router();

router.use(requireAuth);

router.get('/:farmId', async (req, res) => {
  const { farmId } = req.params;

  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farmId)
    .eq('user_id', req.user.id)
    .single();

  if (farmError || !farm) return res.status(404).json({ error: 'Farm not found' });

  const ndviData = await fetchNDVI(farm.polygon);
  res.json(ndviData);
});

router.get('/:farmId/history', async (req, res) => {
  const { farmId } = req.params;

  const { data, error } = await supabase
    .from('ndvi_history')
    .select('*')
    .eq('farm_id', farmId)
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
