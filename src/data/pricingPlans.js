import { TIERS } from '../lib/planFeatures'

const STANDARD_FEATURES = [
  {
    title: 'Personaliza un catálogo inteligente para tu negocio',
    subtitle: 'Configura tu marca y estilo',
    icon: 'auto_awesome',
  },
  {
    title: 'Elimina objeciones de clientes',
    subtitle: 'Responde rápido con un catálogo claro',
    icon: 'verified',
  },
  {
    title: 'Aumenta las ventas de tu negocio',
    subtitle: 'Convierte visitas en compras',
    icon: 'trending_up',
  },
  {
    title: 'Catálogo de precios en bolívares de forma automática',
    subtitle: 'Precios actualizados sin esfuerzo',
    icon: 'currency_exchange',
  },
]

export const PREMIUM_FEATURES = [
  {
    title: 'Hasta 3 catálogos en la misma cuenta',
    subtitle: 'Un catálogo por marca, línea o sucursal',
    icon: 'library_books',
  },
  {
    title: 'Duplica y migra productos entre catálogos',
    subtitle: 'Copia tu inventario en segundos',
    icon: 'content_copy',
  },
  {
    title: 'Homepage de tu negocio',
    subtitle: 'Una página principal con todos tus catálogos',
    icon: 'storefront',
  },
  {
    title: 'Link en la bio',
    subtitle: 'Tu árbol de links para Instagram y TikTok',
    icon: 'link',
  },
  {
    title: 'Landing pages con Pixel de Meta',
    subtitle: 'Mide y optimiza tus anuncios',
    icon: 'ads_click',
  },
  {
    title: 'Temas exclusivos',
    subtitle: 'Diseños premium para tu catálogo',
    icon: 'palette',
  },
]

// Cada plan = nivel (tier) × duración. `durationDays` se usa al aprobar el pago.
export const PRICING_PLANS = [
  {
    id: 'monthly',
    tier: TIERS.STANDARD,
    durationDays: 30,
    kicker: 'Estándar',
    title: '1 Mes',
    price: 16,
    priceLabel: '$16',
    currency: 'USD',
    billing: 'FACTURADO MENSÚALMENTE',
    billingShort: 'Facturado mensual • Acceso completo',
    featured: false,
  },
  {
    id: 'annual',
    tier: TIERS.STANDARD,
    durationDays: 365,
    kicker: 'Mejor Opción',
    title: 'Plan Anual',
    price: 97,
    priceLabel: '$97',
    currency: 'USD',
    billing: 'POR AÑO',
    billingShort: 'Facturado anual • Acceso completo',
    featured: true,
    badge: 'Más Popular • Ahorra 49%',
    // Monto de referencia en Bs (ejemplo del diseño). Puedes ajustarlo al BCV real.
    bsAmount: 2840,
    features: STANDARD_FEATURES,
  },
  {
    id: 'biannual',
    tier: TIERS.STANDARD,
    durationDays: 180,
    kicker: 'Acelerado',
    title: '6 Meses',
    price: 59,
    priceLabel: '$59',
    currency: 'USD',
    billing: 'FACTURADO SEMESTRALMENTE',
    billingShort: 'Facturado semestral • Acceso completo',
    featured: false,
  },

  // ---------------- PREMIUM ----------------
  // Mensual confirmado ($25). Semestral y anual: provisionales, ajustar antes de lanzar.
  {
    id: 'premium_monthly',
    tier: TIERS.PREMIUM,
    durationDays: 30,
    kicker: 'Premium',
    title: 'Premium 1 Mes',
    price: 25,
    priceLabel: '$25',
    currency: 'USD',
    billing: 'FACTURADO MENSÚALMENTE',
    billingShort: 'Facturado mensual • Premium',
    featured: false,
  },
  {
    id: 'premium_annual',
    tier: TIERS.PREMIUM,
    durationDays: 365,
    kicker: 'Premium • Mejor Opción',
    title: 'Premium Anual',
    price: 157,
    priceLabel: '$157',
    currency: 'USD',
    billing: 'POR AÑO',
    billingShort: 'Facturado anual • Premium',
    featured: true,
    badge: 'Todo incluido • Ahorra 48%',
    features: PREMIUM_FEATURES,
  },
  {
    id: 'premium_biannual',
    tier: TIERS.PREMIUM,
    durationDays: 180,
    kicker: 'Premium',
    title: 'Premium 6 Meses',
    price: 95,
    priceLabel: '$95',
    currency: 'USD',
    billing: 'FACTURADO SEMESTRALMENTE',
    billingShort: 'Facturado semestral • Premium',
    featured: false,
  },
]

export function getPricingPlanById(planId) {
  return PRICING_PLANS.find((p) => p.id === planId) || null
}

export function getPlansByTier(tier) {
  return PRICING_PLANS.filter((p) => p.tier === tier)
}

// Etiqueta corta para listados (Superadmin, pantallas de pago).
export function getPlanLabel(planId) {
  const id = String(planId || '').trim().toLowerCase()
  if (!id) return '—'
  if (id === 'free') return 'Free'
  if (id === 'trial') return 'Prueba'
  const plan = getPricingPlanById(id)
  if (plan) return plan.id === 'annual' ? 'Anual' : plan.title
  return id
}
