-- v6 schema for Ogród Marzeń
-- Migrates from localStorage to Supabase. Anonymous app — no auth.
-- RLS disabled, anon role has full access via grants below.

-- Plants — main entity. id is TEXT to keep continuity with legacy localStorage uids.
CREATE TABLE IF NOT EXISTS garden_plants (
  id TEXT PRIMARY KEY,
  user_device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  is_custom BOOLEAN DEFAULT false,
  is_variety BOOLEAN DEFAULT false,
  parent_plant_id TEXT,
  location TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(10,2),
  purchase_shop TEXT,
  height_cm TEXT,
  position TEXT,
  soil TEXT,
  watering TEXT,
  description TEXT,
  notes TEXT,
  -- v6 extras (free-form spec; FLORA prompt if user filled anything manually)
  frost_hardiness TEXT,
  flowering TEXT,
  -- legacy fields kept for compat
  species_id TEXT,
  variety_name TEXT,
  months INTEGER[],
  type TEXT,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS garden_plants_device_idx ON garden_plants(user_device_id);
CREATE INDEX IF NOT EXISTS garden_plants_parent_idx ON garden_plants(parent_plant_id);

-- Per-year season notes (1 row per plant per year).
CREATE TABLE IF NOT EXISTS garden_plant_seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id TEXT REFERENCES garden_plants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plant_id, year)
);

CREATE INDEX IF NOT EXISTS garden_plant_seasons_plant_idx ON garden_plant_seasons(plant_id, year);

-- Individual entries inside a season (notes, sprays, fertilizer, observations).
CREATE TABLE IF NOT EXISTS garden_season_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID REFERENCES garden_plant_seasons(id) ON DELETE CASCADE,
  entry_date DATE DEFAULT CURRENT_DATE,
  entry_text TEXT NOT NULL,
  entry_type TEXT DEFAULT 'note',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS garden_season_entries_season_idx ON garden_season_entries(season_id);

-- Problem/disease photos per plant.
CREATE TABLE IF NOT EXISTS garden_plant_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plant_id TEXT REFERENCES garden_plants(id) ON DELETE CASCADE,
  photo_url TEXT,
  photo_data TEXT,
  photo_type TEXT DEFAULT 'problem',
  description TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS garden_plant_photos_plant_idx ON garden_plant_photos(plant_id);

-- Global spray/fertilizer log (not per plant — multi-target).
CREATE TABLE IF NOT EXISTS garden_sprays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_device_id TEXT NOT NULL,
  spray_date DATE DEFAULT CURRENT_DATE,
  product_name TEXT NOT NULL,
  product_type TEXT DEFAULT 'spray', -- 'spray' | 'fertilizer'
  target_plants TEXT[],
  concentration TEXT,
  notes TEXT,
  label_photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS garden_sprays_device_idx ON garden_sprays(user_device_id);
CREATE INDEX IF NOT EXISTS garden_sprays_date_idx ON garden_sprays(spray_date DESC);

-- Diary — today's notes, one row per device per day.
CREATE TABLE IF NOT EXISTS garden_diary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_device_id TEXT NOT NULL,
  entry_date DATE DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_device_id, entry_date)
);

CREATE INDEX IF NOT EXISTS garden_diary_device_date_idx ON garden_diary(user_device_id, entry_date DESC);

-- Garden gallery — photos with album/year/description (v6 etap 7).
CREATE TABLE IF NOT EXISTS garden_gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_device_id TEXT NOT NULL,
  photo_data TEXT NOT NULL,
  album TEXT DEFAULT 'Ogród',
  description TEXT,
  taken_date DATE DEFAULT CURRENT_DATE,
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM taken_date)::INTEGER) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS garden_gallery_device_year_idx ON garden_gallery(user_device_id, year DESC);
CREATE INDEX IF NOT EXISTS garden_gallery_album_idx ON garden_gallery(album);

-- Year-level free-form summary per device.
CREATE TABLE IF NOT EXISTS garden_year_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_device_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  content TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_device_id, year)
);

-- Disable RLS — app is anonymous, gated by device_id only.
ALTER TABLE garden_plants DISABLE ROW LEVEL SECURITY;
ALTER TABLE garden_plant_seasons DISABLE ROW LEVEL SECURITY;
ALTER TABLE garden_season_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE garden_plant_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE garden_sprays DISABLE ROW LEVEL SECURITY;
ALTER TABLE garden_diary DISABLE ROW LEVEL SECURITY;
ALTER TABLE garden_gallery DISABLE ROW LEVEL SECURITY;
ALTER TABLE garden_year_summary DISABLE ROW LEVEL SECURITY;

-- Grant anon role full access (anonymous app — security via device_id namespacing).
GRANT ALL ON garden_plants TO anon, authenticated;
GRANT ALL ON garden_plant_seasons TO anon, authenticated;
GRANT ALL ON garden_season_entries TO anon, authenticated;
GRANT ALL ON garden_plant_photos TO anon, authenticated;
GRANT ALL ON garden_sprays TO anon, authenticated;
GRANT ALL ON garden_diary TO anon, authenticated;
GRANT ALL ON garden_gallery TO anon, authenticated;
GRANT ALL ON garden_year_summary TO anon, authenticated;
