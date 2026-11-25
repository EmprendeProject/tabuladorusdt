-- =========================================================
-- CATALY PREMIUM
--
-- Qué agrega:
--   1) Nivel de suscripción (tier): 'standard' | 'premium'
--   2) Multi-catálogo: cada cuenta puede tener varios catálogos (tiendas).
--      - Estándar: 1 catálogo. Premium: hasta 3.
--      - productos / categorias / catalog_settings pasan a colgar de `tienda_id`.
--      - El catálogo que ya existía queda como "principal" (es_principal = true).
--   3) Páginas Premium (tabla `paginas`): homepage del negocio, link en la bio y
--      landing pages (con pixel de Meta).
--   4) Links únicos compartidos: un link (cataly.app/xxx) no puede ser a la vez
--      un catálogo y una página.
--
-- Si un Premium vence o baja a Estándar:
--   - Solo el catálogo principal sigue público. Los extras y las páginas se ocultan
--     (NO se borran) hasta que renueve.
--
-- Cómo ejecutarlo:
--   - Supabase -> SQL Editor -> pega TODO el archivo -> Run.
--   - Es idempotente (se puede correr más de una vez).
--   - Despliega el frontend nuevo justo después: el frontend viejo guarda la
--     plantilla por owner_id y dejará de funcionar tras esta migración.
--   - Recomendado: haz un backup (Database -> Backups) antes de correrlo.
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1) TIER EN SUSCRIPCIONES
-- =========================================================
alter table public.suscripciones
  add column if not exists tier text not null default 'standard';

alter table public.suscripciones drop constraint if exists suscripciones_tier_check;
alter table public.suscripciones
  add constraint suscripciones_tier_check check (tier in ('standard', 'premium'));

-- ¿El usuario tiene Premium vigente?
create or replace function public.has_premium(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.tier = 'premium'
         and s.activa = true
         and (s.expires_at is null or s.expires_at > now())
      from public.suscripciones s
      where s.owner_id = p_owner_id
      limit 1
    ),
    false
  );
$$;

grant execute on function public.has_premium(uuid) to anon, authenticated;

-- Límite de catálogos según el plan
create or replace function public.max_tiendas_for(p_owner_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when public.has_premium(p_owner_id) then 3 else 1 end;
$$;

grant execute on function public.max_tiendas_for(uuid) to authenticated;

-- =========================================================
-- 2) TIENDAS: varias por usuario
-- =========================================================
alter table public.tiendas
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.tiendas
  add column if not exists es_principal boolean not null default true;

-- Cambiar la clave primaria de owner_id -> id
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tiendas'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) ilike '%(owner_id)%'
  ) then
    execute (
      select format('alter table public.tiendas drop constraint %I', conname)
      from pg_constraint
      where conrelid = 'public.tiendas'::regclass and contype = 'p'
    );
    alter table public.tiendas add constraint tiendas_pkey primary key (id);
  end if;
end $$;

create index if not exists idx_tiendas_owner_id on public.tiendas(owner_id);

-- Solo un catálogo principal por usuario
create unique index if not exists tiendas_one_principal_per_owner
  on public.tiendas(owner_id)
  where es_principal;

-- Antes de crear: el primero es principal, los demás no, y se respeta el límite del plan.
create or replace function public.tiendas_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_max integer;
begin
  select count(*) into v_count from public.tiendas where owner_id = new.owner_id;

  if v_count = 0 then
    new.es_principal := true;
  else
    new.es_principal := false;
    v_max := public.max_tiendas_for(new.owner_id);
    if v_count >= v_max then
      raise exception 'LIMITE_CATALOGOS: tu plan permite % catálogo(s).', v_max
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tiendas_before_insert on public.tiendas;
create trigger tiendas_before_insert
  before insert on public.tiendas
  for each row
  execute function public.tiendas_before_insert();

-- No se puede cambiar de dueño ni de "principal" desde el cliente.
create or replace function public.tiendas_before_update()
returns trigger
language plpgsql
as $$
begin
  new.owner_id := old.owner_id;
  new.es_principal := old.es_principal;
  return new;
end;
$$;

drop trigger if exists tiendas_before_update on public.tiendas;
create trigger tiendas_before_update
  before update on public.tiendas
  for each row
  execute function public.tiendas_before_update();

-- Borrar: solo el dueño y nunca el principal.
drop policy if exists "tiendas_delete_own" on public.tiendas;
create policy "tiendas_delete_own"
  on public.tiendas
  for delete
  using (auth.uid() = owner_id and es_principal = false);

grant select on public.tiendas to anon, authenticated;
grant insert, update, delete on public.tiendas to authenticated;

-- ¿Este catálogo puede verse públicamente?
-- Requiere suscripción vigente, y si no es el principal, requiere Premium.
create or replace function public.is_tienda_active(p_tienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (
        exists (
          select 1 from public.suscripciones s
          where s.owner_id = t.owner_id
            and s.activa = true
            and (s.expires_at is null or s.expires_at > now())
        )
      )
      and (t.es_principal or public.has_premium(t.owner_id))
      from public.tiendas t
      where t.id = p_tienda_id
      limit 1
    ),
    false
  );
$$;

grant execute on function public.is_tienda_active(uuid) to anon, authenticated;

-- =========================================================
-- 3) tienda_id en productos / categorias / catalog_settings
-- =========================================================

-- Trigger común: si no viene tienda_id, usa el catálogo principal del dueño.
-- Si viene, valida que ese catálogo sea del mismo dueño.
create or replace function public.set_default_tienda_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tienda_id is null then
    if new.owner_id is not null then
      select t.id into new.tienda_id
      from public.tiendas t
      where t.owner_id = new.owner_id and t.es_principal
      limit 1;
    end if;
  elsif not exists (
    select 1 from public.tiendas t
    where t.id = new.tienda_id and t.owner_id = new.owner_id
  ) then
    raise exception 'El catálogo no pertenece a este usuario.' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------- productos ----------
alter table public.productos
  add column if not exists tienda_id uuid references public.tiendas(id) on delete cascade;

update public.productos p
set tienda_id = t.id
from public.tiendas t
where p.tienda_id is null
  and p.owner_id is not null
  and t.owner_id = p.owner_id
  and t.es_principal;

create index if not exists idx_productos_tienda_id on public.productos(tienda_id);
create index if not exists idx_productos_tienda_activo on public.productos(tienda_id, activo);

drop trigger if exists productos_set_default_tienda on public.productos;
create trigger productos_set_default_tienda
  before insert or update of tienda_id, owner_id on public.productos
  for each row
  execute function public.set_default_tienda_id();

-- ---------- categorias ----------
alter table public.categorias
  add column if not exists tienda_id uuid references public.tiendas(id) on delete cascade;

update public.categorias c
set tienda_id = t.id
from public.tiendas t
where c.tienda_id is null
  and t.owner_id = c.owner_id
  and t.es_principal;

create index if not exists idx_categorias_tienda_id on public.categorias(tienda_id);

-- Unicidad por catálogo (antes era por usuario)
drop index if exists public.categorias_owner_nombre_unique_ci;
create unique index if not exists categorias_tienda_nombre_unique_ci
  on public.categorias (tienda_id, lower(nombre));

drop trigger if exists categorias_set_default_tienda on public.categorias;
create trigger categorias_set_default_tienda
  before insert or update of tienda_id, owner_id on public.categorias
  for each row
  execute function public.set_default_tienda_id();

-- ---------- catalog_settings ----------
alter table public.catalog_settings
  add column if not exists tienda_id uuid references public.tiendas(id) on delete cascade;

update public.catalog_settings cs
set tienda_id = t.id
from public.tiendas t
where cs.tienda_id is null
  and t.owner_id = cs.owner_id
  and t.es_principal;

-- La clave pasa a ser tienda_id (antes owner_id)
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.catalog_settings'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) ilike '%(owner_id)%'
  ) then
    execute (
      select format('alter table public.catalog_settings drop constraint %I', conname)
      from pg_constraint
      where conrelid = 'public.catalog_settings'::regclass and contype = 'p'
    );
  end if;
end $$;

create unique index if not exists catalog_settings_tienda_id_key
  on public.catalog_settings(tienda_id);

create index if not exists idx_catalog_settings_owner_id on public.catalog_settings(owner_id);

drop trigger if exists catalog_settings_set_default_tienda on public.catalog_settings;
create trigger catalog_settings_set_default_tienda
  before insert or update of tienda_id, owner_id on public.catalog_settings
  for each row
  execute function public.set_default_tienda_id();

-- =========================================================
-- 4) PÁGINAS PREMIUM
-- =========================================================
create table if not exists public.paginas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('home', 'linkinbio', 'landing')),
  slug text not null,
  titulo text not null default '',
  contenido jsonb not null default '{}'::jsonb,
  meta_pixel_id text null,
  publicada boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- El pixel de Meta son solo dígitos (evita inyectar código en la página pública).
alter table public.paginas drop constraint if exists paginas_meta_pixel_id_check;
alter table public.paginas
  add constraint paginas_meta_pixel_id_check
  check (meta_pixel_id is null or meta_pixel_id ~ '^[0-9]{5,20}$');

create unique index if not exists paginas_slug_unique_ci on public.paginas (lower(slug));
create index if not exists idx_paginas_owner_id on public.paginas(owner_id);

alter table public.paginas enable row level security;

drop policy if exists "paginas_select_public" on public.paginas;
drop policy if exists "paginas_select_own" on public.paginas;
drop policy if exists "paginas_insert_own_premium" on public.paginas;
drop policy if exists "paginas_update_own_premium" on public.paginas;
drop policy if exists "paginas_delete_own" on public.paginas;

-- Público: solo publicadas y de dueños con Premium vigente
create policy "paginas_select_public"
  on public.paginas
  for select
  using (publicada = true and public.has_premium(owner_id));

-- El dueño siempre ve las suyas (aunque su Premium haya vencido)
create policy "paginas_select_own"
  on public.paginas
  for select
  using (auth.uid() = owner_id);

create policy "paginas_insert_own_premium"
  on public.paginas
  for insert
  with check (auth.uid() = owner_id and public.has_premium(auth.uid()));

create policy "paginas_update_own_premium"
  on public.paginas
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id and public.has_premium(auth.uid()));

create policy "paginas_delete_own"
  on public.paginas
  for delete
  using (auth.uid() = owner_id);

grant select on public.paginas to anon, authenticated;
grant insert, update, delete on public.paginas to authenticated;

drop trigger if exists update_paginas_updated_at on public.paginas;
create trigger update_paginas_updated_at
  before update on public.paginas
  for each row
  execute function public.update_updated_at_column();

-- Límites por tipo: 1 homepage, 1 link en la bio, hasta 5 landings.
create or replace function public.paginas_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_max integer;
begin
  v_max := case new.tipo when 'landing' then 5 else 1 end;
  select count(*) into v_count
  from public.paginas
  where owner_id = new.owner_id and tipo = new.tipo;

  if v_count >= v_max then
    raise exception 'LIMITE_PAGINAS: máximo % página(s) de tipo %.', v_max, new.tipo
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists paginas_before_insert on public.paginas;
create trigger paginas_before_insert
  before insert on public.paginas
  for each row
  execute function public.paginas_before_insert();

-- No se puede cambiar el dueño ni el tipo de una página.
create or replace function public.paginas_before_update()
returns trigger
language plpgsql
as $$
begin
  new.owner_id := old.owner_id;
  new.tipo := old.tipo;
  return new;
end;
$$;

drop trigger if exists paginas_before_update on public.paginas;
create trigger paginas_before_update
  before update on public.paginas
  for each row
  execute function public.paginas_before_update();

-- =========================================================
-- 5) LINKS ÚNICOS ENTRE CATÁLOGOS Y PÁGINAS
-- =========================================================
create or replace function public.check_slug_tienda_vs_paginas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.paginas p where lower(p.slug) = lower(new.handle)) then
    raise exception 'duplicate key: el link "%" ya está en uso (unique)', new.handle
      using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists tiendas_check_slug on public.tiendas;
create trigger tiendas_check_slug
  before insert or update of handle on public.tiendas
  for each row
  execute function public.check_slug_tienda_vs_paginas();

create or replace function public.check_slug_pagina_vs_tiendas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.tiendas t where lower(t.handle) = lower(new.slug)) then
    raise exception 'duplicate key: el link "%" ya está en uso (unique)', new.slug
      using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists paginas_check_slug on public.paginas;
create trigger paginas_check_slug
  before insert or update of slug on public.paginas
  for each row
  execute function public.check_slug_pagina_vs_tiendas();

-- ¿Está libre este link? (para validar en el formulario antes de guardar)
create or replace function public.slug_disponible(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.tiendas t where lower(t.handle) = lower(p_slug))
     and not exists (select 1 from public.paginas p where lower(p.slug) = lower(p_slug));
$$;

grant execute on function public.slug_disponible(text) to authenticated;
