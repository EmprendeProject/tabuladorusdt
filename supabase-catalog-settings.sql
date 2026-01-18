-- ============================================
-- TABLA + RLS PARA PLANTILLA DEL CATÁLOGO
-- ============================================
-- Ejecuta esto en Supabase -> SQL Editor -> New query -> Run
--
-- Este script configura la plantilla POR USUARIO/TIENDA.
-- Cada usuario podrá cambiar su propia plantilla.

-- 1) Tabla (por owner)
drop table if exists public.catalog_settings cascade;

create table public.catalog_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  catalog_template text not null default 'simple' check (catalog_template in ('simple', 'boutique', 'modern', 'heavy', 'urban_street')),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Si la tabla existía con un CHECK anterior, lo actualizamos (idempotente)
alter table public.catalog_settings
  drop constraint if exists catalog_settings_catalog_template_check;
alter table public.catalog_settings
  add constraint catalog_settings_catalog_template_check
  check (catalog_template in ('simple', 'boutique', 'modern', 'heavy', 'urban_street'));

-- 2) Nota: no insertamos filas aquí.
-- La app crea/actualiza la fila del usuario al guardar.

-- 3) RLS
ALTER TABLE public.catalog_settings ENABLE ROW LEVEL SECURITY;

-- 4) Policies (público lee / dueño escribe)
drop policy if exists "Public read catalog_settings" on public.catalog_settings;
drop policy if exists "Admin insert catalog_settings" on public.catalog_settings;
drop policy if exists "Admin update catalog_settings" on public.catalog_settings;
drop policy if exists "Admin delete catalog_settings" on public.catalog_settings;
drop policy if exists "catalog_settings_select_public" on public.catalog_settings;
drop policy if exists "catalog_settings_select_own" on public.catalog_settings;
drop policy if exists "catalog_settings_write_own" on public.catalog_settings;

create policy "catalog_settings_select_public"
  on public.catalog_settings
  for select
  using (true);

create policy "catalog_settings_write_own"
  on public.catalog_settings
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

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

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.catalog_settings to authenticated;

