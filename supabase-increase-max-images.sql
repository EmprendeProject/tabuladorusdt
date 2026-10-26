-- Aumenta el límite de fotos por producto de 3 a 10.
-- Ejecutar una vez en el SQL Editor de Supabase (es idempotente).
alter table public.productos drop constraint if exists productos_imagenes_urls_max_3;
alter table public.productos drop constraint if exists productos_imagenes_urls_max_10;
alter table public.productos
  add constraint productos_imagenes_urls_max_10
  check (coalesce(array_length(imagenes_urls, 1), 0) <= 10);
