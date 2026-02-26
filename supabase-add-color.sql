ALTER TABLE public.catalog_settings
  ADD COLUMN IF NOT EXISTS accent_color text;
