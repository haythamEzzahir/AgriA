'use strict';

require('dotenv').config();

function get(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}. Copy .env.example to .env and fill in the values.`);
  }
  return value;
}

module.exports = {
  get AGROMONITORING_API_KEY() { return get('AGROMONITORING_API_KEY'); },
  get DEEPSEEK_API_KEY()       { return get('DEEPSEEK_API_KEY'); },
  get OPEN_METEO_BASE()        { return process.env.OPEN_METEO_BASE   || 'https://api.open-meteo.com/v1'; },
  get DEEPSEEK_BASE_URL()      { return process.env.DEEPSEEK_BASE_URL  || 'https://api.deepseek.com/v1'; },
  get DEEPSEEK_MODEL()         { return process.env.DEEPSEEK_MODEL     || 'deepseek-chat'; },
  get USE_AGRO_SAMPLE()        { return process.env.USE_AGRO_SAMPLE !== 'false'; },
  // Copernicus Data Space credentials (required when IMAGERY_SOURCE=copernicus)
  get CDSE_CLIENT_ID()         { return process.env.CDSE_CLIENT_ID     || ''; },
  get CDSE_CLIENT_SECRET()     { return process.env.CDSE_CLIENT_SECRET || ''; },
  get IMAGERY_SOURCE()         { return process.env.IMAGERY_SOURCE     || 'agromonitoring'; },
};
