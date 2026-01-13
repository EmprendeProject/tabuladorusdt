-- ============================================
-- POLÍTICAS RLS PARA SUPABASE STORAGE (BUCKET: product-images)
-- ============================================
-- Objetivo:
-- - Lectura pública de imágenes (para el catálogo)
-- - Subida/edición/borrado SOLO por tu usuario admin
--
-- Admin UUID:
-- 3513c316-f794-4e72-9e5d-543551565730
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

-- 1) Lectura pública (solo el bucket de imágenes)
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-images'
);

-- 2) Insert (subir) solo admin, y además restringido a la carpeta productos/
CREATE POLICY "Admin insert product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND name LIKE 'productos/%'
  AND auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid
);

-- 3) Update (necesario si usas upsert=true) solo admin, misma carpeta
CREATE POLICY "Admin update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND name LIKE 'productos/%'
  AND auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid
)
WITH CHECK (
  bucket_id = 'product-images'
  AND name LIKE 'productos/%'
  AND auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid
);

-- 4) Delete (por si algún día quieres limpiar imágenes viejas) solo admin
CREATE POLICY "Admin delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND name LIKE 'productos/%'
  AND auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid
);
