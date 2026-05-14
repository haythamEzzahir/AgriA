import { Router } from 'express';

const router = Router();

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  const { supabase } = await import('../config/supabase.js');

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) return res.status(400).json({ error: authError.message });

  if (authData.user) {
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      name,
      email,
    });
    if (dbError) return res.status(500).json({ error: dbError.message });
  }

  res.status(201).json({ user: authData.user, session: authData.session });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { supabase } = await import('../config/supabase.js');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  res.json({ user: data.user, session: data.session });
});

router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { supabase } = await import('../config/supabase.js');
  const { error } = await supabase.auth.admin.signOut(token);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Logged out' });
});

export default router;
