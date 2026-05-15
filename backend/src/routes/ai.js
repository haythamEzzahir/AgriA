import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { generateContext } from '../services/aiContextGenerator.js';
import { queryAI } from '../services/openRouter.js';
import { runRuleEngine } from '../services/ruleEngine.js';
import { DEMO_AI_RESPONSES } from '../services/mockData.js';

const router = Router();

router.use(requireAuth);

router.post('/explain', async (req, res) => {
  const { farmId, question } = req.body;

  if (req.isDemo) {
    const demo = DEMO_AI_RESPONSES[farmId];
    if (!demo) return res.status(404).json({ error: 'Farm not found' });

    const lower = (question || '').toLowerCase();
    let response = demo.fallback;
    for (const entry of demo.responses) {
      if (entry.keywords.some((k) => lower.includes(k))) {
        response = entry.response;
        break;
      }
    }

    return res.json({
      response,
      alerts: [],
    });
  }

  const { data: farm } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farmId)
    .eq('user_id', req.user.id)
    .single();

  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const { data: ndviData } = await supabase
    .from('ndvi_history')
    .select('*')
    .eq('farm_id', farmId)
    .order('date', { ascending: false })
    .limit(1);

  const latestNDVI = ndviData?.[0] || {};
  const alerts = await runRuleEngine(farmId, latestNDVI);
  const context = generateContext(farm, latestNDVI, alerts);
  const aiResponse = await queryAI(context, question);

  await supabase.from('ai_history').insert({
    farm_id: farmId,
    prompt: question,
    response: aiResponse,
  });

  res.json({ response: aiResponse, alerts });
});

router.get('/history/:farmId', async (req, res) => {
  const { farmId } = req.params;

  if (req.isDemo) {
    return res.json([
      { id: 'chat-demo-1', farm_id: farmId, prompt: 'How is my crop health?', response: 'Your crops are looking healthy!', created_at: new Date().toISOString() },
    ]);
  }

  const { data, error } = await supabase
    .from('ai_history')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
