# Guía de Configuración de Supabase

## 📋 Pasos para Configurar Supabase

### 1. Crear una cuenta en Supabase
1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto

### 2. Obtener las credenciales
1. En tu proyecto de Supabase, ve a **Settings** > **API**
2. Copia los siguientes valores:
   - **Project URL** (ejemplo: `https://xxxxx.supabase.co`)
   - **anon public key** (una clave larga que comienza con `eyJ...`)

### 3. Configurar variables de entorno
1. Crea un archivo `.env` en la raíz del proyecto
2. Agrega las siguientes variables:

```env
VITE_SUPABASE_URL=tu-project-url-aqui
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**⚠️ IMPORTANTE:** 
- El archivo `.env` NO debe subirse a GitHub (ya está en .gitignore)
- Usa `.env.example` como plantilla para otros desarrolladores

### 4. Reiniciar el servidor de desarrollo
Después de crear el archivo `.env`, reinicia el servidor:
```bash
npm run dev
```

## 🗄️ Casos de Uso Comunes

### Base de Datos (PostgreSQL)
Supabase incluye una base de datos PostgreSQL completa. Puedes:
- Crear tablas desde el dashboard
- Hacer consultas SQL
- Usar el editor SQL integrado

### Autenticación
- Email/Password
- OAuth (Google, GitHub, etc.)
- Magic Links
- Autenticación anónima

### Almacenamiento
- Subir archivos
- Gestionar buckets
- URLs públicas/privadas

## 🎨 Plantillas del Catálogo (2 estilos)

El catálogo público (ruta `/`) puede mostrarse con 2 estilos: `simple` o `boutique`.

Esto se guarda en la tabla `catalog_settings` (una fila con `id=1`).

1) Ejecuta el SQL actualizado en:
- [supabase-schema.sql](supabase-schema.sql)

Si solo te falta esa tabla (o el SQL completo falló), ejecuta solo este script:
- [supabase-catalog-settings.sql](supabase-catalog-settings.sql)

2) En el dashboard admin (`/admin`) verás un selector para cambiar la plantilla.

## 🖼️ Imágenes de Productos (Storage)

Este proyecto puede subir imágenes desde tu PC a Supabase Storage y guardar la URL pública en la tabla `productos.imagen_url`.

### 1) Crear bucket
1. En Supabase, ve a **Storage**
2. Crea un bucket llamado: `product-images`
3. Recomendación: marcarlo como **Public** (más simple para mostrar imágenes en el catálogo)

Si quieres usar otro nombre de bucket, puedes configurarlo en tu `.env`:

```env
VITE_SUPABASE_PRODUCT_IMAGES_BUCKET=product-images
```

### 2) Políticas (si usas RLS en Storage)
Si tu proyecto tiene políticas estrictas en Storage, asegúrate de permitir al menos:
- `SELECT` (leer) para mostrar imágenes
- `INSERT` (subir) para cargar imágenes

Si te aparece el error:

> `new row violates row-level security policy`

significa que **Storage tiene RLS activo** y te falta la política de `INSERT` (y normalmente `UPDATE` si usas `upsert`).

Puedes crear políticas desde el **SQL Editor** (recomendado) con este ejemplo para el bucket `product-images`:

```sql
-- Permitir lectura pública de imágenes del bucket
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Permitir subir imágenes (INSERT) SOLO a tu usuario admin
-- Reemplaza el UUID por tu usuario en Auth -> Users
CREATE POLICY "Admin insert product images"
ON storage.objects FOR INSERT
WITH CHECK (
   bucket_id = 'product-images'
   AND auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid
);

-- Permitir upsert (UPDATE) SOLO a tu usuario admin (necesario si usas upsert=true)
CREATE POLICY "Admin update product images"
ON storage.objects FOR UPDATE
USING (
   bucket_id = 'product-images'
   AND auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid
)
WITH CHECK (
   bucket_id = 'product-images'
   AND auth.uid() = '3513c316-f794-4e72-9e5d-543551565730'::uuid
);
```

Opcional (más restrictivo): limitar a una carpeta específica, por ejemplo `productos/`:

```sql
-- Ejemplo: permitir solo dentro de productos/
CREATE POLICY "Public insert product images (productos folder)"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND name LIKE 'productos/%');
```

Nota: con estas políticas, aunque tu app use `anon key`, solo tu usuario admin podrá subir/editar objetos en el bucket (porque exige `auth.uid() = ...`).

En este proyecto, como el objetivo es **catálogo público** pero **admin privado**, la recomendación es:
- `storage.objects`: `SELECT` público, `INSERT/UPDATE` solo admin.
- `public.productos`: `SELECT` público, `INSERT/UPDATE/DELETE` solo admin.

Si quieres que sea solo para 1 admin (tú), usa `auth.uid() = '<TU_UUID>'` como está en el ejemplo.

Más fácil: usa el script listo del repo:
- [supabase-storage-policies.sql](supabase-storage-policies.sql)

Puedes ver un ejemplo completo en `supabase-schema.sql`.

En la práctica, si el bucket es **Public**, podrás obtener URLs públicas directamente.

### 3) Uso en el Dashboard
- En el Dashboard, en cada producto puedes pegar una URL en "Imagen (URL)" o subir un archivo.
- Al subir un archivo, la imagen se **redimensiona y comprime automáticamente** (para que pese menos), luego se genera una URL pública y se guarda en el producto (queda pendiente de persistir hasta presionar "Guardar Cambios").

### Tiempo Real
- Suscripciones en tiempo real
- Cambios en tiempo real en la base de datos

## 📚 Ejemplos de Uso

Ver el archivo `src/examples/supabase-examples.js` para ejemplos prácticos.
