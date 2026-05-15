import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getForecast } from '../services/openWeather.js';
import { DEMO_WEATHER } from '../services/mockData.js';

const router = Router();

router.use(requireAuth);

router.get('/forecast', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  try {
    const forecast = await getForecast(lat, lon);
    return res.json(forecast);
  } catch (err) {
    console.warn('Weather API failed, using mock:', err.message);
    return res.json(DEMO_WEATHER);
  }
});

export default router;
