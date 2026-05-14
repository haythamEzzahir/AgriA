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

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/ndvi', ndviRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/marketplace', marketplaceRoutes);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
