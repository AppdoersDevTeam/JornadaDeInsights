-- Optional English copy for public site when language is English (falls back to PT if null).
ALTER TABLE curiosidades
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS body_en TEXT;

ALTER TABLE curiosidades_categories
  ADD COLUMN IF NOT EXISTS name_en TEXT;

COMMENT ON COLUMN curiosidades.title_en IS 'Optional English title; shown when site language is English.';
COMMENT ON COLUMN curiosidades.body_en IS 'Optional English HTML body; shown when site language is English.';
COMMENT ON COLUMN curiosidades_categories.name_en IS 'Optional English category label for EN site language.';
