-- Allow posts authored in English only (Portuguese columns empty) or Portuguese only, or both.
ALTER TABLE curiosidades
  ALTER COLUMN title DROP NOT NULL,
  ALTER COLUMN body DROP NOT NULL;

ALTER TABLE curiosidades
  ADD CONSTRAINT curiosidades_one_complete_locale_check CHECK (
    (
      NULLIF(BTRIM(COALESCE(title, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(body, '')), '') IS NOT NULL
    )
    OR (
      NULLIF(BTRIM(COALESCE(title_en, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(body_en, '')), '') IS NOT NULL
    )
  );

COMMENT ON CONSTRAINT curiosidades_one_complete_locale_check ON curiosidades IS
  'Requires a full title+body in Portuguese OR a full title+body in English (or both).';
