import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeftRight,
  BadgeDollarSign,
  LayoutTemplate,
  MessageCircle,
  Quote,
  Sparkles,
} from 'lucide-react'
import { tiendasRepository } from '../data/tiendasRepository'

export default function LandingPage() {
  const showAdminLink = import.meta.env.VITE_SHOW_ADMIN_LINK !== 'false'
  const navigate = useNavigate()
  const [handle, setHandle] = useState('')

  const normalizedHandle = useMemo(() => tiendasRepository.normalizeHandle(handle), [handle])

  const goToCatalog = (e) => {
    e?.preventDefault?.()
    if (!normalizedHandle) return
    navigate(`/${normalizedHandle}`)
  }

  return (
    <div className="min-h-screen bg-background-light text-[#1c0d16]">
      <div className="relative min-h-screen w-full overflow-x-hidden">
        <div className="organic-shape-1" aria-hidden="true" />
        <div className="organic-shape-2" aria-hidden="true" />

        <nav className="sticky top-0 z-50 border-b border-black/5 bg-background-light/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles size={20} />
              </span>
              <div className="leading-tight">
                <div className="text-base font-bold tracking-tight font-display">Cataly</div>
                <div className="text-xs text-[#1c0d16]/60 font-sans">Tu catálogo en 1 link</div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {showAdminLink ? (
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex items-center justify-center rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white"
                >
                  Entrar
                </Link>
              ) : null}

              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90"
              >
                Empezar
              </Link>
            </div>
          </div>
        </nav>

        <header className="relative z-10">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
            <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
              <div className="flex flex-col gap-6 text-center md:text-left">
                <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight italic">
                  Eleva tu negocio con elegancia y rapidez.
                </h1>
                <p className="font-sans text-base md:text-lg text-[#1c0d16]/70 max-w-xl mx-auto md:mx-0">
                  Crea un catálogo minimalista, comparte un solo link y administra tus productos desde tu panel.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-7 py-4 text-base font-bold text-white shadow-lg"
                  >
                    Crear mi catálogo
                    <ArrowRight className="ml-2 size-5" />
                  </Link>
                  {showAdminLink ? (
                    <Link
                      to="/admin"
                      className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white/70 px-7 py-4 text-base font-bold text-[#1c0d16] hover:bg-white"
                    >
                      Ir al admin
                    </Link>
                  ) : null}
                </div>

                <form onSubmit={goToCatalog} className="mt-2">
                  <div className="text-sm font-semibold font-sans text-[#1c0d16]/80">Abrir un catálogo</div>
                  <div className="mt-2 flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 px-3">
                        <span className="text-sm text-[#1c0d16]/50 select-none font-sans">cataly.shop/</span>
                        <input
                          value={handle}
                          onChange={(e) => setHandle(e.target.value)}
                          placeholder="micatalogo"
                          className="w-full bg-transparent py-3 px-2 text-[#1c0d16] outline-none font-sans"
                          autoCapitalize="none"
                          autoCorrect="off"
                        />
                      </div>
                      {handle && !normalizedHandle ? (
                        <div className="mt-2 text-xs text-red-600 font-sans">Escribe un link válido.</div>
                      ) : null}
                    </div>

                    <button
                      type="submit"
                      disabled={!normalizedHandle}
                      className="h-12 rounded-2xl bg-[#1c0d16] text-white px-6 font-semibold hover:bg-black disabled:opacity-50 disabled:hover:bg-[#1c0d16]"
                    >
                      Ir
                    </button>
                  </div>
                </form>
              </div>

              <div className="relative">
                <div className="h-72 sm:h-96 rounded-2xl shadow-2xl overflow-hidden border border-black/5 bg-[radial-gradient(circle_at_20%_10%,rgba(255,51,153,0.25),transparent_55%),radial-gradient(circle_at_90%_30%,rgba(168,85,247,0.18),transparent_55%),linear-gradient(135deg,#ffffff,#f7f2fb)]">
                  <div className="absolute inset-0 bg-black/5" />
                  <div className="relative h-full w-full p-6 flex flex-col justify-end">
                    <div className="glass-card rounded-2xl p-4">
                      <div className="font-display text-xl font-bold">Catálogo limpio</div>
                      <div className="mt-1 text-sm text-[#1c0d16]/70 font-sans">
                        Diseños minimalistas listos para vender.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-2">
          <h2 className="font-display text-3xl font-bold tracking-tight">La colección</h2>
          <div className="h-1 w-12 bg-primary mt-2 rounded-full" />
        </section>

        <section className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FeatureCard
              icon={<BadgeDollarSign className="size-5 text-primary" />}
              iconBg="bg-primary/10"
              title="Precios que se actualizan todos los días"
            />
            <FeatureCard
              icon={<ArrowLeftRight className="size-5 text-accent-purple" />}
              iconBg="bg-accent-purple/10"
              title="Manejo de tasas de cambio"
            />
            <FeatureCard
              icon={<LayoutTemplate className="size-5 text-primary" />}
              iconBg="bg-primary/10"
              title="Diferentes plantillas de catálogo"
            />
            <FeatureCard
              icon={<MessageCircle className="size-5 text-accent-purple" />}
              iconBg="bg-accent-purple/10"
              title="Redirecciona a WhatsApp, clientes listos para comprar"
            />
          </div>
        </section>

        <section className="relative z-10 py-16 md:py-20 px-4 md:px-6 bg-primary/5 my-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="flex justify-center">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Quote className="size-6" />
              </span>
            </div>
            <h3 className="font-display italic text-2xl md:text-3xl font-bold leading-tight">
              “El comportamiento compras online en venezuela es via whatsapp, con precios que se actualizan todos los dias y con muchos clientes que preguntan demasiado. Cataly, la solucion!”
            </h3>
            <p className="font-sans text-sm text-[#1c0d16]/60">
              Recibe leads calificados para comprar a tu WhatsApp, haz marca y vende!.
            </p>
          </div>
        </section>

        <footer className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pb-10">
          <div className="rounded-2xl overflow-hidden border border-black/5 shadow-sm">
            <div className="relative bg-[radial-gradient(circle_at_20%_20%,rgba(255,51,153,0.55),transparent_55%),radial-gradient(circle_at_90%_30%,rgba(168,85,247,0.45),transparent_55%),linear-gradient(135deg,#ff3399,#a855f7)] p-8 md:p-10">
              <div className="absolute inset-0 bg-white/10" />
              <div className="relative">
                <h3 className="font-display text-white text-2xl md:text-3xl font-bold">
                  ¿Listo para crear el catalogo de tu negocio?
                </h3>
                <p className="mt-2 text-white/80 font-sans max-w-xl">
                  Crea tu cuenta, publica tus productos y comparte tu link en segundos.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-4 text-base font-bold text-[#1c0d16] shadow-lg hover:bg-white/95"
                  >
                    Crear cuenta
                  </Link>
                  {showAdminLink ? (
                    <Link
                      to="/admin"
                      className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-4 text-base font-bold text-white hover:bg-white/15"
                    >
                      Ya tengo cuenta
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 text-center">
              <p className="text-xs text-[#1c0d16]/40 font-sans">© {new Date().getFullYear()} Cataly. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function FeatureCard({ icon, iconBg, title }) {
  return (
    <div className="glass-card rounded-2xl p-5 aspect-square shadow-sm border border-white/40">
      <div className="h-full flex flex-col justify-between gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
        <p className="font-display text-lg font-bold leading-tight">{title}</p>
      </div>
    </div>
  )
}
