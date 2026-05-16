import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { generateContext } from '../services/aiContextGenerator.js';
import { queryAI } from '../services/openRouter.js';
import { DEMO_FARMS, DEMO_AI_RESPONSES } from '../services/mockData.js';

const router = Router();

router.use(requireAuth);

router.post('/explain', async (req, res) => {
  const { farmId, question, analysis } = req.body;

  if (!farmId || !question) {
    return res.status(400).json({ error: 'farmId and question are required' });
  }

  // Get farm data (real or demo)
  let farm;
  if (req.isDemo) {
    const list = DEMO_FARMS[req.user.id] || [];
    farm = list.find((f) => f.id === farmId);
  } else {
    const { data } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('user_id', req.user.id)
      .single();
    farm = data;
  }

  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  // Build rich context from farm + analysis (if provided)
  const context = generateContext(farm, analysis || null, []);

  // Try OpenRouter; if it fails, fall back to demo canned responses for demo users
  try {
    const aiResponse = await queryAI(context, question);

    // Save to history (real users only)
    if (!req.isDemo) {
      await supabase.from('ai_history').insert({
        farm_id: farmId,
        prompt: question,
        response: aiResponse,
      });
    }

    return res.json({ response: aiResponse, alerts: [] });
  } catch (err) {
    console.warn('OpenRouter failed:', err.message);
    if (req.isDemo) {
      const demo = DEMO_AI_RESPONSES[farmId];
      if (demo) {
        const lower = (question || '').toLowerCase();
        let response = demo.fallback;
        for (const entry of demo.responses) {
          if (entry.keywords.some((k) => lower.includes(k))) {
            response = entry.response;
            break;
          }
        }
        return res.json({ response, alerts: [] });
      }
    }
    return res.status(502).json({ error: 'AI service unavailable', details: err.message });
  }
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
