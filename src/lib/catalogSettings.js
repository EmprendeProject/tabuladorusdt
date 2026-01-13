import { supabase } from './supabase'

export const CATALOG_TEMPLATES = {
  SIMPLE: 'simple',
  BOUTIQUE: 'boutique',
  MODERN: 'modern',
}

export const DEFAULT_CATALOG_TEMPLATE = CATALOG_TEMPLATES.SIMPLE

export const fetchCatalogTemplate = async () => {
  const { data, error } = await supabase
    .from('catalog_settings')
    .select('id,catalog_template')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error

  const template = data?.catalog_template
  if (template === CATALOG_TEMPLATES.BOUTIQUE) return CATALOG_TEMPLATES.BOUTIQUE
  if (template === CATALOG_TEMPLATES.MODERN) return CATALOG_TEMPLATES.MODERN
  return DEFAULT_CATALOG_TEMPLATE
}

export const saveCatalogTemplate = async (catalogTemplate) => {
  const template =
    catalogTemplate === CATALOG_TEMPLATES.BOUTIQUE
      ? CATALOG_TEMPLATES.BOUTIQUE
      : catalogTemplate === CATALOG_TEMPLATES.MODERN
        ? CATALOG_TEMPLATES.MODERN
        : DEFAULT_CATALOG_TEMPLATE

  const { error } = await supabase
    .from('catalog_settings')
    .upsert({ id: 1, catalog_template: template }, { onConflict: 'id' })

  if (error) throw error

  return template
}

export const subscribeCatalogTemplate = (onChange) => {
  const channel = supabase
    .channel('catalog-settings-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'catalog_settings', filter: 'id=eq.1' },
      (payload) => {
        const next = payload?.new?.catalog_template
        if (typeof onChange === 'function') onChange(next)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
