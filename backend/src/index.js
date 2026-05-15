import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import farmRoutes from './routes/farms.js';
import ndviRoutes from './routes/ndvi.js';
import weatherRoutes from './routes/weather.js';
import aiRoutes from './routes/ai.js';
import marketplaceRoutes from './routes/marketplace.js';
import alertsRoutes from './routes/alerts.js';
import recommendationsRoutes from './routes/recommendations.js';
import registerRoutes from './routes/register.js';
import soilRoutes from './routes/soil.js';
import analyzeRoutes from './routes/analyze.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/ndvi', ndviRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/soil', soilRoutes);
app.use('/api/analyze', analyzeRoutes);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
