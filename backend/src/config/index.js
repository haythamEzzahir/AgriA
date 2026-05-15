import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  agroMonitoring: {
    apiKey: process.env.AGROMONITORING_API_KEY,
  },
  openWeather: {
    apiKey: process.env.OPENWEATHER_API_KEY,
  },
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'claude-3-haiku',
  },
  copernicus: {
    clientId: process.env.CDSE_CLIENT_ID,
    clientSecret: process.env.CDSE_CLIENT_SECRET,
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  openMeteo: {
    base: process.env.OPEN_METEO_BASE || 'https://api.open-meteo.com/v1',
  },
  imagerySource: process.env.IMAGERY_SOURCE || 'copernicus',
};
