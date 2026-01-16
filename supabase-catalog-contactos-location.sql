-- Agrega campos públicos de ubicación para el catálogo
-- Ejecuta esto en Supabase SQL Editor (es idempotente)

alter table public.catalog_contactos
  add column if not exists direccion text null;

alter table public.catalog_contactos
  add column if not exists maps_url text null;

-- Opcional: índice para búsquedas futuras (no necesario hoy)
-- create index if not exists idx_catalog_contactos_maps_url on public.catalog_contactos(maps_url);
