-- ============================================
-- ACTUALIZACIÓN: Agregar plantilla 'urban_street'
-- ============================================
-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run
--
-- Este script actualiza el CHECK constraint para permitir la nueva plantilla Urban Street

-- Actualizar el constraint para incluir 'urban_street'
ALTER TABLE public.catalog_settings
  DROP CONSTRAINT IF EXISTS catalog_settings_catalog_template_check;

ALTER TABLE public.catalog_settings
  ADD CONSTRAINT catalog_settings_catalog_template_check
  CHECK (catalog_template IN ('simple', 'boutique', 'modern', 'heavy', 'urban_street'));

-- Verificar que el constraint se actualizó correctamente
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.catalog_settings'::regclass 
  AND conname = 'catalog_settings_catalog_template_check';
