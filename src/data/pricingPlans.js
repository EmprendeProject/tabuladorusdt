export const PRICING_PLANS = [
  {
    id: 'monthly',
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
    features: [
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
    ],
  },
  {
    id: 'biannual',
    kicker: 'Acelerado',
    title: '6 Meses',
    price: 59,
    priceLabel: '$59',
    currency: 'USD',
    billing: 'FACTURADO SEMESTRALMENTE',
    billingShort: 'Facturado semestral • Acceso completo',
    featured: false,
  },
]

export function getPricingPlanById(planId) {
  return PRICING_PLANS.find((p) => p.id === planId) || null
}
