export const PRICING_PLANS = [
  {
    id: 'monthly',
    kicker: 'Standard',
    title: '1 Month',
    price: 13,
    priceLabel: '$13',
    currency: 'USD',
    billing: 'BILLED MONTHLY',
    billingShort: 'Billed monthly • Full Access',
    featured: false,
  },
  {
    id: 'annual',
    kicker: 'Best Value',
    title: 'Annual Plan',
    price: 79,
    priceLabel: '$79',
    currency: 'USD',
    billing: 'PER YEAR',
    billingShort: 'Billed yearly • Full Access',
    featured: true,
    badge: 'Most Popular • Save 49%',
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
    kicker: 'Accelerate',
    title: '6 Months',
    price: 47,
    priceLabel: '$47',
    currency: 'USD',
    billing: 'BILLED BI-ANNUALLY',
    billingShort: 'Billed bi-annually • Full Access',
    featured: false,
  },
]

export function getPricingPlanById(planId) {
  return PRICING_PLANS.find((p) => p.id === planId) || null
}
