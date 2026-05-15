import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { DEMO_MARKETPLACE } from '../services/mockData.js';

const router = Router();

router.get('/', async (req, res) => {
  const { category, search } = req.query;

  let listings = [...DEMO_MARKETPLACE];

  if (category && category !== 'all') listings = listings.filter((l) => l.category === category);
  if (search) listings = listings.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()));

  res.json(listings);
});

router.get('/:id', async (req, res) => {
  const listing = DEMO_MARKETPLACE.find((l) => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json(listing);
});

router.post('/', requireAuth, async (req, res) => {
  const { category, title, description, price, photo_url, location } = req.body;

  if (!category || !title) {
    return res.status(400).json({ error: 'Category and title are required' });
  }

  const validCategories = ['crops', 'seeds', 'fertilizers', 'equipment', 'services'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  if (req.isDemo) {
    return res.status(201).json({
      id: 'listing-demo-' + Date.now(),
      user_id: req.user.id,
      category, title, description,
      price: price || null,
      photo_url: photo_url || null,
      location: location || null,
      users: { name: req.user.name || 'Demo User', location: location || '' },
      created_at: new Date().toISOString(),
    });
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      user_id: req.user.id,
      category,
      title,
      description,
      price: price || null,
      photo_url: photo_url || null,
      location: location || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', requireAuth, async (req, res) => {
  if (req.isDemo) return res.json({ ...req.body, id: req.params.id, user_id: req.user.id });

  const { category, title, description, price, photo_url, location } = req.body;

  const { data, error } = await supabase
    .from('listings')
    .update({
      category,
      title,
      description,
      price,
      photo_url,
      location,
    })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireAuth, async (req, res) => {
  if (req.isDemo) return res.status(204).end();

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;
