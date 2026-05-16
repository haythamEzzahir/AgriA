import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { DEMO_FARMS } from '../services/mockData.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  if (req.isDemo) return res.json(DEMO_FARMS[req.user.id] || []);

  try {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch {
    res.json([]);
  }
});

router.get('/:id', async (req, res) => {
  if (req.isDemo) {
    const farms = DEMO_FARMS[req.user.id] || [];
    const farm = farms.find((f) => f.id === req.params.id);
    if (!farm) return res.status(404).json({ error: 'Farm not found' });
    return res.json(farm);
  }

  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'Farm not found' });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, polygon, size, crops, irrigation } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Farm name is required' });
  }

  if (req.isDemo) {
    return res.status(201).json({ id: 'farm-demo-new', name, polygon, size, crops, irrigation, user_id: req.user.id });
  }

  const { data, error } = await supabase
    .from('farms')
    .insert({
      user_id: req.user.id,
      name,
      polygon,
      size,
      crops,
      irrigation,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  if (req.isDemo) return res.json({ ...req.body, id: req.params.id, user_id: req.user.id });

  const updates = {};
  const { name, polygon, size, crops, irrigation } = req.body;
  if (name !== undefined) updates.name = name;
  if (polygon !== undefined) updates.polygon = polygon;
  if (size !== undefined) updates.size = size;
  if (crops !== undefined) updates.crops = crops;
  if (irrigation !== undefined) updates.irrigation = irrigation;

  const { data, error } = await supabase
    .from('farms')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  if (req.isDemo) return res.status(204).end();

  const { error } = await supabase
    .from('farms')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;
