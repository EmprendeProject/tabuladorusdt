import { Link } from 'react-router-dom'
import logoApp from '../assets/logo app.png'

export default function AuthShell({ title, subtitle, backTo = '/', children }) {
  return (
    <div className="min-h-screen bg-background-light text-[#1c0d16]">
      <div className="relative min-h-screen w-full overflow-x-hidden">
        <div className="organic-shape-1" aria-hidden="true" />
        <div className="organic-shape-2" aria-hidden="true" />

        <nav className="sticky top-0 z-50 border-b border-black/5 bg-background-light/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/70 border border-black/10 overflow-hidden">
                <img src={logoApp} alt="Cataly" className="h-8 w-8 object-contain" />
              </span>
              <div className="leading-tight">
                <div className="text-base font-bold tracking-tight font-display">Cataly</div>
                <div className="text-xs text-[#1c0d16]/60 font-sans">Tu catálogo en 1 link</div>
              </div>
            </Link>

            <Link
              to={backTo}
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white"
              aria-label="Volver"
              title="Volver"
            >
              Volver
            </Link>
          </div>
        </nav>

        <main className="relative z-10">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
            <div className="max-w-xl mx-auto">
              <div className="glass-card rounded-2xl p-6 md:p-8 shadow-sm border border-white/40">
                <div className="text-center">
                  <h1 className="font-display text-3xl md:text-4xl font-bold leading-[1.05] tracking-tight">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-2 font-sans text-sm md:text-base text-[#1c0d16]/70">
                      {subtitle}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6">{children}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
