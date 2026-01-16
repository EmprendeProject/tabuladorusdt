import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logoBlanco from '../assets/cataly logo blanco.png'
import catalyRosa from '../assets/cataly rosa.png'
import { PRICING_PLANS } from '../data/pricingPlans'

function getPlanNameEs(planId) {
  const id = String(planId || '').trim().toLowerCase()
  if (id === 'monthly') return 'Mensual'
  if (id === 'biannual') return 'Semestral'
  if (id === 'annual') return 'Pro'
  return 'Plan'
}

function getPlanPeriodEs(planId) {
  const id = String(planId || '').trim().toLowerCase()
  if (id === 'monthly') return '/mes'
  if (id === 'biannual') return '/6 meses'
  if (id === 'annual') return '/año'
  return ''
}

function getPlanHighlightsEs(planId) {
  const id = String(planId || '').trim().toLowerCase()
  if (id === 'monthly') {
    return ['Productos ilimitados', 'Variedad de catálogos', 'Personalización a tu gusto']
  }
  if (id === 'biannual') {
    return ['Productos ilimitados', 'Variedad de catálogos', 'Personalización a tu gusto']
  }
  if (id === 'annual') {
    return ['Productos ilimitados', 'Variedad de catálogos', 'Personalización a tu gusto']
  }
  return []
}

export default function LandingPage() {
  const showAdminLink = import.meta.env.VITE_SHOW_ADMIN_LINK !== 'false'
  const navigate = useNavigate()

  const plans = useMemo(() => PRICING_PLANS, [])
  const featuredId = useMemo(() => plans.find((p) => p.featured)?.id || 'annual', [plans])
  const onScrollTo = (id) => {
    const el = globalThis?.document?.getElementById?.(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className="min-h-screen text-white antialiased"
      style={{
        backgroundColor: '#0f050a',
        backgroundImage: 'radial-gradient(circle at 50% 0%, #3d1226 0%, #0f050a 100%)',
      }}
    >
      {/* TopAppBar */}
      <nav className="fixed top-0 z-50 w-full bg-[#0f050a]/70 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center p-4 justify-between max-w-screen-xl mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoBlanco} alt="Cataly" className="h-6 sm:h-7 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/precios')}
              className="hidden sm:inline-flex text-white/70 hover:text-white text-sm font-bold tracking-wide"
            >
              Precios
            </button>
            <button
              type="button"
              onClick={() => navigate(showAdminLink ? '/login' : '/register')}
              className="text-primary text-sm font-bold tracking-wide"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(255,51,153,0.15) 0%, rgba(15,8,12,0) 70%)',
            }}
            aria-hidden="true"
          />

          <div className="px-6 py-12 flex flex-col items-center text-center gap-10 lg:flex-row lg:text-left lg:py-24 max-w-screen-xl mx-auto">
            <div className="flex flex-col gap-6 lg:w-1/2 z-10">
              <div className="inline-flex items-center self-center lg:self-start px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-primary text-xs font-bold uppercase tracking-widest">#1 en Venezuela</span>
              </div>

              <h1 className="text-white text-4xl font-black leading-tight tracking-tight lg:text-6xl">
                Crea tu catálogo virtual en <span className="text-primary">minutos</span> y vende más
              </h1>

              <p className="text-white/60 text-lg font-normal leading-relaxed max-w-lg mx-auto lg:mx-0">
                La herramienta definitiva para emprendedores en Venezuela. Sube tus productos, comparte tu link y recibe pedidos directamente a tu WhatsApp.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  to="/register"
                  className="flex items-center justify-center rounded-xl h-14 px-8 bg-primary text-white text-lg font-bold shadow-[0_0_20px_rgba(255,51,153,0.4)] transition-transform active:scale-95"
                >
                  Empieza Gratis
                </Link>
                <a
                  href="https://www.cataly.shop/niurka-s-shop"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-xl h-14 px-8 bg-white/10 text-white text-lg font-bold border border-white/10 hover:bg-white/15"
                >
                  Ver Demo
                </a>
              </div>
            </div>

            {/* Phone mock */}
            <div id="demo" className="relative w-full lg:w-1/2 flex justify-center items-center mt-6 lg:mt-0 scroll-mt-24">
              <div className="absolute w-[300px] h-[300px] bg-primary/30 rounded-full blur-[100px] -z-10" aria-hidden="true" />
              <div className="relative w-64 h-[500px] bg-[#12060c] rounded-[3rem] border-[8px] border-black/40 shadow-2xl overflow-hidden transform rotate-6 hover:rotate-0 transition-transform duration-500">
                <div className="w-full h-full p-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center mt-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-sm">menu</span>
                    </div>
                    <div className="w-20 h-4 bg-white/10 rounded-full" />
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-sm">shopping_cart</span>
                    </div>
                  </div>

                  <div className="w-full aspect-square bg-white/5 rounded-2xl overflow-hidden border border-white/10">
                    <img src={catalyRosa} alt="Producto de ejemplo" className="w-full h-full object-cover" loading="lazy" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="w-2/3 h-5 bg-white/20 rounded" />
                    <div className="w-1/3 h-4 bg-primary/40 rounded" />
                  </div>

                  <div className="mt-auto mb-6 grid grid-cols-2 gap-2">
                    <div className="h-20 bg-white/5 rounded-xl border border-white/10" />
                    <div className="h-20 bg-white/5 rounded-xl border border-white/10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-6 max-w-screen-xl mx-auto">
          <div className="flex flex-col gap-4 mb-12 text-center lg:text-left">
            <h2 className="tracking-tight text-3xl font-bold lg:text-4xl">Todo lo que necesitas para crecer</h2>
            <p className="text-white/60 text-base max-w-xl mx-auto lg:mx-0">
              Potencia tu negocio con herramientas diseñadas específicamente para los retos del mercado venezolano.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon="touch_app"
              title="Fácil de usar"
              description="Interfaz intuitiva diseñada para móviles. Crea y actualiza tu stock en segundos sin conocimientos técnicos."
            />
            <FeatureCard
              icon="payments"
              title="Precios que se actualizan solos"
              description="Tus productos pueden tener precios en dolares que se actualizan constantemente según la tasa del día. En Bolivares y divisa."
            />
            <FeatureCard
              icon="palette"
              title="Personalización total"
              description="Adapta tu negocio a las diferentes plantillas que tiene Cataly para ti. Configura colores, estilos, logo y un botón de Whatsapp."
            />
          </div>
        </section>

        {/*
        Pricing
        <section id="planes" className="py-20 bg-white/5 border-y border-white/10">
          <div className="px-6 max-w-screen-xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Planes a tu medida</h2>
              <p className="text-white/60">Escala tu negocio con el plan perfecto para ti</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => {
                const isFeatured = plan.id === featuredId || Boolean(plan.featured)
                const name = getPlanNameEs(plan.id)
                const period = getPlanPeriodEs(plan.id)
                const highlights = getPlanHighlightsEs(plan.id)

                if (isFeatured) {
                  return (
                    <div
                      key={plan.id}
                      className="bg-black/20 border-2 border-primary rounded-2xl p-8 flex flex-col gap-6 relative shadow-2xl"
                    >
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase px-4 py-1 rounded-full">
                        Más popular
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-primary text-sm font-bold uppercase">{name}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black">{plan.priceLabel || `$${plan.price}`}</span>
                          <span className="text-white/50">{period}</span>
                        </div>
                      </div>

                      <ul className="flex flex-col gap-4">
                        {highlights.map((h) => (
                          <li key={h} className="flex items-center gap-3 text-sm text-white/70">
                            <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                            {h}
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        onClick={() => navigate(`/precios?plan=${encodeURIComponent(plan.id)}`)}
                        className="w-full py-4 rounded-xl bg-primary text-white font-bold shadow-[0_0_20px_rgba(255,51,153,0.4)] mt-auto"
                      >
                        Empieza ahora
                      </button>
                    </div>
                  )
                }

                return (
                  <div
                    key={plan.id}
                    className="bg-black/15 border border-white/10 rounded-2xl p-8 flex flex-col gap-6"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-primary text-sm font-bold uppercase">{name}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">{plan.priceLabel || `$${plan.price}`}</span>
                        <span className="text-white/50">{period}</span>
                      </div>
                    </div>

                    <ul className="flex flex-col gap-4">
                      {highlights.map((h) => (
                        <li key={h} className="flex items-center gap-3 text-sm text-white/70">
                          <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                          {h}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => navigate(`/precios?plan=${encodeURIComponent(plan.id)}`)}
                      className="w-full py-3 rounded-xl border-2 border-primary/30 text-primary font-bold hover:bg-primary/10 transition-colors mt-auto"
                    >
                      Seleccionar
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
        */}

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-white/10">
          <div className="max-w-screen-xl mx-auto flex flex-col gap-8 lg:flex-row lg:justify-between items-center">
            <div className="flex items-center gap-2">
              <img src={logoBlanco} alt="Cataly" className="h-6 w-auto object-contain opacity-95" />
              <h2 className="text-white text-lg font-extrabold tracking-tight">Cataly</h2>
            </div>

            <div className="flex gap-8 text-sm text-white/50">
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Privacidad</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Términos</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Ayuda</a>
            </div>

            <div className="flex gap-4">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  onScrollTo('planes')
                }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
                aria-label="Ver planes"
                title="Ver planes"
              >
                <span className="material-symbols-outlined">sell</span>
              </a>
              <a
                href="mailto:soporte@cataly.app"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
                aria-label="Contactar soporte"
                title="Contactar soporte"
              >
                <span className="material-symbols-outlined">alternate_email</span>
              </a>
            </div>
          </div>

          <p className="text-center text-xs text-white/40 mt-12">© {new Date().getFullYear()} Cataly. Hecho en Venezuela para el mundo.</p>
        </footer>

        <div className="h-8 w-full" />
      </main>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white/5 backdrop-blur-[12px] border border-primary/20 flex flex-col gap-5 rounded-2xl p-8 transition-all hover:bg-primary/5 group">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-white text-xl font-bold">{title}</h3>
        <p className="text-white/60 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
