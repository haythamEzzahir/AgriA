-- AgriCopilot AI - Supabase Schema

-- Users table (managed by Supabase Auth, extended here)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  polygon JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- NDVI History
CREATE TABLE IF NOT EXISTS public.ndvi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ndvi FLOAT,
  ndwi FLOAT,
  soil_moisture FLOAT,
  temperature FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ndvi_history ENABLE ROW LEVEL SECURITY;

-- AI Chat History
CREATE TABLE IF NOT EXISTS public.ai_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_history ENABLE ROW LEVEL SECURITY;

-- Marketplace Listings
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('crops', 'seeds', 'fertilizers', 'equipment', 'services')),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  photo_url TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Stress Alerts
CREATE TABLE IF NOT EXISTS public.stress_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('water_stress', 'heat_stress', 'vegetation_decline')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stress_alerts ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
-- Users can read/update their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Farms: users can CRUD their own farms
CREATE POLICY "Users can read own farms" ON public.farms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create farms" ON public.farms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own farms" ON public.farms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own farms" ON public.farms
  FOR DELETE USING (auth.uid() = user_id);

-- NDVI history: read access to farm owners
CREATE POLICY "Users can read farm ndvi" ON public.ndvi_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.farms WHERE farms.id = ndvi_history.farm_id AND farms.user_id = auth.uid())
  );

-- AI history: read/write for farm owners
CREATE POLICY "Users can read ai history" ON public.ai_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.farms WHERE farms.id = ai_history.farm_id AND farms.user_id = auth.uid())
  );

CREATE POLICY "Users can create ai history" ON public.ai_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.farms WHERE farms.id = ai_history.farm_id AND farms.user_id = auth.uid())
  );

-- Listings: public read, authenticated write
CREATE POLICY "Anyone can read listings" ON public.listings
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can create listings" ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings" ON public.listings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings" ON public.listings
  FOR DELETE USING (auth.uid() = user_id);

-- Stress alerts: read for farm owners
CREATE POLICY "Users can read farm alerts" ON public.stress_alerts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.farms WHERE farms.id = stress_alerts.farm_id AND farms.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_ndvi_history_farm_id ON public.ndvi_history(farm_id);
CREATE INDEX IF NOT EXISTS idx_ndvi_history_date ON public.ndvi_history(date);
CREATE INDEX IF NOT EXISTS idx_ai_history_farm_id ON public.ai_history(farm_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_stress_alerts_farm_id ON public.stress_alerts(farm_id);
