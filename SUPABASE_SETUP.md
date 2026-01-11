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

### Tiempo Real
- Suscripciones en tiempo real
- Cambios en tiempo real en la base de datos

## 📚 Ejemplos de Uso

Ver el archivo `src/examples/supabase-examples.js` para ejemplos prácticos.
