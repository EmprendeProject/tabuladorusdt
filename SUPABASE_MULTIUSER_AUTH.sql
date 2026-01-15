-- =========================================================
-- MULTI-USUARIO: Registro/Login + Tiendas + Productos por usuario
--
-- Qué resuelve:
-- - Los usuarios se registran con Supabase Auth (email + password)
-- - Cada usuario tiene su perfil y su "tienda" (nombre del negocio, teléfono, dirección opcional)
-- - Cada usuario crea/edita/borrar SOLO sus productos
-- - El catálogo público puede filtrar por tienda (handle)
--
-- IMPORTANTE:
-- - NO guardes la contraseña en tablas. La contraseña la gestiona Supabase Auth.
-- - El correo también vive en Auth. Aquí guardamos datos adicionales.
--
-- Ejecuta TODO este script en Supabase SQL Editor.
-- =========================================================

-- (Opcional) Para gen_random_uuid()
create extension if not exists pgcrypto;

-- =========================================================
-- PERFILES (privado): nombre, teléfono, dirección
-- =========================================================
create table if not exists public.perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  nombre_completo text not null default '',
  telefono text not null default '',
  direccion text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Si la tabla ya existía antes de este cambio
alter table public.perfiles add column if not exists email text;

alter table public.perfiles enable row level security;

drop policy if exists "perfiles_select_own" on public.perfiles;
drop policy if exists "perfiles_insert_own" on public.perfiles;
drop policy if exists "perfiles_update_own" on public.perfiles;

create policy "perfiles_select_own"
  on public.perfiles
  for select
  using (auth.uid() = user_id);

create policy "perfiles_insert_own"
  on public.perfiles
  for insert
  with check (auth.uid() = user_id);

create policy "perfiles_update_own"
  on public.perfiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================================
-- CONTACTO PÚBLICO DEL CATÁLOGO (recomendado)
--
-- Objetivo:
-- - El botón de WhatsApp del catálogo público necesita un teléfono.
-- - Mantener `perfiles` privado (incluye email/dirección).
-- - Exponer SOLO el teléfono en una tabla aparte con lectura pública.
--
-- Nota:
-- - La app sincroniza este valor cuando el usuario guarda su perfil.
-- =========================================================
create table if not exists public.catalog_contactos (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  telefono text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalog_contactos enable row level security;

drop policy if exists "catalog_contactos_select_public" on public.catalog_contactos;
drop policy if exists "catalog_contactos_insert_own" on public.catalog_contactos;
drop policy if exists "catalog_contactos_update_own" on public.catalog_contactos;

create policy "catalog_contactos_select_public"
  on public.catalog_contactos
  for select
  using (true);

create policy "catalog_contactos_insert_own"
  on public.catalog_contactos
  for insert
  with check (auth.uid() = owner_id);

create policy "catalog_contactos_update_own"
  on public.catalog_contactos
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists update_catalog_contactos_updated_at on public.catalog_contactos;
create trigger update_catalog_contactos_updated_at
  before update on public.catalog_contactos
  for each row
  execute function public.update_updated_at_column();

-- =========================================================
-- TIENDAS (público): handle + nombre del negocio
-- =========================================================
create table if not exists public.tiendas (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null,
  nombre_negocio text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tiendas_handle_unique_ci
  on public.tiendas (lower(handle));

alter table public.tiendas enable row level security;

drop policy if exists "tiendas_select_public" on public.tiendas;
drop policy if exists "tiendas_select_own" on public.tiendas;
drop policy if exists "tiendas_insert_own" on public.tiendas;
drop policy if exists "tiendas_update_own" on public.tiendas;

-- Cualquiera puede resolver handle -> owner_id y ver el nombre del negocio
create policy "tiendas_select_public"
  on public.tiendas
  for select
  using (true);

-- El dueño también puede ver su tienda (redundante, pero claro)
create policy "tiendas_select_own"
  on public.tiendas
  for select
  using (auth.uid() = owner_id);

-- Solo el dueño puede crear/actualizar su tienda
create policy "tiendas_insert_own"
  on public.tiendas
  for insert
  with check (auth.uid() = owner_id);

create policy "tiendas_update_own"
  on public.tiendas
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- =========================================================
-- PRODUCTOS: agregar owner_id y RLS por dueño
-- =========================================================
-- Si ya existe la tabla productos del proyecto, solo añadimos columnas.
alter table public.productos add column if not exists owner_id uuid;

-- Índices útiles
create index if not exists idx_productos_owner_id on public.productos(owner_id);
create index if not exists idx_productos_owner_activo on public.productos(owner_id, activo);

-- (Opcional) Backfill para productos existentes (si ya tenías un solo admin)
-- Reemplaza el UUID por tu usuario actual si quieres que sus productos sigan apareciendo.
-- update public.productos set owner_id = 'REPLACE_WITH_ADMIN_UUID'::uuid where owner_id is null;

-- Recomendación: hacer owner_id NOT NULL cuando ya hiciste el backfill.
-- alter table public.productos alter column owner_id set not null;

alter table public.productos enable row level security;

-- Limpieza de policies antiguas (admin fijo)
drop policy if exists "Public read productos" on public.productos;
drop policy if exists "Admin read productos" on public.productos;
drop policy if exists "Admin insert productos" on public.productos;
drop policy if exists "Admin update productos" on public.productos;
drop policy if exists "Admin delete productos" on public.productos;

drop policy if exists "productos_select_public" on public.productos;
drop policy if exists "productos_select_own" on public.productos;
drop policy if exists "productos_insert_own" on public.productos;
drop policy if exists "productos_update_own" on public.productos;
drop policy if exists "productos_delete_own" on public.productos;

-- Lectura pública SOLO de activos
create policy "productos_select_public"
  on public.productos
  for select
  using (activo = true);

-- El dueño puede ver TODO (activos e inactivos)
create policy "productos_select_own"
  on public.productos
  for select
  using (auth.uid() = owner_id);

-- CRUD solo dueño
create policy "productos_insert_own"
  on public.productos
  for insert
  with check (auth.uid() = owner_id);

create policy "productos_update_own"
  on public.productos
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "productos_delete_own"
  on public.productos
  for delete
  using (auth.uid() = owner_id);

-- =========================================================
-- CATEGORIAS (privado por usuario)
--
-- Nota:
-- - `productos.categoria` sigue siendo texto.
-- - Esta tabla es solo para sugerencias/lista en el dashboard.
-- - Cada usuario ve y gestiona SOLO sus categorías.
-- =========================================================

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_categorias_owner_id on public.categorias(owner_id);

-- Evita duplicados por usuario (case-insensitive)
create unique index if not exists categorias_owner_nombre_unique_ci
  on public.categorias (owner_id, lower(nombre));

alter table public.categorias enable row level security;

drop policy if exists "categorias_select_own" on public.categorias;
drop policy if exists "categorias_insert_own" on public.categorias;
drop policy if exists "categorias_update_own" on public.categorias;
drop policy if exists "categorias_delete_own" on public.categorias;

create policy "categorias_select_own"
  on public.categorias
  for select
  using (auth.uid() = owner_id);

create policy "categorias_insert_own"
  on public.categorias
  for insert
  with check (auth.uid() = owner_id);

create policy "categorias_update_own"
  on public.categorias
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "categorias_delete_own"
  on public.categorias
  for delete
  using (auth.uid() = owner_id);

-- =========================================================
-- updated_at automático (reusa tu función si ya existe)
-- =========================================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Triggers (idempotentes)
drop trigger if exists update_perfiles_updated_at on public.perfiles;
create trigger update_perfiles_updated_at
  before update on public.perfiles
  for each row
  execute function public.update_updated_at_column();

drop trigger if exists update_tiendas_updated_at on public.tiendas;
create trigger update_tiendas_updated_at
  before update on public.tiendas
  for each row
  execute function public.update_updated_at_column();

-- =========================================================
-- SUPERADMIN + SUSCRIPCIONES
--
-- Objetivo:
-- - Tener un panel /superadmin para ver todas las cuentas (tiendas)
-- - Marcar si una suscripción está activa/inactiva con un toggle
-- - Controlar acceso con RLS (solo superadmin)
--
-- Nota:
-- - Para darte permisos de superadmin, debes insertar tu user_id en `app_admins`
--   desde el SQL Editor (como admin del proyecto).
-- =========================================================

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'superadmin',
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.app_admins a
    where a.user_id = auth.uid()
      and a.role = 'superadmin'
  );
$$;

drop policy if exists "app_admins_select_self" on public.app_admins;
drop policy if exists "app_admins_select_superadmin" on public.app_admins;
drop policy if exists "app_admins_write_superadmin" on public.app_admins;

-- Permite que un usuario consulte si él mismo es superadmin.
create policy "app_admins_select_self"
  on public.app_admins
  for select
  using (auth.uid() = user_id);

-- Permite que un superadmin liste admins.
create policy "app_admins_select_superadmin"
  on public.app_admins
  for select
  using (public.is_superadmin());

-- Solo superadmin puede insertar/actualizar/eliminar.
create policy "app_admins_write_superadmin"
  on public.app_admins
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create table if not exists public.suscripciones (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'Free',
  activa boolean not null default false,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.suscripciones enable row level security;

drop policy if exists "suscripciones_select" on public.suscripciones;
drop policy if exists "suscripciones_insert_superadmin" on public.suscripciones;
drop policy if exists "suscripciones_update_superadmin" on public.suscripciones;
drop policy if exists "suscripciones_delete_superadmin" on public.suscripciones;

-- El superadmin puede ver todas; el dueño puede ver la suya (opcional, útil para futuro)
create policy "suscripciones_select"
  on public.suscripciones
  for select
  using (public.is_superadmin() or auth.uid() = owner_id);

create policy "suscripciones_insert_superadmin"
  on public.suscripciones
  for insert
  with check (public.is_superadmin());

create policy "suscripciones_update_superadmin"
  on public.suscripciones
  for update
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "suscripciones_delete_superadmin"
  on public.suscripciones
  for delete
  using (public.is_superadmin());

drop trigger if exists update_suscripciones_updated_at on public.suscripciones;
create trigger update_suscripciones_updated_at
  before update on public.suscripciones
  for each row
  execute function public.update_updated_at_column();

-- Permitir al superadmin leer perfiles (email) para el panel.
drop policy if exists "perfiles_select_superadmin" on public.perfiles;
create policy "perfiles_select_superadmin"
  on public.perfiles
  for select
  using (public.is_superadmin());

-- =========================================================
-- NOTA sobre email/clave
-- =========================================================
-- Email y contraseña se gestionan en: Authentication -> Users
-- Este script NO crea columna de contraseña (por seguridad).
-- Para "jugar" con el email desde SQL/joins en tu esquema public, guardamos una copia del email en public.perfiles.email.

-- =========================================================
-- BOOTSTRAP SUPERADMIN (ejemplo)
-- =========================================================
-- Reemplaza el UUID por tu usuario (Auth -> Users) y ejecútalo UNA VEZ:
-- insert into public.app_admins (user_id, role)
-- values ('REEMPLAZA_CON_TU_UUID'::uuid, 'superadmin')
-- on conflict (user_id) do update set role = excluded.role;

-- =========================================================
-- PERMISOS (GRANTS) recomendados
--
-- Nota:
-- - RLS controla QUÉ filas puedes ver.
-- - GRANT controla SI puedes acceder a la tabla.
-- - Si faltan GRANTs, la app puede fallar con "permission denied" aunque tengas policies.
-- =========================================================

grant usage on schema public to anon, authenticated;

grant select on table public.app_admins to anon, authenticated;
grant select, insert, update, delete on table public.suscripciones to authenticated;

