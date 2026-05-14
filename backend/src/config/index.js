import 'dotenv/config';

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
};
