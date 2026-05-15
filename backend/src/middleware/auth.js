import { supabase } from '../config/supabase.js';

const DEMO_TOKENS = {
  'demo-token-demo-001': { id: 'demo-001', email: 'demo@agricopilot.ma', name: 'Ahmed Farmer' },
  'demo-token-demo-002': { id: 'demo-002', email: 'fatima@agricopilot.ma', name: 'Fatima Grower' },
};

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const demoUser = DEMO_TOKENS[token];
  if (demoUser) {
    req.user = demoUser;
    req.isDemo = true;
    return next();
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = data.user;
    next();
  } catch (err) {
    // Supabase unreachable - try local JWT decode as fallback
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (payload.sub) {
        req.user = { id: payload.sub, email: payload.email || '', aud: payload.aud };
        console.warn('⚠️  Supabase unreachable - using unverified JWT claims for', payload.email);
        return next();
      }
    } catch {
      // JWT decode also failed
    }
    return res.status(503).json({
      error: 'Authentication service unreachable. Check your connection or use demo accounts (demo@agricopilot.ma / demo123).'
    });
  }
}
