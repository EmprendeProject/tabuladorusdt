import { supabase } from '../lib/supabase'

export const CATALOG_TEMPLATES = {
  SIMPLE: 'simple',
  BOUTIQUE: 'boutique',
  MODERN: 'modern',
}

export const DEFAULT_CATALOG_TEMPLATE = CATALOG_TEMPLATES.SIMPLE

const normalizeTemplate = (value) => {
  if (value === CATALOG_TEMPLATES.BOUTIQUE) return CATALOG_TEMPLATES.BOUTIQUE
  if (value === CATALOG_TEMPLATES.MODERN) return CATALOG_TEMPLATES.MODERN
  return DEFAULT_CATALOG_TEMPLATE
}

export const catalogSettingsRepository = {
  async fetchTemplate() {
    const { data, error } = await supabase
      .from('catalog_settings')
      .select('id,catalog_template')
      .eq('id', 1)
      .maybeSingle()

    if (error) throw error

    return normalizeTemplate(data?.catalog_template)
  },

  async saveTemplate(template) {
    const next = normalizeTemplate(template)

    const { error } = await supabase
      .from('catalog_settings')
      .upsert({ id: 1, catalog_template: next }, { onConflict: 'id' })

    if (error) throw error

    return next
  },

  subscribeTemplate(onChange) {
    const channel = supabase
      .channel('catalog-settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalog_settings', filter: 'id=eq.1' },
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
