import { supabase } from '../lib/supabase'
import { slugifyHandle } from '../lib/slug'

export const RESERVED_HANDLES = new Set([
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
  'precios',
  'pricing',
  'checkout',
  'pago',
  'landing',
  'landing2',
  'landing3',
  'verifica-email',
  'email-verified',
  'p',
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

const TIENDA_FIELDS = 'id,owner_id,handle,nombre_negocio,es_principal,created_at'

const mapTienda = (row) => {
  if (!row) return null
  return {
    id: row.id || null,
    ownerId: row.owner_id,
    handle: row.handle,
    nombreNegocio: row.nombre_negocio,
    esPrincipal: row.es_principal !== false,
    createdAt: row.created_at || null,
  }
}

const getSessionUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  return user || null
}

const toFriendlyTiendaError = (error) => {
  const msg = String(error?.message || '')
  if (msg.includes('LIMITE_CATALOGOS')) {
    return new Error('Llegaste al límite de catálogos de tu plan. Mejora a Premium para tener hasta 3 catálogos.')
  }
  if (isUniqueViolation(error)) return new Error('Ese link ya está en uso. Elige otro.')
  return error
}

const makeSafeHandle = (handle) => {
  const h = normalizeHandle(handle)
  if (!h) return 'mi-catalogo'
  if (RESERVED_HANDLES.has(h)) return `tienda-${h}`
  return h
}

export const tiendasRepository = {
  normalizeHandle,
  makeSafeHandle,

  async getByHandle(handle) {
    const h = normalizeHandle(handle)

    const { data, error } = await supabase
      .from('tiendas')
      .select(TIENDA_FIELDS)
      .ilike('handle', h)
      .maybeSingle()

    if (error) throw error
    return mapTienda(data)
  },

  // Catálogos públicos por id (para homepage / link en la bio).
  async listPublicByIds(ids) {
    const list = (ids || []).filter(Boolean)
    if (!list.length) return []
    const { data, error } = await supabase.from('tiendas').select(TIENDA_FIELDS).in('id', list)
    if (error) throw error
    const byId = new Map((data || []).map((row) => [row.id, mapTienda(row)]))
    return list.map((id) => byId.get(id)).filter(Boolean)
  },

  // Todos mis catálogos (el principal primero).
  async listMine() {
    const user = await getSessionUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('tiendas')
      .select(TIENDA_FIELDS)
      .eq('owner_id', user.id)
      .order('es_principal', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data || []).map(mapTienda)
  },

  // Mi catálogo principal.
  async getMine() {
    const user = await getSessionUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('tiendas')
      .select(TIENDA_FIELDS)
      .eq('owner_id', user.id)
      .eq('es_principal', true)
      .maybeSingle()

    if (error) throw error
    return mapTienda(data)
  },

  async ensureMine({ nombreNegocio, preferredHandle } = {}) {
    const existing = await this.getMine()
    if (existing) return existing

    const user = await getSessionUser()
    if (!user) throw new Error('No hay sesión activa.')

    const base =
      preferredHandle ||
      nombreNegocio ||
      user.user_metadata?.business_name ||
      user.user_metadata?.businessName ||
      'mi-catalogo'

    return this._insertWithUniqueHandle({
      ownerId: user.id,
      base,
      nombreNegocio: String(nombreNegocio || user.user_metadata?.business_name || 'Mi tienda').trim() || 'Mi tienda',
    })
  },

  // Crear un catálogo adicional (Premium). La BD valida el límite del plan.
  async createMine({ nombreNegocio, handle } = {}) {
    const user = await getSessionUser()
    if (!user) throw new Error('No hay sesión activa.')

    const nombre = String(nombreNegocio || '').trim()
    if (!nombre) throw new Error('El nombre del catálogo es requerido.')

    const wanted = normalizeHandle(handle || nombre)
    if (!wanted) throw new Error('Escribe un link válido.')
    if (RESERVED_HANDLES.has(wanted)) throw new Error('Ese link no está disponible. Elige otro nombre.')

    const { data, error } = await supabase
      .from('tiendas')
      .insert([{ owner_id: user.id, handle: wanted, nombre_negocio: nombre }])
      .select(TIENDA_FIELDS)
      .maybeSingle()

    if (error) throw toFriendlyTiendaError(error)
    return mapTienda(data)
  },

  async _insertWithUniqueHandle({ ownerId, base, nombreNegocio }) {
    const baseSlug = makeSafeHandle(base)

    // Intentamos crear con sufijos hasta que no choque.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const handle = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`

      const { data, error } = await supabase
        .from('tiendas')
        .insert([{ owner_id: ownerId, handle, nombre_negocio: nombreNegocio }])
        .select(TIENDA_FIELDS)
        .maybeSingle()

      if (!error) return mapTienda(data)
      if (isUniqueViolation(error)) continue
      throw toFriendlyTiendaError(error)
    }

    throw new Error('No se pudo generar un handle único para la tienda.')
  },

  async updateById(tiendaId, { nombreNegocio, handle } = {}) {
    const id = String(tiendaId || '').trim()
    if (!id) throw new Error('Catálogo inválido.')

    const payload = {}
    if (nombreNegocio !== undefined) payload.nombre_negocio = String(nombreNegocio || '').trim()
    if (handle !== undefined) {
      const next = normalizeHandle(handle)
      if (!next) throw new Error('Escribe un link válido.')
      if (RESERVED_HANDLES.has(next)) throw new Error('Ese link no está disponible. Elige otro nombre.')
      payload.handle = next
    }

    const { data, error } = await supabase
      .from('tiendas')
      .update(payload)
      .eq('id', id)
      .select(TIENDA_FIELDS)
      .maybeSingle()

    if (error) throw toFriendlyTiendaError(error)
    if (!data) throw new Error('No se encontró el catálogo.')
    return mapTienda(data)
  },

  // Actualiza el catálogo principal (compatibilidad con el perfil).
  async updateMine({ nombreNegocio, handle }) {
    const mine = await this.getMine()
    if (!mine?.id) throw new Error('No se encontró tu tienda.')
    return this.updateById(mine.id, { nombreNegocio, handle })
  },

  // Borra un catálogo extra (la BD no permite borrar el principal).
  // Productos, categorías y ajustes se borran en cascada.
  async removeById(tiendaId) {
    const id = String(tiendaId || '').trim()
    if (!id) throw new Error('Catálogo inválido.')

    const { data, error } = await supabase.from('tiendas').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error('No se pudo borrar el catálogo (el principal no se puede borrar).')
  },
}
