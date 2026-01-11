/**
 * EJEMPLOS DE USO DE SUPABASE
 * 
 * Este archivo contiene ejemplos prácticos de cómo usar Supabase
 * en diferentes escenarios comunes.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ============================================
// 1. OPERACIONES CRUD BÁSICAS
// ============================================

// CREAR (INSERT)
export const crearProducto = async (producto) => {
  const { data, error } = await supabase
    .from('productos')
    .insert([
      {
        nombre: producto.nombre,
        precio_usdt: producto.precioUSDT,
        profit: producto.profit,
        created_at: new Date().toISOString()
      }
    ])
    .select()

  if (error) {
    console.error('Error al crear producto:', error)
    return null
  }

  return data[0]
}

// LEER (SELECT)
export const obtenerProductos = async () => {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error al obtener productos:', error)
    return []
  }

  return data
}

// ACTUALIZAR (UPDATE)
export const actualizarProducto = async (id, cambios) => {
  const { data, error } = await supabase
    .from('productos')
    .update(cambios)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error al actualizar producto:', error)
    return null
  }

  return data[0]
}

// ELIMINAR (DELETE)
export const eliminarProducto = async (id) => {
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error al eliminar producto:', error)
    return false
  }

  return true
}

// ============================================
// 2. CONSULTAS AVANZADAS
// ============================================

// Filtrar productos
export const obtenerProductosPorPrecio = async (precioMinimo) => {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .gte('precio_usdt', precioMinimo)
    .order('precio_usdt', { ascending: true })

  return data || []
}

// Búsqueda por texto
export const buscarProductos = async (termino) => {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .ilike('nombre', `%${termino}%`)

  return data || []
}

// Contar registros
export const contarProductos = async () => {
  const { count, error } = await supabase
    .from('productos')
    .select('*', { count: 'exact', head: true })

  return count || 0
}

// ============================================
// 3. TIEMPO REAL (REALTIME)
// ============================================

// Suscribirse a cambios en tiempo real
export const suscribirseProductos = (callback) => {
  const subscription = supabase
    .channel('productos-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'productos'
      },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()

  // Retornar función para desuscribirse
  return () => {
    supabase.removeChannel(subscription)
  }
}

// ============================================
// 4. AUTENTICACIÓN
// ============================================

// Registrar usuario
export const registrarUsuario = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Error al registrar:', error)
    return null
  }

  return data
}

// Iniciar sesión
export const iniciarSesion = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Error al iniciar sesión:', error)
    return null
  }

  return data
}

// Cerrar sesión
export const cerrarSesion = async () => {
  const { error } = await supabase.auth.signOut()
  return !error
}

// Obtener usuario actual
export const obtenerUsuarioActual = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Escuchar cambios de autenticación
export const escucharAuth = (callback) => {
  supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

// ============================================
// 5. ALMACENAMIENTO (STORAGE)
// ============================================

// Subir archivo
export const subirArchivo = async (bucket, path, file) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file)

  if (error) {
    console.error('Error al subir archivo:', error)
    return null
  }

  return data
}

// Obtener URL pública
export const obtenerUrlPublica = (bucket, path) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

// Descargar archivo
export const descargarArchivo = async (bucket, path) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path)

  if (error) {
    console.error('Error al descargar:', error)
    return null
  }

  return data
}

// ============================================
// 6. EJEMPLO DE HOOK PERSONALIZADO
// ============================================

// Hook para usar productos con tiempo real
export const useProductos = () => {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // Cargar productos iniciales
    const cargarProductos = async () => {
      const data = await obtenerProductos()
      setProductos(data)
      setCargando(false)
    }

    cargarProductos()

    // Suscribirse a cambios en tiempo real
    const unsubscribe = suscribirseProductos((payload) => {
      if (payload.eventType === 'INSERT') {
        setProductos(prev => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setProductos(prev =>
          prev.map(p => p.id === payload.new.id ? payload.new : p)
        )
      } else if (payload.eventType === 'DELETE') {
        setProductos(prev => prev.filter(p => p.id !== payload.old.id))
      }
    })

    return () => unsubscribe()
  }, [])

  return { productos, cargando }
}
