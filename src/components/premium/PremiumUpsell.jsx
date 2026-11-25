import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { PREMIUM_FEATURES } from '../../data/pricingPlans'

// Tarjeta "Mejora a Premium" para funciones bloqueadas.
export default function PremiumUpsell({ title = 'Función de Cattaly Pro', description, compact = false }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
      <div className="flex items-center gap-2 text-amber-700">
        <Sparkles size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">Cattaly Pro</span>
      </div>
      <h3 className="mt-2 text-lg font-bold text-gray-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}

      {!compact ? (
        <ul className="mt-4 space-y-2">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="material-symbols-outlined text-[20px] text-amber-600">{f.icon}</span>
              <span>
                <span className="font-semibold">{f.title}</span>
                <span className="block text-xs text-gray-500">{f.subtitle}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        to="/precios?tier=premium"
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
      >
        <Sparkles size={16} />
        Pasarme a Cattaly Pro
      </Link>
    </div>
  )
}
