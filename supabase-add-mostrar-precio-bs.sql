-- ============================================================
-- MIGRACIÓN: Agregar columna mostrar_precio_bs a catalog_settings
-- ============================================================
-- Ejecuta esto en Supabase → SQL Editor → New query → Run
--
-- Esta columna guarda la preferencia del admin:
-- ¿mostrar o no mostrar el precio en Bs en el dashboard?
--
-- Es SEGURO: usa IF NOT EXISTS, no borra datos existentes.
-- ============================================================

ALTER TABLE public.catalog_settings
  ADD COLUMN IF NOT EXISTS mostrar_precio_bs boolean NOT NULL DEFAULT true;
