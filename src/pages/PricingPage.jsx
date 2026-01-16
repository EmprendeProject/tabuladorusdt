import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import logoBlanco from '../assets/cataly logo blanco.png'
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
    <div
      className="min-h-screen text-white antialiased"
      style={{
        backgroundColor: '#0f050a',
        backgroundImage: 'radial-gradient(circle at 50% 0%, #3d1226 0%, #0f050a 100%)',
      }}
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col overflow-x-hidden pb-32 font-[Manrope]">
        <div className="px-6 pt-6 flex justify-center">
          <img
            src={logoBlanco}
            alt="Cataly"
            className="h-10 w-auto object-contain opacity-95"
            loading="eager"
          />
        </div>
        <header className="flex items-center justify-between p-6">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => navigate(-1)}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-white text-[20px]">close</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
            <span className="material-symbols-outlined text-primary text-sm font-fill">verified</span>
            <span className="text-xs font-extrabold uppercase tracking-wider">Conviertete en Premium</span>
          </div>

          <button
            type="button"
            aria-label="Ayuda"
            onClick={() => setHelpOpen(true)}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-white text-[20px]">help</span>
          </button>
        </header>

        <section className="px-6 pb-8 pt-4 text-center">
          <h1 className="mb-4 text-[42px] font-extrabold leading-none tracking-tight">
            Sin <span className="text-primary italic">Limites</span>
          </h1>
          <p className="text-lg font-medium text-white/60">
            Potencia tu negocio y vende mas con los catalogos inteligentes de Cataly App
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
                      ? 'border-2 border-primary bg-primary/10 shadow-[0_0_25px_rgba(255,45,146,0.3)] backdrop-blur-[20px]'
                      : 'border border-white/10 bg-white/5 backdrop-blur-[16px]')
                  }
                >
                  {plan.badge ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-[0_4px_15px_rgba(255,45,146,0.4)]">
                      {plan.badge}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="mb-1 text-xs font-black uppercase tracking-widest text-primary">{plan.kicker}</span>
                      <h3 className="text-2xl font-black">{plan.title}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black leading-none text-white drop-shadow-[0_0_15px_rgba(255,45,146,0.45)]">
                        {plan.priceLabel || plan.price}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-white/60">{plan.billing}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t border-white/10 py-2">
                    {(plan.features || []).map((feature) => (
                      <div key={feature.title} className="flex items-center gap-4">
                        <span
                          className={
                            'material-symbols-outlined text-[28px] font-fill drop-shadow-[2px_4px_6px_rgba(0,0,0,0.4)] ' +
                            'bg-gradient-to-br from-primary to-[#ff7eb3] bg-clip-text text-transparent'
                          }
                        >
                          {feature.icon}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{feature.title}</span>
                          <span className="text-[11px] leading-none text-white/50">{feature.subtitle}</span>
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
                    ? 'border-2 border-primary bg-primary/10 shadow-[0_0_22px_rgba(255,45,146,0.25)] backdrop-blur-[16px]'
                    : 'border border-white/10 bg-white/5 backdrop-blur-[16px]')
                }
              >
                <div className="flex flex-col">
                  <span className="mb-1 text-xs font-bold uppercase tracking-widest text-white/50">{plan.kicker}</span>
                  <h3 className="text-xl font-bold">{plan.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold leading-none">{plan.priceLabel || plan.price}</p>
                  <p className="mt-1 text-[10px] font-bold text-white/40">{plan.billing}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-6 px-6 py-8">
          <p className="max-w-[280px] text-center text-xs leading-relaxed text-white/40">
            La suscripcion se cancela automaticamente si no se renueva.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm font-bold tracking-wide text-primary active:opacity-50"
          >
            Restore Purchase
          </button>

          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white/60">Privacy Policy</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white/60">Terms of Service</a>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-6 pt-10" style={{ background: 'linear-gradient(to top, #0f050a 70%, transparent)' }}>
          <button
            type="button"
            onClick={onContinue}
            className="flex h-16 w-full max-w-[432px] items-center justify-center gap-2 rounded-2xl bg-primary text-xl font-black text-white shadow-[0_8px_30px_rgba(255,45,146,0.4)] transition-transform active:scale-95"
          >
            Continue
            <span className="material-symbols-outlined font-bold">arrow_forward</span>
          </button>
        </div>

        <div className="pointer-events-none fixed top-1/4 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="pointer-events-none fixed bottom-1/4 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />

        {helpOpen ? (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-4">
            <button
              type="button"
              aria-label="Cerrar ayuda"
              onClick={() => setHelpOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <div className="relative w-full max-w-[480px] rounded-3xl border border-white/10 bg-[#12060c] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold uppercase tracking-widest text-white/60">Ayuda</div>
                  <h2 className="mt-1 text-xl font-black">¿Qué incluye cada plan?</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="flex size-10 items-center justify-center rounded-full bg-white/10"
                >
                  <span className="material-symbols-outlined text-white">close</span>
                </button>
              </div>

              <p className="mt-3 text-sm text-white/70">
                Selecciona un plan y toca <span className="font-bold text-white">Continue</span> para crear tu cuenta.
                Luego podrás activar la suscripción desde tu panel.
              </p>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="w-full rounded-2xl bg-white/10 py-3 text-sm font-bold hover:bg-white/15"
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
