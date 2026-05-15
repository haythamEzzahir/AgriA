import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = Router();

router.use(requireAuth);

router.get('/:farmId', async (req, res) => {
  const { farmId } = req.params;

  const { data, error } = await supabase
    .from('stress_alerts')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;
