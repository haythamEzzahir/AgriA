import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  const { category, search } = req.query;

  let query = supabase.from('listings').select('*, users(name, location)');

  if (category) query = query.eq('category', category);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*, users(name, location)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Listing not found' });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { category, title, description, price, photo_url, location } = req.body;

  const { data, error } = await supabase
    .from('listings')
    .insert({ user_id: req.user.id, category, title, description, price, photo_url, location })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', requireAuth, async (req, res) => {
  const { category, title, description, price, photo_url, location } = req.body;

  const { data, error } = await supabase
    .from('listings')
    .update({ category, title, description, price, photo_url, location, updated_at: new Date() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;
