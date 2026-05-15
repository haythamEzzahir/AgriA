import { Router } from 'express';

const router = Router();

const DEMO_USERS = [
  { email: 'demo@agricopilot.ma', password: 'demo123', name: 'Ahmed Farmer', id: 'demo-001' },
  { email: 'fatima@agricopilot.ma', password: 'demo123', name: 'Fatima Grower', id: 'demo-002' },
];

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const { supabase, supabaseAnon } = await import('../config/supabase.js');

    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({ email, password });
    if (authError) throw authError;

    if (authData.user) {
      const { error: dbError } = await supabase.from('users').insert({
        id: authData.user.id, name, email,
      });
      if (dbError) throw dbError;
    }

    res.status(201).json({ user: authData.user, session: authData.session });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Demo mode: check demo users first
  const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password);
  if (demoUser) {
    return res.json({
      user: { id: demoUser.id, email: demoUser.email, name: demoUser.name },
      session: { access_token: 'demo-token-' + demoUser.id, user: demoUser },
    });
  }

  try {
    const { supabaseAnon } = await import('../config/supabase.js');

    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error) throw error;

    res.json({ user: data.user, session: data.session });
  } catch (err) {
    res.status(401).json({ error: err.message || 'Invalid credentials' });
  }
});

router.post('/logout', async (req, res) => {
  res.json({ message: 'Logged out' });
});

export default router;
