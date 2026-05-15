-- AgriCopilot AI - Supabase Schema (v2)

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT,                    -- small / medium / large
  custom_area TEXT,             -- custom area in hectares
  crops JSONB DEFAULT '[]'::jsonb,  -- array of crop ids
  irrigation TEXT,              -- rain / drip / well / manual
  water_access TEXT,            -- good / moderate / difficult
  polygon JSONB,
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- NDVI History (satellite vegetation data)
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

-- ============================================================================
-- UPDATED_AT TRIGGER (auto-set on row update)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_users_updated_at') THEN
    CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_farms_updated_at') THEN
    CREATE TRIGGER set_farms_updated_at BEFORE UPDATE ON public.farms
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_listings_updated_at') THEN
    CREATE TRIGGER set_listings_updated_at BEFORE UPDATE ON public.listings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Users: can read/update own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

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

CREATE POLICY "Users can insert farm ndvi" ON public.ndvi_history
  FOR INSERT WITH CHECK (
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

-- ============================================================================
-- ADD MISSING COLUMNS (for existing tables that were created with partial schema)
-- ============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS custom_area TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS crops JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS irrigation TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS water_access TEXT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS polygon JSONB;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_ndvi_history_farm_id ON public.ndvi_history(farm_id);
CREATE INDEX IF NOT EXISTS idx_ndvi_history_date ON public.ndvi_history(date);
CREATE INDEX IF NOT EXISTS idx_ai_history_farm_id ON public.ai_history(farm_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_alerts_farm_id ON public.stress_alerts(farm_id);
