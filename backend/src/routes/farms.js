import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, polygon } = req.body;

  const { data, error } = await supabase
    .from('farms')
    .insert({ user_id: req.user.id, name, polygon })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'Farm not found' });
  res.json(data);
});

router.put('/:id', async (req, res) => {
  const { name, polygon } = req.body;

  const { data, error } = await supabase
    .from('farms')
    .update({ name, polygon, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('farms')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Farm deleted' });
});

export default router;
