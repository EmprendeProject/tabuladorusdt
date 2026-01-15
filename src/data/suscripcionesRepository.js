import { supabase } from '../lib/supabase'

const normalizePlan = (plan) => {
  const p = String(plan || '').trim()
  if (!p) return 'Free'
  const upper = p.toLowerCase()
  if (upper === 'free') return 'Free'
  if (upper === 'pro') return 'Pro'
  if (upper === 'enterprise') return 'Enterprise'
  return p
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

      return {
        ownerId: t.owner_id,
        handle: t.handle,
        nombreNegocio: t.nombre_negocio,
        email: perfil?.email || '',
        joinedAt: t.created_at || perfil?.created_at || null,
        plan,
        activa,
        expiresAt: sub?.expires_at || null,
      }
    })
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
}
