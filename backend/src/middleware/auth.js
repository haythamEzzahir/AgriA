const DEMO_TOKENS = {
  'demo-token-demo-001': { id: 'demo-001', email: 'demo@agricopilot.ma', name: 'Ahmed Farmer' },
  'demo-token-demo-002': { id: 'demo-002', email: 'fatima@agricopilot.ma', name: 'Fatima Grower' },
};

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  // Demo mode
  const demoUser = DEMO_TOKENS[token];
  if (demoUser) {
    req.user = demoUser;
    return next();
  }

  try {
    const { supabase } = await import('../config/supabase.js');
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = data.user;
    next();
  } catch {
    return res.status(401).json({ error: 'Authentication unavailable' });
  }
}
