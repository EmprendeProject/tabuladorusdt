import { supabase } from '../lib/supabase'

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

  return lower
}

export const suscripcionesRepository = {
  async listAccounts() {
    const [tiendasRes, perfilesRes, subsRes] = await Promise.all([
      supabase
        .from('tiendas')
        .select('owner_id,handle,nombre_negocio,created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('perfiles')
        .select('user_id,email,created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('suscripciones')
        .select('owner_id,plan,activa,expires_at,created_at,updated_at'),
    ])

    if (tiendasRes.error) throw tiendasRes.error

    // Perfiles/suscripciones pueden fallar por RLS si no eres superadmin.
    if (perfilesRes.error) throw perfilesRes.error
    if (subsRes.error) throw subsRes.error

    const perfilesByUserId = new Map((perfilesRes.data || []).map((p) => [p.user_id, p]))
    const subsByOwnerId = new Map((subsRes.data || []).map((s) => [s.owner_id, s]))

    return (tiendasRes.data || []).map((t) => {
      const perfil = perfilesByUserId.get(t.owner_id)
      const sub = subsByOwnerId.get(t.owner_id)
      const plan = normalizePlan(sub?.plan)
      const activa = Boolean(sub?.activa)
      const expiresAt = sub?.expires_at || null
      const hasAccess = hasActiveAccess({ activa, expiresAt })

      return {
        ownerId: t.owner_id,
        handle: t.handle,
        nombreNegocio: t.nombre_negocio,
        email: perfil?.email || '',
        joinedAt: t.created_at || perfil?.created_at || null,
        plan,
        activa,
        expiresAt,
        hasAccess,
      }
    })
  },

  async getByOwnerId(ownerId) {
    const id = String(ownerId || '').trim()
    if (!id) throw new Error('ownerId inválido')

    const { data, error } = await supabase
      .from('suscripciones')
      .select('owner_id,plan,activa,expires_at,created_at,updated_at')
      .eq('owner_id', id)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return {
        ownerId: id,
        plan: 'free',
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
      .select('owner_id,plan,activa,expires_at,created_at,updated_at')
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

  async setPlan(ownerId, plan) {
    const id = String(ownerId || '').trim()
    if (!id) throw new Error('ownerId inválido')

    const { error } = await supabase
      .from('suscripciones')
      .upsert(
        {
          owner_id: id,
          plan: normalizePlan(plan),
        },
        { onConflict: 'owner_id' },
      )

    if (error) throw error
  },

  async upsertSubscription(ownerId, { plan, activa, expiresAt } = {}) {
    const id = String(ownerId || '').trim()
    if (!id) throw new Error('ownerId inválido')

    const payload = {
      owner_id: id,
    }

    if (typeof activa !== 'undefined') payload.activa = Boolean(activa)
    if (typeof plan !== 'undefined') payload.plan = normalizePlan(plan)
    if (typeof expiresAt !== 'undefined') payload.expires_at = expiresAt

    const { error } = await supabase.from('suscripciones').upsert(payload, { onConflict: 'owner_id' })
    if (error) throw error
  },
}
