import { supabase } from '../lib/supabase'
import { normalizeTier } from '../lib/planFeatures'
import { fetchAllRows } from '../lib/supabasePaging'

const parseExpiresAt = (value) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

const hasActiveAccess = ({ activa, expiresAt } = {}) => {
  if (!activa) return false
  const d = parseExpiresAt(expiresAt)
  if (!d) return true
  return d.getTime() > Date.now()
}

const normalizePlan = (plan) => {
  const p = String(plan || '').trim()
  if (!p) return 'free'
  const lower = p.toLowerCase()

  // Soportar valores antiguos
  if (lower === 'free') return 'free'
  if (lower === 'pro' || lower === 'enterprise') return 'annual'

  // Planes actuales del checkout
  if (lower === 'monthly') return 'monthly'
  if (lower === 'biannual') return 'biannual'
  if (lower === 'annual') return 'annual'
  if (lower === 'premium_monthly') return 'premium_monthly'
  if (lower === 'premium_biannual') return 'premium_biannual'
  if (lower === 'premium_annual') return 'premium_annual'

  return lower
}

export const suscripcionesRepository = {
  // Todas las cuentas (superadmin). Une suscripciones, perfiles y catálogo principal,
  // paginando para no quedar cortado en 1000 filas.
  async listAccounts() {
    const [tiendas, perfiles, subs] = await Promise.all([
      fetchAllRows((from, to) =>
        supabase
          .from('tiendas')
          .select('owner_id,handle,nombre_negocio,created_at')
          .eq('es_principal', true)
          .order('owner_id', { ascending: true })
          .range(from, to),
      ),
      fetchAllRows((from, to) =>
        supabase
          .from('perfiles')
          .select('user_id,email,telefono,created_at')
          .order('user_id', { ascending: true })
          .range(from, to),
      ),
      fetchAllRows((from, to) =>
        supabase
          .from('suscripciones')
          .select('owner_id,plan,tier,activa,expires_at,created_at,updated_at')
          .order('owner_id', { ascending: true })
          .range(from, to),
      ),
    ])

    const tiendasByOwnerId = new Map(tiendas.map((t) => [t.owner_id, t]))
    const perfilesByUserId = new Map(perfiles.map((p) => [p.user_id, p]))
    const subsByOwnerId = new Map(subs.map((s) => [s.owner_id, s]))

    // Cada registro crea una fila en `suscripciones` (trigger de prueba), así que es la
    // fuente más completa; sumamos perfiles/tiendas por si hay cuentas antiguas sin ella.
    const ownerIds = new Set([...subsByOwnerId.keys(), ...perfilesByUserId.keys(), ...tiendasByOwnerId.keys()])

    const earliest = (...values) => {
      const times = values.map((v) => (v ? new Date(v).getTime() : NaN)).filter(Number.isFinite)
      return times.length ? new Date(Math.min(...times)).toISOString() : null
    }

    const accounts = Array.from(ownerIds).map((ownerId) => {
      const t = tiendasByOwnerId.get(ownerId)
      const perfil = perfilesByUserId.get(ownerId)
      const sub = subsByOwnerId.get(ownerId)
      const activa = Boolean(sub?.activa)
      const expiresAt = sub?.expires_at || null

      return {
        ownerId,
        handle: t?.handle || '',
        nombreNegocio: t?.nombre_negocio || '',
        email: perfil?.email || '',
        telefono: perfil?.telefono || '',
        joinedAt: earliest(sub?.created_at, perfil?.created_at, t?.created_at),
        plan: normalizePlan(sub?.plan),
        tier: normalizeTier(sub?.tier),
        activa,
        expiresAt,
        hasAccess: hasActiveAccess({ activa, expiresAt }),
      }
    })

    accounts.sort((a, b) => String(b.joinedAt || '').localeCompare(String(a.joinedAt || '')))
    return accounts
  },

  async getByOwnerId(ownerId) {
    const id = String(ownerId || '').trim()
    if (!id) throw new Error('ownerId inválido')

    const { data, error } = await supabase
      .from('suscripciones')
      .select('owner_id,plan,tier,activa,expires_at,created_at,updated_at')
      .eq('owner_id', id)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return {
        ownerId: id,
        plan: 'free',
        tier: 'standard',
        activa: false,
        expiresAt: undefined,
        hasAccess: false,
      }
    }

    const plan = normalizePlan(data?.plan)
    const activa = Boolean(data?.activa)
    const expiresAt = data?.expires_at || null
    const hasAccess = hasActiveAccess({ activa, expiresAt })

    return {
      ownerId: data.owner_id,
      plan,
      tier: normalizeTier(data?.tier),
      activa,
      expiresAt,
      hasAccess,
      createdAt: data.created_at || null,
      updatedAt: data.updated_at || null,
    }
  },

  async getMyStatus() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) throw new Error('No hay sesión activa.')

    const { data, error } = await supabase
      .from('suscripciones')
      .select('owner_id,plan,tier,activa,expires_at,created_at,updated_at')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (error) throw error

    const plan = normalizePlan(data?.plan)
    const activaFlag = Boolean(data?.activa)
    const expiresAt = data?.expires_at || null
    const access = hasActiveAccess({ activa: activaFlag, expiresAt })
    const exp = parseExpiresAt(expiresAt)
    const isExpired = Boolean(exp && exp.getTime() <= Date.now())

    return {
      ownerId: user.id,
      plan,
      tier: normalizeTier(data?.tier),
      activaFlag,
      expiresAt,
      hasAccess: access,
      isExpired,
    }
  },

  async getCatalogAccessForOwner(ownerId) {
    const id = String(ownerId || '').trim()
    if (!id) throw new Error('ownerId inválido')

    // Requiere crear la función SQL `public.is_catalog_active(uuid)`.
    // Si no existe aún, devolvemos null para no romper el catálogo público.
    const { data, error } = await supabase.rpc('is_catalog_active', { p_owner_id: id })
    if (error) {
      const msg = String(error?.message || '').toLowerCase()
      const code = String(error?.code || '')
      const looksMissingFn = msg.includes('function') && msg.includes('does not exist')
      if (looksMissingFn || code === '42883') return null
      throw error
    }

    return Boolean(data)
  },

  // Acceso público por catálogo (considera Premium para catálogos extra).
  // Si la función SQL aún no existe, cae al chequeo por dueño.
  async getCatalogAccessForTienda({ tiendaId, ownerId } = {}) {
    const id = String(tiendaId || '').trim()
    if (!id) return this.getCatalogAccessForOwner(ownerId)

    const { data, error } = await supabase.rpc('is_tienda_active', { p_tienda_id: id })
    if (error) {
      const msg = String(error?.message || '').toLowerCase()
      const code = String(error?.code || '')
      const looksMissingFn = (msg.includes('function') && msg.includes('does not exist')) || code === '42883' || code === 'PGRST202'
      if (looksMissingFn) return this.getCatalogAccessForOwner(ownerId)
      throw error
    }

    return Boolean(data)
  },

  async setActive(ownerId, activa) {
    const id = String(ownerId || '').trim()
    if (!id) throw new Error('ownerId inválido')

    const { error } = await supabase
      .from('suscripciones')
      .upsert(
        {
          owner_id: id,
          activa: Boolean(activa),
        },
        { onConflict: 'owner_id' },
      )

    if (error) throw error
  },

  async setPlan(ownerId, plan, { tier } = {}) {
    const id = String(ownerId || '').trim()
    if (!id) throw new Error('ownerId inválido')

    const { error } = await supabase
      .from('suscripciones')
      .upsert(
        {
          owner_id: id,
          plan: normalizePlan(plan),
          ...(typeof tier !== 'undefined' ? { tier: normalizeTier(tier) } : {}),
        },
        { onConflict: 'owner_id' },
      )

    if (error) throw error
  },

  async upsertSubscription(ownerId, { plan, tier, activa, expiresAt } = {}) {
    const id = String(ownerId || '').trim()
    if (!id) throw new Error('ownerId inválido')

    const payload = {
      owner_id: id,
    }

    if (typeof activa !== 'undefined') payload.activa = Boolean(activa)
    if (typeof plan !== 'undefined') payload.plan = normalizePlan(plan)
    if (typeof tier !== 'undefined') payload.tier = normalizeTier(tier)
    if (typeof expiresAt !== 'undefined') payload.expires_at = expiresAt

    const { error } = await supabase.from('suscripciones').upsert(payload, { onConflict: 'owner_id' })
    if (error) throw error
  },
}
