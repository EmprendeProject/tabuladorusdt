// Fuente única de verdad de qué incluye cada nivel de suscripción.
// La base de datos aplica los mismos límites (ver supabase-premium.sql);
// aquí solo los usamos para la UI (bloquear botones, mostrar "Mejora a Premium").

export const TIERS = {
  STANDARD: 'standard',
  PREMIUM: 'premium',
}

export const FEATURES = {
  MULTI_CATALOGO: 'multi_catalogo',
  DUPLICAR_PRODUCTOS: 'duplicar_productos',
  PAGINA_HOME: 'pagina_home',
  PAGINA_LINKINBIO: 'pagina_linkinbio',
  PAGINA_LANDING: 'pagina_landing',
  META_PIXEL: 'meta_pixel',
  TEMAS_PREMIUM: 'temas_premium',
}

const TIER_CONFIG = {
  [TIERS.STANDARD]: {
    label: 'Estándar',
    maxCatalogos: 1,
    features: new Set(),
  },
  [TIERS.PREMIUM]: {
    label: 'Premium',
    maxCatalogos: 3,
    features: new Set(Object.values(FEATURES)),
  },
}

// Límites de páginas Premium (mantener en sync con `paginas_before_insert` en SQL).
export const MAX_PAGINAS_POR_TIPO = {
  home: 1,
  linkinbio: 1,
  landing: 5,
}

export const normalizeTier = (value) => {
  const t = String(value || '').trim().toLowerCase()
  return t === TIERS.PREMIUM ? TIERS.PREMIUM : TIERS.STANDARD
}

// El nivel que realmente aplica: si la suscripción no está vigente, no hay Premium.
export const getEffectiveTier = (subStatus) => {
  if (!subStatus?.hasAccess) return TIERS.STANDARD
  return normalizeTier(subStatus?.tier)
}

export const getTierLabel = (tier) => TIER_CONFIG[normalizeTier(tier)].label

export const getMaxCatalogos = (tier) => TIER_CONFIG[normalizeTier(tier)].maxCatalogos

export const canUse = (tier, feature) => TIER_CONFIG[normalizeTier(tier)].features.has(feature)

export const isPremium = (tier) => normalizeTier(tier) === TIERS.PREMIUM
