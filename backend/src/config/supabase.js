import { createClient } from '@supabase/supabase-js';
import { config } from './index.js';

export const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
