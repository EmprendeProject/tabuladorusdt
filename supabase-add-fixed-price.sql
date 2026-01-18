-- ============================================
-- ACTUALIZACIÓN: Agregar campo is_fixed_price a productos
-- ============================================
-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run

ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS is_fixed_price BOOLEAN DEFAULT false;

-- Actualizar productos existentes si es necesario (opcional)
-- UPDATE public.productos SET is_fixed_price = false WHERE is_fixed_price IS NULL;
