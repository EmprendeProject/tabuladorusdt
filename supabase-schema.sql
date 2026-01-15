

-- =============================================
-- CATEGORIAS
-- =============================================

-- Tabla de categorías por usuario (lista sugerida).
-- Los productos siguen usando `productos.categoria` (texto).
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_categorias_owner_id on public.categorias(owner_id);

-- Único por usuario (case-insensitive)
create unique index if not exists categorias_owner_nombre_unique_ci
  on public.categorias (owner_id, lower(nombre));

alter table public.categorias enable row level security;

-- Limpieza por si ya existen (idempotente)
drop policy if exists "categorias_select_public" on public.categorias;
drop policy if exists "categorias_insert_admin" on public.categorias;
drop policy if exists "categorias_update_admin" on public.categorias;
drop policy if exists "categorias_delete_admin" on public.categorias;
drop policy if exists "categorias_select_own" on public.categorias;
drop policy if exists "categorias_insert_own" on public.categorias;
drop policy if exists "categorias_update_own" on public.categorias;
drop policy if exists "categorias_delete_own" on public.categorias;

-- Solo el dueño ve/crea/edita/borra
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
-- Para usar este esquema:
-- 1. Ve a tu proyecto en Supabase
-- 2. Abre el SQL Editor
-- 3. Pega este código y ejecútalo
-- ============================================

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  precio_usdt DECIMAL(10, 2) NOT NULL DEFAULT 0,
  profit DECIMAL(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Si tu tabla ya existe, puedes ejecutar este bloque para agregar columnas sin perder datos:
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo BOOLEAN;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Backfill y asegurar NOT NULL + DEFAULT (idempotente)
UPDATE productos SET activo = true WHERE activo IS NULL;
ALTER TABLE productos ALTER COLUMN activo SET DEFAULT true;
ALTER TABLE productos ALTER COLUMN activo SET NOT NULL;

-- Categoría (idempotente)
ALTER TABLE productos ALTER COLUMN categoria SET DEFAULT 'General';
UPDATE productos SET categoria = 'General' WHERE categoria IS NULL;

-- Crear tabla de tasas (opcional - para guardar historial)
CREATE TABLE IF NOT EXISTS tasas (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('BCV', 'USDT')),
  valor DECIMAL(10, 2) NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Configuración del catálogo público (1 fila)
-- Permite escoger entre 2 plantillas: simple | boutique
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

-- Asegurar que exista la fila única
INSERT INTO public.catalog_settings (id, catalog_template)
VALUES (1, 'simple')
ON CONFLICT (id) DO NOTHING;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_created_at ON productos(created_at);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_tasas_tipo_fecha ON tasas(tipo, fecha);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS RECOMENDADAS (CATÁLOGO PÚBLICO + ADMIN PRIVADO)
--
-- Objetivo:
-- - Cualquiera (incluyendo anon) puede LEER productos (catálogo compartible)
-- - Solo TU usuario admin puede CREAR/EDITAR/ELIMINAR (dashboard)
--
-- Si ya habías creado políticas con otros nombres, puedes borrarlas desde
-- el Dashboard (Authentication -> Policies) o usando DROP POLICY.
-- ============================================

-- UUID del usuario admin (Auth -> Users)
-- Cambia este valor si tu usuario admin cambia.
-- Nota: auth.uid() devuelve uuid.
--
-- Admin actual:
-- 3513c316-f794-4e72-9e5d-543551565730

DROP POLICY IF EXISTS "Permitir lectura pública de productos" ON public.productos;
DROP POLICY IF EXISTS "Permitir inserción pública de productos" ON public.productos;
DROP POLICY IF EXISTS "Permitir actualización pública de productos" ON public.productos;
DROP POLICY IF EXISTS "Permitir eliminación pública de productos" ON public.productos;

DROP POLICY IF EXISTS "Public read productos" ON public.productos;
DROP POLICY IF EXISTS "Authenticated insert productos" ON public.productos;
DROP POLICY IF EXISTS "Authenticated update productos" ON public.productos;
DROP POLICY IF EXISTS "Authenticated delete productos" ON public.productos;
DROP POLICY IF EXISTS "Admin insert productos" ON public.productos;
DROP POLICY IF EXISTS "Admin update productos" ON public.productos;
DROP POLICY IF EXISTS "Admin delete productos" ON public.productos;

CREATE POLICY "Public read productos"
  ON public.productos FOR SELECT
  USING (activo = true);

-- Permitir que el admin vea también productos inactivos (necesario para poder reactivarlos)
DROP POLICY IF EXISTS "Admin read productos" ON public.productos;
CREATE POLICY "Admin read productos"
  ON public.productos FOR SELECT
  USING (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

CREATE POLICY "Admin insert productos"
  ON public.productos FOR INSERT
  WITH CHECK (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

CREATE POLICY "Admin update productos"
  ON public.productos FOR UPDATE
  USING (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid)
  WITH CHECK (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

CREATE POLICY "Admin delete productos"
  ON public.productos FOR DELETE
  USING (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

-- Políticas para tasas
DROP POLICY IF EXISTS "Permitir lectura pública de tasas" ON public.tasas;
DROP POLICY IF EXISTS "Permitir inserción pública de tasas" ON public.tasas;

DROP POLICY IF EXISTS "Public read tasas" ON public.tasas;
DROP POLICY IF EXISTS "Authenticated insert tasas" ON public.tasas;
DROP POLICY IF EXISTS "Authenticated update tasas" ON public.tasas;
DROP POLICY IF EXISTS "Authenticated delete tasas" ON public.tasas;
DROP POLICY IF EXISTS "Admin insert tasas" ON public.tasas;
DROP POLICY IF EXISTS "Admin update tasas" ON public.tasas;
DROP POLICY IF EXISTS "Admin delete tasas" ON public.tasas;

CREATE POLICY "Public read tasas"
  ON public.tasas FOR SELECT
  USING (true);

CREATE POLICY "Admin insert tasas"
  ON public.tasas FOR INSERT
  WITH CHECK (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

CREATE POLICY "Admin update tasas"
  ON public.tasas FOR UPDATE
  USING (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid)
  WITH CHECK (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

CREATE POLICY "Admin delete tasas"
  ON public.tasas FOR DELETE
  USING (auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid);

-- Políticas para catalog_settings
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

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en productos
CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en catalog_settings
DROP TRIGGER IF EXISTS update_catalog_settings_updated_at ON public.catalog_settings;
CREATE TRIGGER update_catalog_settings_updated_at
  BEFORE UPDATE ON public.catalog_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar datos de ejemplo (opcional)
INSERT INTO productos (nombre, precio_usdt, profit) VALUES
  ('papa chip', 54, 22),
  ('papa congelada', 21, 22),
  ('facilita kraft', 8, 22)
ON CONFLICT DO NOTHING;
