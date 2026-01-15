import { supabase } from '../lib/supabase'
import { slugifyHandle } from '../lib/slug'

const RESERVED_HANDLES = new Set([
  'admin',
  'superadmin',
  'login',
  'register',
  'dashboard',
  'catalogo',
  't',
  'api',
  'assets',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
])

const isUniqueViolation = (error) => {
  const msg = String(error?.message || '').toLowerCase()
  return msg.includes('duplicate key') || msg.includes('unique')
}

const randomSuffix = () => {
  // 4 dígitos, estable y simple
  const n = Math.floor(Math.random() * 9000) + 1000
  return String(n)
}

const normalizeHandle = (handle) => slugifyHandle(handle).toLowerCase()

const makeSafeHandle = (handle) => {
  const h = normalizeHandle(handle)
  if (!h) return 'mi-catalogo'
  if (RESERVED_HANDLES.has(h)) return `tienda-${h}`
  return h
}

export const tiendasRepository = {
  normalizeHandle,

  async getByHandle(handle) {
    const h = normalizeHandle(handle)

    const { data, error } = await supabase
      .from('tiendas')
      .select('owner_id,handle,nombre_negocio')
      .ilike('handle', h)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      ownerId: data.owner_id,
      handle: data.handle,
      nombreNegocio: data.nombre_negocio,
    }
  },

  async getMine() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) return null

    const { data, error } = await supabase
      .from('tiendas')
      .select('owner_id,handle,nombre_negocio')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      ownerId: data.owner_id,
      handle: data.handle,
      nombreNegocio: data.nombre_negocio,
    }
  },

  async ensureMine({ nombreNegocio, preferredHandle } = {}) {
    const existing = await this.getMine()
    if (existing) return existing

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) throw new Error('No hay sesión activa.')

    const base =
      preferredHandle ||
      nombreNegocio ||
      user.user_metadata?.business_name ||
      user.user_metadata?.businessName ||
      user.email ||
      'tienda'
    const baseSlug = makeSafeHandle(base)

    // Intentamos crear con sufijos hasta que no choque.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const handle = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`

      const payload = {
        owner_id: user.id,
        handle,
        nombre_negocio: String(nombreNegocio || user.user_metadata?.business_name || 'Mi tienda').trim() || 'Mi tienda',
      }

      const { data, error } = await supabase
        .from('tiendas')
        .insert([payload])
        .select('owner_id,handle,nombre_negocio')
        .maybeSingle()

      if (!error) {
        return {
          ownerId: data.owner_id,
          handle: data.handle,
          nombreNegocio: data.nombre_negocio,
        }
      }

      if (isUniqueViolation(error)) continue
      throw error
    }

    throw new Error('No se pudo generar un handle único para la tienda.')
  },

  async updateMine({ nombreNegocio, handle }) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) throw new Error('No hay sesión activa.')

    const payload = {}
    if (nombreNegocio !== undefined) payload.nombre_negocio = String(nombreNegocio || '').trim()
    if (handle !== undefined) {
      const next = normalizeHandle(handle)
      if (RESERVED_HANDLES.has(next)) throw new Error('Ese link no está disponible. Elige otro nombre.')
      payload.handle = next
    }

    const { data, error } = await supabase
      .from('tiendas')
      .update(payload)
      .eq('owner_id', user.id)
      .select('owner_id,handle,nombre_negocio')
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('No se encontró tu tienda.')

    return {
      ownerId: data.owner_id,
      handle: data.handle,
      nombreNegocio: data.nombre_negocio,
    }
  },
}
