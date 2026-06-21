-- Each eBook is authored in one language (Portuguese OR English), not bilingual on one row.
ALTER TABLE ebooks_metadata
  ADD COLUMN IF NOT EXISTS content_locale TEXT NOT NULL DEFAULT 'pt-BR';

ALTER TABLE ebooks_metadata
  DROP CONSTRAINT IF EXISTS ebooks_metadata_content_locale_check;

ALTER TABLE ebooks_metadata
  ADD CONSTRAINT ebooks_metadata_content_locale_check
  CHECK (content_locale IN ('pt-BR', 'en'));

CREATE INDEX IF NOT EXISTS idx_ebooks_metadata_content_locale
  ON ebooks_metadata (content_locale);

COMMENT ON COLUMN ebooks_metadata.content_locale IS
  'Primary language of this eBook; shop lists filter by visitor site language.';
