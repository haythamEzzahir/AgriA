import { Router } from 'express';
import { supabase, supabaseAnon } from '../config/supabase.js';

const router = Router();

const DEMO_USERS = [
  { email: 'demo@agricopilot.ma', password: 'demo123', name: 'Ahmed Farmer', id: 'demo-001' },
  { email: 'fatima@agricopilot.ma', password: 'demo123', name: 'Fatima Grower', id: 'demo-002' },
];

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    // Create user via admin API with email auto-confirmed (avoids email confirmation flow)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (authError) return res.status(400).json({ error: authError.message });

    if (authData.user) {
      const { error: dbError } = await supabase.from('users').insert({
        id: authData.user.id,
        name,
        email,
      });
      if (dbError) return res.status(500).json({ error: dbError.message });
    }

    // Sign in to get a valid session for the client
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) return res.status(400).json({ error: signInError.message });

    res.status(201).json({ user: signInData.user, session: signInData.session });
  } catch {
    res.status(503).json({ error: 'Signup service unreachable. Try again later or use demo accounts.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const demoUser = DEMO_USERS.find((u) => u.email === email && u.password === password);
  if (demoUser) {
    return res.json({
      user: { id: demoUser.id, email: demoUser.email, name: demoUser.name },
      session: { access_token: 'demo-token-' + demoUser.id, user: demoUser },
    });
  }

  try {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    return res.json({ user: data.user, session: data.session });
  } catch {
    return res.status(503).json({
      error: 'Login service unreachable. Use demo accounts: demo@agricopilot.ma / demo123'
    });
  }
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
