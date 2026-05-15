import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const {
    name, phone, region, goals,
    size, customArea, crops, irrigation, waterAccess,
  } = req.body;

  // Demo users: skip DB, just return success
  if (req.isDemo) {
    return res.json({ success: true, demo: true });
  }

  // Save personal data if provided
  const hasPersonal = name || phone || region || goals;
  if (hasPersonal) {
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (region) updates.region = region;
    if (goals) updates.goals = goals;

    try {
      const { error: userError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id);

      if (userError) return res.status(500).json({ error: userError.message });
    } catch {
      return res.status(503).json({ error: 'Database service unreachable. Please try again later.' });
    }
  }

  // Save farm data if provided
  if (size || crops || irrigation) {
    try {
      const { error: farmError } = await supabase
        .from('farms')
        .insert({
          user_id: req.user.id,
          name: (name || req.user.email || 'Farm') + "'s Farm",
          size: size || null,
          custom_area: customArea || null,
          crops: crops || [],
          irrigation: irrigation || null,
          water_access: waterAccess || null,
        });

      if (farmError) return res.status(500).json({ error: farmError.message });
    } catch {
      return res.status(503).json({ error: 'Database service unreachable. Please try again later.' });
    }
  }

  res.json({ success: true });
});

export default router;
