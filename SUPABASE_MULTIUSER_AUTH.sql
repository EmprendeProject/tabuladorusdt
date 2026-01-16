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

-- Soporte multi-foto (máx 3 por producto)
alter table public.productos add column if not exists imagenes_urls text[];

-- Constraint: máx 3 fotos (idempotente)
alter table public.productos drop constraint if exists productos_imagenes_urls_max_3;
alter table public.productos
  add constraint productos_imagenes_urls_max_3
  check (coalesce(array_length(imagenes_urls, 1), 0) <= 3);

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
-- CATALOG_SETTINGS (plantilla del catálogo por usuario)
-- =========================================================

create table if not exists public.catalog_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  catalog_template text not null default 'simple' check (catalog_template in ('simple', 'boutique', 'modern', 'heavy')),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.catalog_settings enable row level security;

drop policy if exists "catalog_settings_select_public" on public.catalog_settings;
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

drop trigger if exists update_catalog_settings_updated_at on public.catalog_settings;
create trigger update_catalog_settings_updated_at
  before update on public.catalog_settings
  for each row
  execute function public.update_updated_at_column();

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.catalog_settings to authenticated;

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

-- Permite que un usuario consulte si él mismo es superadmin.
create policy "app_admins_select_self"
  on public.app_admins
  for select
  using (auth.uid() = user_id);

-- IMPORTANTE:
-- No creamos policies que llamen a public.is_superadmin() SOBRE la tabla public.app_admins,
-- porque public.is_superadmin() consulta public.app_admins y eso puede causar recursión
-- (stack depth limit exceeded). La administración de app_admins se hace desde SQL Editor.

create table if not exists public.suscripciones (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'Free',
  activa boolean not null default false,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- TRIAL AUTOMÁTICO: 5 días gratis al registrarse
--
-- Crea una suscripción inicial al momento de crear un usuario en auth.users.
-- Nota: se usa SECURITY DEFINER (patrón estándar Supabase) y ON CONFLICT DO NOTHING
-- para que sea idempotente.
-- =========================================================

create or replace function public.handle_new_user_trial_5_days()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.suscripciones (owner_id, plan, activa, expires_at)
  values (new.id, 'trial', true, now() + interval '5 days')
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_trial_5_days on auth.users;
create trigger on_auth_user_created_trial_5_days
  after insert on auth.users
  for each row
  execute function public.handle_new_user_trial_5_days();

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
-- SOLICITUDES DE PAGO (manual): comprobante + aprobación
--
-- Flujo:
-- - El dueño envía una solicitud desde /checkout (status = pending)
-- - El superadmin revisa en /superadmin (tab Cobros) y aprueba/rechaza
-- - Al aprobar, se activa/actualiza public.suscripciones
--
-- Nota:
-- - `comprobante_path` apunta a un objeto en Supabase Storage (bucket privado).
-- =========================================================

create table if not exists public.solicitudes_pago (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  plan_price_usd numeric(10,2) not null,
  metodo text not null check (metodo in ('ves', 'binance')),
  monto_bs numeric(14,2) null,
  referencia text not null,
  fecha_pago date not null,
  comprobante_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  review_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_solicitudes_pago_owner_id on public.solicitudes_pago(owner_id);
create index if not exists idx_solicitudes_pago_status_created_at on public.solicitudes_pago(status, created_at);

alter table public.solicitudes_pago enable row level security;

drop policy if exists "solicitudes_pago_select" on public.solicitudes_pago;
drop policy if exists "solicitudes_pago_insert_own" on public.solicitudes_pago;
drop policy if exists "solicitudes_pago_update_superadmin" on public.solicitudes_pago;
drop policy if exists "solicitudes_pago_delete_superadmin" on public.solicitudes_pago;

-- El dueño ve sus solicitudes; el superadmin ve todas.
create policy "solicitudes_pago_select"
  on public.solicitudes_pago
  for select
  using (public.is_superadmin() or auth.uid() = owner_id);

-- El dueño crea su solicitud.
create policy "solicitudes_pago_insert_own"
  on public.solicitudes_pago
  for insert
  with check (auth.uid() = owner_id);

-- Solo el superadmin puede actualizar (aprobar/rechazar).
create policy "solicitudes_pago_update_superadmin"
  on public.solicitudes_pago
  for update
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- (Opcional) Solo superadmin puede borrar.
create policy "solicitudes_pago_delete_superadmin"
  on public.solicitudes_pago
  for delete
  using (public.is_superadmin());

drop trigger if exists update_solicitudes_pago_updated_at on public.solicitudes_pago;
create trigger update_solicitudes_pago_updated_at
  before update on public.solicitudes_pago
  for each row
  execute function public.update_updated_at_column();

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

-- =========================================================
-- CATÁLOGO PÚBLICO: disponibilidad por suscripción
--
-- Permite que el frontend (anon key) consulte si un catálogo está habilitado
-- sin exponer la tabla `suscripciones` públicamente.
--
-- Uso desde JS:
--   supabase.rpc('is_catalog_active', { p_owner_id: '<uuid>' })
-- =========================================================

create or replace function public.is_catalog_active(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (s.activa = true) and (s.expires_at is null or s.expires_at > now())
      from public.suscripciones s
      where s.owner_id = p_owner_id
      limit 1
    ),
    false
  );
$$;

grant execute on function public.is_catalog_active(uuid) to anon, authenticated;

grant select, insert, update, delete on table public.solicitudes_pago to authenticated;

