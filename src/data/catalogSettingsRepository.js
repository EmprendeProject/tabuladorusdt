import { supabase } from '../lib/supabase'

export const CATALOG_TEMPLATES = {
  SIMPLE: 'simple',
  BOUTIQUE: 'boutique',
  MODERN: 'modern',
  HEAVY: 'heavy',
}

export const DEFAULT_CATALOG_TEMPLATE = CATALOG_TEMPLATES.SIMPLE

const normalizeTemplate = (value) => {
  if (value === CATALOG_TEMPLATES.BOUTIQUE) return CATALOG_TEMPLATES.BOUTIQUE
  if (value === CATALOG_TEMPLATES.MODERN) return CATALOG_TEMPLATES.MODERN
  if (value === CATALOG_TEMPLATES.HEAVY) return CATALOG_TEMPLATES.HEAVY
  return DEFAULT_CATALOG_TEMPLATE
}

const toFriendlyCatalogSettingsError = (error) => {
  const msg = String(error?.message || '')
  const code = String(error?.code || '')

  const looksLikeRls = msg.toLowerCase().includes('row-level security')
  const looksLikePermission = msg.toLowerCase().includes('permission denied') || code === '42501'
  const looksLikeMissingColumn = code === '42703' || msg.toLowerCase().includes('column')
  const looksLikeCheckConstraint =
    code === '23514' ||
    msg.toLowerCase().includes('violates check constraint') ||
    msg.toLowerCase().includes('check constraint')

  if (looksLikeMissingColumn || looksLikeRls || looksLikePermission) {
    return new Error(
      'No se pudo leer/guardar la plantilla por permisos o porque falta la migración. ' +
        'Solución: migra `catalog_settings` a multiusuario (owner_id + policies) ejecutando el bloque “CATALOG_SETTINGS” actualizado.'
    )
  }

  if (looksLikeCheckConstraint) {
    return new Error(
      'Tu base de datos está rechazando el valor de plantilla (constraint/CHECK). ' +
        'Solución: actualiza el CHECK de `catalog_settings.catalog_template` para incluir `heavy` y vuelve a intentar.'
    )
  }

  return error
}

const getOwnerIdFromSession = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  return user?.id || null
}

export const catalogSettingsRepository = {
  async fetchTemplate({ ownerId } = {}) {
    const effectiveOwnerId = ownerId || (await getOwnerIdFromSession())
    if (!effectiveOwnerId) return DEFAULT_CATALOG_TEMPLATE

    const { data, error } = await supabase
      .from('catalog_settings')
      .select('owner_id,catalog_template')
      .eq('owner_id', effectiveOwnerId)
      .maybeSingle()

    if (error) throw toFriendlyCatalogSettingsError(error)

    return normalizeTemplate(data?.catalog_template)
  },

  async saveTemplate(template, { ownerId } = {}) {
    const next = normalizeTemplate(template)
    const effectiveOwnerId = ownerId || (await getOwnerIdFromSession())
    if (!effectiveOwnerId) throw new Error('No hay sesión activa para guardar la plantilla.')

    const { error } = await supabase
      .from('catalog_settings')
      .upsert({ owner_id: effectiveOwnerId, catalog_template: next }, { onConflict: 'owner_id' })

    if (error) throw toFriendlyCatalogSettingsError(error)

    return next
  },

  subscribeTemplate({ ownerId, onChange } = {}) {
    const effectiveOwnerId = String(ownerId || '').trim()
    if (!effectiveOwnerId) return () => {}

    const channel = supabase
      .channel('catalog-settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalog_settings', filter: `owner_id=eq.${effectiveOwnerId}` },
        (payload) => {
          const next = payload?.new?.catalog_template
          if (typeof onChange === 'function') onChange(normalizeTemplate(next))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}
