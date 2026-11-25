import { supabase } from '../lib/supabase'

export const CATALOG_TEMPLATES = {
  SIMPLE: 'simple',
  BOUTIQUE: 'boutique',
  MODERN: 'modern',
  HEAVY: 'heavy',
  URBAN_STREET: 'urban_street',
}

export const DEFAULT_CATALOG_TEMPLATE = CATALOG_TEMPLATES.SIMPLE

// Temas que se muestran en el selector. `premium: true` = solo plan Premium.
// Para agregar un tema exclusivo: créalo en components/catalog, agrégalo aquí con
// premium: true y amplía el CHECK de `catalog_settings.catalog_template` en SQL.
export const CATALOG_TEMPLATE_OPTIONS = [
  { value: CATALOG_TEMPLATES.SIMPLE, label: 'Elegance', premium: false },
  { value: CATALOG_TEMPLATES.BOUTIQUE, label: 'Boutique', premium: false },
  { value: CATALOG_TEMPLATES.MODERN, label: 'Moderna', premium: false },
  { value: CATALOG_TEMPLATES.HEAVY, label: 'Heavy', premium: false },
  { value: CATALOG_TEMPLATES.URBAN_STREET, label: 'Urban Street', premium: false },
]

export const isPremiumTemplate = (value) =>
  Boolean(CATALOG_TEMPLATE_OPTIONS.find((o) => o.value === value)?.premium)

const normalizeTemplate = (value) => {
  if (value === CATALOG_TEMPLATES.BOUTIQUE) return CATALOG_TEMPLATES.BOUTIQUE
  if (value === CATALOG_TEMPLATES.MODERN) return CATALOG_TEMPLATES.MODERN
  if (value === CATALOG_TEMPLATES.HEAVY) return CATALOG_TEMPLATES.HEAVY
  if (value === CATALOG_TEMPLATES.URBAN_STREET) return CATALOG_TEMPLATES.URBAN_STREET
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

const SETTINGS_FIELDS = 'owner_id,tienda_id,catalog_template,logo_url,accent_color,mostrar_precio_bs'

const mapSettings = (data) => ({
  template: normalizeTemplate(data?.catalog_template),
  logoUrl: data?.logo_url || null,
  accentColor: data?.accent_color || null,
  mostrarPrecioBs: data?.mostrar_precio_bs ?? true,
})

// Sin tiendaId explícito usamos el catálogo principal del dueño.
const resolveTiendaId = async ({ ownerId, tiendaId }) => {
  if (tiendaId) return tiendaId
  if (!ownerId) return null
  const { data, error } = await supabase
    .from('tiendas')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('es_principal', true)
    .maybeSingle()
  if (error) throw error
  return data?.id || null
}

const upsertSettings = async (fields, { ownerId, tiendaId } = {}) => {
  const effectiveOwnerId = ownerId || (await getOwnerIdFromSession())
  if (!effectiveOwnerId) throw new Error('No hay sesión activa para guardar los ajustes del catálogo.')
  const effectiveTiendaId = await resolveTiendaId({ ownerId: effectiveOwnerId, tiendaId })
  if (!effectiveTiendaId) throw new Error('No se encontró el catálogo para guardar los ajustes.')

  const { error } = await supabase
    .from('catalog_settings')
    .upsert({ owner_id: effectiveOwnerId, tienda_id: effectiveTiendaId, ...fields }, { onConflict: 'tienda_id' })

  if (error) throw toFriendlyCatalogSettingsError(error)
}

export const catalogSettingsRepository = {
  async fetchTemplate({ ownerId, tiendaId } = {}) {
    const effectiveOwnerId = ownerId || (await getOwnerIdFromSession())
    const effectiveTiendaId = await resolveTiendaId({ ownerId: effectiveOwnerId, tiendaId })
    if (!effectiveTiendaId) return mapSettings(null)

    const { data, error } = await supabase
      .from('catalog_settings')
      .select(SETTINGS_FIELDS)
      .eq('tienda_id', effectiveTiendaId)
      .maybeSingle()

    if (error) throw toFriendlyCatalogSettingsError(error)
    return mapSettings(data)
  },

  async saveTemplate(template, opts = {}) {
    const next = normalizeTemplate(template)
    await upsertSettings({ catalog_template: next }, opts)
    return next
  },

  async saveLogoUrl(logoUrl, opts = {}) {
    await upsertSettings({ logo_url: logoUrl }, opts)
    return logoUrl
  },

  async saveAccentColor(colorHex, opts = {}) {
    await upsertSettings({ accent_color: colorHex }, opts)
    return colorHex
  },

  async saveMostrarPrecioBs(value, opts = {}) {
    await upsertSettings({ mostrar_precio_bs: value }, opts)
    return value
  },

  // Copia la apariencia (tema, logo, color, precio Bs) de un catálogo a otro.
  async copySettings({ fromTiendaId, toTiendaId, ownerId } = {}) {
    const from = await this.fetchTemplate({ ownerId, tiendaId: fromTiendaId })
    await upsertSettings(
      {
        catalog_template: from.template,
        logo_url: from.logoUrl,
        accent_color: from.accentColor,
        mostrar_precio_bs: from.mostrarPrecioBs,
      },
      { ownerId, tiendaId: toTiendaId },
    )
  },

  subscribeTemplate({ tiendaId, onChange } = {}) {
    const id = String(tiendaId || '').trim()
    if (!id) return () => { }

    const channel = supabase
      .channel(`catalog-settings-realtime-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalog_settings', filter: `tienda_id=eq.${id}` },
        (payload) => {
          if (typeof onChange === 'function') onChange(mapSettings(payload?.new))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}
