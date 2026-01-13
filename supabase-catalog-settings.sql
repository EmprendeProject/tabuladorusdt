-- ============================================
-- TABLA + RLS PARA PLANTILLA DEL CATÁLOGO
-- ============================================
-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run
--
-- Admin UUID:
-- 3513c316-f794-4e72-9e5d-543551565730

-- 1) Tabla (1 fila)
CREATE TABLE IF NOT EXISTS public.catalog_settings (
  id INTEGER PRIMARY KEY,
  catalog_template TEXT NOT NULL DEFAULT 'simple' CHECK (catalog_template IN ('simple', 'boutique', 'modern')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Si la tabla ya existía con un CHECK anterior, lo actualizamos (idempotente)
ALTER TABLE public.catalog_settings
  DROP CONSTRAINT IF EXISTS catalog_settings_catalog_template_check;
ALTER TABLE public.catalog_settings
  ADD CONSTRAINT catalog_settings_catalog_template_check
  CHECK (catalog_template IN ('simple', 'boutique', 'modern'));

-- 2) Fila única
INSERT INTO public.catalog_settings (id, catalog_template)
VALUES (1, 'simple')
ON CONFLICT (id) DO NOTHING;

-- 3) RLS
ALTER TABLE public.catalog_settings ENABLE ROW LEVEL SECURITY;

-- 4) Policies (público lee / solo admin escribe)
DROP POLICY IF EXISTS "Public read catalog_settings" ON public.catalog_settings;
DROP POLICY IF EXISTS "Admin insert catalog_settings" ON public.catalog_settings;
DROP POLICY IF EXISTS "Admin update catalog_settings" ON public.catalog_settings;
DROP POLICY IF EXISTS "Admin delete catalog_settings" ON public.catalog_settings;

CREATE POLICY "Public read catalog_settings"
  ON public.catalog_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin insert catalog_settings"
  ON public.catalog_settings FOR INSERT
  WITH CHECK (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

CREATE POLICY "Admin update catalog_settings"
  ON public.catalog_settings FOR UPDATE
  USING (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid)
  WITH CHECK (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

CREATE POLICY "Admin delete catalog_settings"
  ON public.catalog_settings FOR DELETE
  USING (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

-- 5) Trigger updated_at (requiere la función update_updated_at_column)
-- Si tu proyecto NO tiene la función, ejecuta este bloque primero:
--
-- CREATE OR REPLACE FUNCTION public.update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = TIMEZONE('utc', NOW());
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_catalog_settings_updated_at ON public.catalog_settings;
CREATE TRIGGER update_catalog_settings_updated_at
  BEFORE UPDATE ON public.catalog_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
