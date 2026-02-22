import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PRICING_PLANS } from '../data/pricingPlans'

export default function PricingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const plans = useMemo(() => PRICING_PLANS, [])
  const defaultSelected = params.get('plan') || plans.find((p) => p.featured)?.id || plans[0]?.id
  const [selectedId, setSelectedId] = useState(defaultSelected)
  const [helpOpen, setHelpOpen] = useState(false)

  const selectedPlan = useMemo(() => plans.find((p) => p.id === selectedId) || plans[0], [plans, selectedId])

  const onContinue = () => {
    const qp = new URLSearchParams()
    if (selectedPlan?.id) qp.set('plan', selectedPlan.id)
    navigate(`/checkout?${qp.toString()}`)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-[Manrope] selection:bg-[#1840f5] selection:text-white antialiased">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1840f5]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1840f5]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col overflow-x-hidden pb-32 z-10">
        <div className="px-6 pt-6 flex justify-center items-center gap-2">
           <h2 className="text-2xl font-black tracking-tighter text-gray-900">Cattaly</h2>
        </div>
        <header className="flex items-center justify-between p-6">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => navigate(-1)}
            className="flex size-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-full border border-[#1840f5]/20 bg-[#1840f5]/10 px-4 py-1.5 text-[#1840f5]">
            <span className="material-symbols-outlined text-sm font-fill">verified</span>
            <span className="text-xs font-extrabold uppercase tracking-wider">Conviertete en Premium</span>
          </div>

          <button
            type="button"
            aria-label="Ayuda"
            onClick={() => setHelpOpen(true)}
            className="flex size-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>
        </header>

        <section className="px-6 pb-8 pt-4 text-center">
          <h1 className="mb-4 text-[42px] font-extrabold leading-none tracking-tight">
            Sin <span className="text-[#1840f5] italic">Limites</span>
          </h1>
          <p className="text-lg font-medium text-gray-600">
            Potencia tu negocio y vende mas con los catalogos inteligentes de Cattaly App
          </p>
        </section>

        <div className="flex flex-col gap-4 px-6">
          {plans.map((plan) => {
            const selected = plan.id === selectedId
            const isFeatured = Boolean(plan.featured)

            if (isFeatured) {
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedId(plan.id)}
                  className={
                    'relative flex w-full cursor-pointer flex-col gap-6 rounded-3xl p-6 text-left transition-all active:scale-95 ' +
                    (selected
                      ? 'border-2 border-[#1840f5] bg-[#1840f5]/5 shadow-xl shadow-[#1840f5]/20'
                      : 'border border-gray-200 bg-gray-50 hover:bg-gray-100')
                  }
                >
                  {plan.badge ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1840f5] px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-[#1840f5]/30">
                      {plan.badge}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="mb-1 text-xs font-black uppercase tracking-widest text-[#1840f5]">{plan.kicker}</span>
                      <h3 className="text-2xl font-black text-gray-900">{plan.title}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black leading-none text-gray-900">
                        {plan.priceLabel || plan.price}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-gray-500">{plan.billing}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t border-gray-200 py-4 mt-2">
                    {(plan.features || []).map((feature) => (
                      <div key={feature.title} className="flex items-center gap-4">
                        <span
                          className={'material-symbols-outlined text-[28px] font-fill text-[#1840f5]'}
                        >
                          {feature.icon}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800">{feature.title}</span>
                          <span className="text-[11px] leading-none text-gray-500">{feature.subtitle}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="sr-only">{selected ? 'Selected' : 'Not selected'}</div>
                </button>
              )
            }

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                className={
                  'group flex w-full cursor-pointer items-center justify-between rounded-3xl p-6 text-left transition-all active:scale-95 ' +
                  (selected
                    ? 'border-2 border-[#1840f5] bg-[#1840f5]/5 shadow-lg shadow-[#1840f5]/10'
                    : 'border border-gray-200 bg-gray-50 hover:bg-gray-100')
                }
              >
                <div className="flex flex-col">
                  <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">{plan.kicker}</span>
                  <h3 className="text-xl font-bold">{plan.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold leading-none">{plan.priceLabel || plan.price}</p>
                  <p className="mt-1 text-[10px] font-bold text-gray-400">{plan.billing}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-6 px-6 py-8">
          <p className="max-w-[280px] text-center text-xs leading-relaxed text-gray-500">
            La suscripcion se cancela automaticamente si no se renueva.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm font-bold tracking-wide text-[#1840f5] hover:opacity-70 transition-opacity"
          >
            Restaurar Compra
          </button>

          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-gray-900">Política de Privacidad</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-gray-900">Términos de Servicio</a>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-6 pt-10" style={{ background: 'linear-gradient(to top, white 70%, transparent)' }}>
          <button
            type="button"
            onClick={onContinue}
            className="flex h-16 w-full max-w-[432px] items-center justify-center gap-2 rounded-2xl bg-[#1840f5] hover:bg-[#1430b8] text-xl font-black text-white shadow-xl shadow-[#1840f5]/30 hover:shadow-[#1840f5]/50 transition-all active:scale-95"
          >
            Continuar
            <span className="material-symbols-outlined font-bold">arrow_forward</span>
          </button>
        </div>
        <div className="pointer-events-none fixed bottom-1/4 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />

        {helpOpen ? (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-4">
            <button
              type="button"
              aria-label="Cerrar ayuda"
              onClick={() => setHelpOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <div className="relative w-full max-w-[480px] rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold uppercase tracking-widest text-[#1840f5]">Ayuda</div>
                  <h2 className="mt-1 text-xl font-black text-gray-900">¿Qué incluye cada plan?</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <p className="mt-3 text-sm text-gray-600">
                Selecciona un plan y toca <span className="font-bold text-gray-900">Continuar</span> para crear tu cuenta.
                Luego podrás activar la suscripción desde tu panel.
              </p>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="w-full rounded-2xl bg-[#1840f5] text-white py-3 text-sm font-bold shadow-lg shadow-[#1840f5]/20 hover:bg-[#1430b8]"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
