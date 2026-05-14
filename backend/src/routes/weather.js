import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getForecast } from '../services/openWeather.js';

const router = Router();

router.use(requireAuth);

router.get('/forecast', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  const forecast = await getForecast(lat, lon);
  res.json(forecast);
});

export default router;
