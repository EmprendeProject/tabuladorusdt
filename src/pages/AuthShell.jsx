import { Link } from 'react-router-dom'
import logoApp from '../assets/logo app.png'

export default function AuthShell({ title, subtitle, backTo = '/', children }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-[Manrope] selection:bg-[#1840f5] selection:text-white">
      <div className="relative min-h-screen w-full overflow-x-hidden">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1840f5]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1840f5]/10 rounded-full blur-[100px]" />
        </div>

        <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden">
                <img src={logoApp} alt="Cataly" className="h-8 w-8 object-contain" />
              </span>
              <div className="leading-tight">
                <div className="text-xl font-black tracking-tighter">Cattaly</div>
                <div className="text-xs text-gray-500 font-medium">Tu catálogo en 1 link</div>
              </div>
            </Link>

            <Link
              to={backTo}
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-bold px-5 py-2 rounded-full transition-all"
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
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100">
                <div className="text-center">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-[1.1] text-gray-900">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-2 text-sm md:text-base text-gray-600">
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
