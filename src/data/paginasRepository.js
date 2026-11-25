import { supabase } from '../lib/supabase'
import { RESERVED_HANDLES, tiendasRepository } from './tiendasRepository'

export const PAGINA_TIPOS = {
  HOME: 'home',
  LINKINBIO: 'linkinbio',
  LANDING: 'landing',
}

export const PAGINA_TIPO_LABELS = {
  [PAGINA_TIPOS.HOME]: 'Homepage del negocio',
  [PAGINA_TIPOS.LINKINBIO]: 'Link en la bio',
  [PAGINA_TIPOS.LANDING]: 'Landing page',
}

const FIELDS = 'id,owner_id,tipo,slug,titulo,contenido,meta_pixel_id,publicada,created_at,updated_at'

const mapPagina = (row) => {
  if (!row) return null
  return {
    id: row.id,
    ownerId: row.owner_id,
    tipo: row.tipo,
    slug: row.slug,
    titulo: row.titulo || '',
    contenido: row.contenido && typeof row.contenido === 'object' ? row.contenido : {},
    metaPixelId: row.meta_pixel_id || '',
    publicada: row.publicada !== false,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

// El pixel de Meta son solo dígitos (la BD también lo valida).
export const normalizeMetaPixelId = (value) => String(value || '').replace(/\D/g, '')

const toFriendlyPaginaError = (error) => {
  const msg = String(error?.message || '')
  const lower = msg.toLowerCase()
  if (msg.includes('LIMITE_PAGINAS')) return new Error('Llegaste al límite de páginas de este tipo.')
  if (lower.includes('duplicate key') || lower.includes('unique')) return new Error('Ese link ya está en uso. Elige otro.')
  if (lower.includes('row-level security')) return new Error('Las páginas son una función de Cattaly Pro. Mejora tu plan para crearlas o editarlas.')
  if (lower.includes('meta_pixel_id')) return new Error('El ID del Pixel de Meta debe tener solo números (5 a 20 dígitos).')
  return error
}

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data?.user?.id || null
}

const validateSlug = (slug) => {
  const s = tiendasRepository.normalizeHandle(slug)
  if (!s) throw new Error('Escribe un link válido.')
  if (RESERVED_HANDLES.has(s)) throw new Error('Ese link no está disponible. Elige otro.')
  return s
}

const buildPayload = ({ slug, titulo, contenido, metaPixelId, publicada } = {}) => {
  const payload = {}
  if (slug !== undefined) payload.slug = validateSlug(slug)
  if (titulo !== undefined) payload.titulo = String(titulo || '').trim()
  if (contenido !== undefined) payload.contenido = contenido || {}
  if (metaPixelId !== undefined) payload.meta_pixel_id = normalizeMetaPixelId(metaPixelId) || null
  if (publicada !== undefined) payload.publicada = Boolean(publicada)
  return payload
}

export const paginasRepository = {
  async listMine() {
    const uid = await getUserId()
    if (!uid) return []
    const { data, error } = await supabase
      .from('paginas')
      .select(FIELDS)
      .eq('owner_id', uid)
      .order('created_at', { ascending: true })
    if (error) throw toFriendlyPaginaError(error)
    return (data || []).map(mapPagina)
  },

  async getById(id) {
    const { data, error } = await supabase.from('paginas').select(FIELDS).eq('id', id).maybeSingle()
    if (error) throw toFriendlyPaginaError(error)
    return mapPagina(data)
  },

  // Público: la RLS solo devuelve páginas publicadas de dueños con Premium vigente.
  async getPublicBySlug(slug) {
    const s = tiendasRepository.normalizeHandle(slug)
    if (!s) return null
    const { data, error } = await supabase
      .from('paginas')
      .select(FIELDS)
      .ilike('slug', s)
      .eq('publicada', true)
      .maybeSingle()
    if (error) {
      // Si la tabla aún no existe, no rompemos la ruta pública.
      const code = String(error?.code || '')
      if (code === '42P01' || code === 'PGRST205') return null
      throw error
    }
    return mapPagina(data)
  },

  async isSlugAvailable(slug) {
    const s = validateSlug(slug)
    const { data, error } = await supabase.rpc('slug_disponible', { p_slug: s })
    if (error) throw error
    return Boolean(data)
  },

  async create({ tipo, ...fields }) {
    const uid = await getUserId()
    if (!uid) throw new Error('No hay sesión activa.')
    if (!Object.values(PAGINA_TIPOS).includes(tipo)) throw new Error('Tipo de página inválido.')

    const { data, error } = await supabase
      .from('paginas')
      .insert([{ owner_id: uid, tipo, ...buildPayload(fields) }])
      .select(FIELDS)
      .maybeSingle()
    if (error) throw toFriendlyPaginaError(error)
    return mapPagina(data)
  },

  async update(id, fields) {
    const { data, error } = await supabase
      .from('paginas')
      .update(buildPayload(fields))
      .eq('id', id)
      .select(FIELDS)
      .maybeSingle()
    if (error) throw toFriendlyPaginaError(error)
    if (!data) throw new Error('No se encontró la página.')
    return mapPagina(data)
  },

  async remove(id) {
    const { error } = await supabase.from('paginas').delete().eq('id', id)
    if (error) throw toFriendlyPaginaError(error)
  },
}
