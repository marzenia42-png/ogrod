-- v7 schema — Supabase Auth integration.
-- Adds user_id UUID columns to all tables, enables RLS with auth.uid() policies.
-- user_device_id pozostaje (legacy fallback dla offline + migracji).

-- ── 1. Add user_id columns ─────────────────────────────────────────────────
ALTER TABLE garden_plants        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE garden_sprays        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE garden_diary         ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE garden_gallery       ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE garden_year_summary  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS garden_plants_user_idx       ON garden_plants(user_id);
CREATE INDEX IF NOT EXISTS garden_sprays_user_idx       ON garden_sprays(user_id);
CREATE INDEX IF NOT EXISTS garden_diary_user_idx        ON garden_diary(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS garden_gallery_user_idx      ON garden_gallery(user_id, year DESC);
CREATE INDEX IF NOT EXISTS garden_year_summary_user_idx ON garden_year_summary(user_id, year);

-- ── 2. Diary + year_summary: relaks UNIQUE constraint zawierający device_id ──
-- Po przejściu na auth zamiast unique(device, date) używamy unique(user, date)
-- gdy user_id wypełniony. Stare wpisy z user_id NULL pozostają (legacy).
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS garden_diary_user_date_unique
    ON garden_diary(user_id, entry_date) WHERE user_id IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS garden_year_summary_user_unique
    ON garden_year_summary(user_id, year) WHERE user_id IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ── 3. Enable RLS ──────────────────────────────────────────────────────────
ALTER TABLE garden_plants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_plant_seasons  ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_season_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_plant_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_sprays         ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_diary          ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_gallery        ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_year_summary   ENABLE ROW LEVEL SECURITY;

-- ── 4. Policies ────────────────────────────────────────────────────────────
-- Each authenticated user sees only own rows (by user_id).
-- Anon role gets fallback policy on rows where user_id IS NULL (offline/legacy).

DROP POLICY IF EXISTS "Users see own plants" ON garden_plants;
CREATE POLICY "Users see own plants" ON garden_plants
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anon legacy plants" ON garden_plants;
CREATE POLICY "Anon legacy plants" ON garden_plants
  FOR ALL TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- garden_plant_seasons — kaskaduje przez plant_id; sprawdzamy że plant należy do usera.
DROP POLICY IF EXISTS "Users see own seasons" ON garden_plant_seasons;
CREATE POLICY "Users see own seasons" ON garden_plant_seasons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM garden_plants p WHERE p.id = garden_plant_seasons.plant_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM garden_plants p WHERE p.id = garden_plant_seasons.plant_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Anon legacy seasons" ON garden_plant_seasons;
CREATE POLICY "Anon legacy seasons" ON garden_plant_seasons
  FOR ALL TO anon
  USING (EXISTS (SELECT 1 FROM garden_plants p WHERE p.id = garden_plant_seasons.plant_id AND p.user_id IS NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM garden_plants p WHERE p.id = garden_plant_seasons.plant_id AND p.user_id IS NULL));

-- garden_season_entries — kaskaduje przez season_id → plant_id → user_id.
DROP POLICY IF EXISTS "Users see own entries" ON garden_season_entries;
CREATE POLICY "Users see own entries" ON garden_season_entries
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM garden_plant_seasons s
    JOIN garden_plants p ON p.id = s.plant_id
    WHERE s.id = garden_season_entries.season_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM garden_plant_seasons s
    JOIN garden_plants p ON p.id = s.plant_id
    WHERE s.id = garden_season_entries.season_id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Anon legacy entries" ON garden_season_entries;
CREATE POLICY "Anon legacy entries" ON garden_season_entries
  FOR ALL TO anon
  USING (EXISTS (
    SELECT 1 FROM garden_plant_seasons s
    JOIN garden_plants p ON p.id = s.plant_id
    WHERE s.id = garden_season_entries.season_id AND p.user_id IS NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM garden_plant_seasons s
    JOIN garden_plants p ON p.id = s.plant_id
    WHERE s.id = garden_season_entries.season_id AND p.user_id IS NULL
  ));

-- garden_plant_photos — przez plant_id.
DROP POLICY IF EXISTS "Users see own photos" ON garden_plant_photos;
CREATE POLICY "Users see own photos" ON garden_plant_photos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM garden_plants p WHERE p.id = garden_plant_photos.plant_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM garden_plants p WHERE p.id = garden_plant_photos.plant_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Anon legacy photos" ON garden_plant_photos;
CREATE POLICY "Anon legacy photos" ON garden_plant_photos
  FOR ALL TO anon
  USING (EXISTS (SELECT 1 FROM garden_plants p WHERE p.id = garden_plant_photos.plant_id AND p.user_id IS NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM garden_plants p WHERE p.id = garden_plant_photos.plant_id AND p.user_id IS NULL));

-- garden_sprays / diary / gallery / year_summary: direct user_id.
DROP POLICY IF EXISTS "Users see own sprays" ON garden_sprays;
CREATE POLICY "Users see own sprays" ON garden_sprays
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Anon legacy sprays" ON garden_sprays;
CREATE POLICY "Anon legacy sprays" ON garden_sprays
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Users see own diary" ON garden_diary;
CREATE POLICY "Users see own diary" ON garden_diary
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Anon legacy diary" ON garden_diary;
CREATE POLICY "Anon legacy diary" ON garden_diary
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Users see own gallery" ON garden_gallery;
CREATE POLICY "Users see own gallery" ON garden_gallery
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Anon legacy gallery" ON garden_gallery;
CREATE POLICY "Anon legacy gallery" ON garden_gallery
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Users see own year_summary" ON garden_year_summary;
CREATE POLICY "Users see own year_summary" ON garden_year_summary
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Anon legacy year_summary" ON garden_year_summary;
CREATE POLICY "Anon legacy year_summary" ON garden_year_summary
  FOR ALL TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);
