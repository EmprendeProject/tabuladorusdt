-- ============================================
-- POLÍTICAS RLS PARA SUPABASE STORAGE (BUCKET: product-images)
-- ============================================
-- Objetivo:
-- - Lectura pública de imágenes (para el catálogo)
-- - Subida/edición/borrado SOLO por el dueño de la carpeta
--   (multiusuario): productos/{auth.uid()}/...
--
-- Nota: este script asume que el bucket se llama "product-images".
-- Si usas otro nombre, cambia bucket_id en todas las policies.

-- Asegurar RLS activo (normalmente ya lo está en Supabase)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Limpieza: borra policies antiguas si existen (por si ya probaste otras)
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Public insert product images" ON storage.objects;
DROP POLICY IF EXISTS "Public update product images" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated insert product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;

DROP POLICY IF EXISTS "Admin insert product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read product images (productos folder)" ON storage.objects;

DROP POLICY IF EXISTS "User insert own product images" ON storage.objects;
DROP POLICY IF EXISTS "User update own product images" ON storage.objects;
DROP POLICY IF EXISTS "User delete own product images" ON storage.objects;

-- 1) Lectura pública (solo el bucket de imágenes)
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-images'
);

-- 2) Insert (subir) solo usuario autenticado dentro de su carpeta productos/{uid}/
CREATE POLICY "User insert own product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('productos/' || auth.uid()::text || '/%')
);

-- 3) Update (necesario si usas upsert=true) solo usuario dentro de su carpeta
CREATE POLICY "User update own product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('productos/' || auth.uid()::text || '/%')
)
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('productos/' || auth.uid()::text || '/%')
);

-- 4) Delete (por si algún día quieres limpiar imágenes viejas) solo usuario dentro de su carpeta
CREATE POLICY "User delete own product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('productos/' || auth.uid()::text || '/%')
);

-- ============================================
-- POLÍTICAS RLS PARA COMPROBANTES (BUCKET: payment-proofs)
-- ============================================
-- Objetivo:
-- - Bucket PRIVADO (sin lectura pública)
-- - El usuario solo puede subir/ver/borrar sus comprobantes en:
--     payments/{auth.uid()}/...
-- - El superadmin puede ver TODOS los comprobantes para verificar pagos.

DROP POLICY IF EXISTS "User select own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "User insert own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "User update own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "User delete own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin select payment proofs" ON storage.objects;

-- 1) Select: dueño de su carpeta
CREATE POLICY "User select own payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('payments/' || auth.uid()::text || '/%')
);

-- 1b) Select: superadmin puede ver todos
CREATE POLICY "Superadmin select payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND public.is_superadmin()
);

-- 2) Insert: dueño dentro de su carpeta
CREATE POLICY "User insert own payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('payments/' || auth.uid()::text || '/%')
);

-- 3) Update: dueño dentro de su carpeta (por si usas upsert)
CREATE POLICY "User update own payment proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-proofs'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('payments/' || auth.uid()::text || '/%')
)
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('payments/' || auth.uid()::text || '/%')
);

-- 4) Delete: dueño dentro de su carpeta
CREATE POLICY "User delete own payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs'
  AND auth.uid() IS NOT NULL
  AND name LIKE ('payments/' || auth.uid()::text || '/%')
);
