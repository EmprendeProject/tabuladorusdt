import { useNavigate } from 'react-router-dom'

export default function NotFoundPage({
  title = '¡Hey! No se encontró esta ruta',
  description = (
    <>
      Tu suscripción ha expirado o el enlace no es válido. Regístrate en{' '}
      <span className="text-primary font-bold">Cataly</span> para reactivar tu catálogo.
    </>
  ),
  primaryCtaLabel = 'Ir al inicio',
  primaryCtaTo = '/',
  showBack = true,
  brand = 'Cataly',
  supportHref = 'mailto:soporte@cataly.app',
}) {
  const navigate = useNavigate()

  return (
    <div className="min-h-[max(884px,100dvh)] w-full bg-[#f8f6f7] dark:bg-[#221019] font-[Manrope] antialiased">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <div className="pointer-events-none absolute -top-[100px] -left-[100px] h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(238, 43, 140, 0.15) 0%, rgba(238, 43, 140, 0) 70%)' }} />
        <div className="pointer-events-none absolute -bottom-[50px] -right-[50px] h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(238, 43, 140, 0.10) 0%, rgba(238, 43, 140, 0) 60%)' }} />

        <div className="z-10 flex items-center justify-between p-4 pb-2">
          <div className="flex size-12 shrink-0 items-center justify-start text-white">
            {showBack ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Volver"
                className="inline-flex h-12 w-12 items-center justify-start"
              >
                <span className="material-symbols-outlined cursor-pointer">arrow_back_ios</span>
              </button>
            ) : (
              <span className="inline-flex h-12 w-12" />
            )}
          </div>
          <h2 className="flex-1 pr-12 text-center text-lg font-bold leading-tight tracking-[-0.015em] text-white">{brand}</h2>
        </div>

        <div className="z-10 flex flex-1 flex-col items-center justify-center px-6 py-10">
          <div className="mb-8 w-full max-w-sm text-center">
            <div className="relative inline-block">
              <h1 className="select-none text-[120px] font-extrabold leading-none tracking-tighter text-white/20">404</h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[100px] text-primary drop-shadow-[0_0_15px_rgba(238,43,140,0.5)]">link_off</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-[12px]">
            <h3 className="pb-3 text-2xl font-bold leading-tight text-white">{title}</h3>
            <p className="mb-8 text-base font-normal leading-relaxed text-white/80">{description}</p>

            <button
              type="button"
              onClick={() => navigate(primaryCtaTo)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-primary/90"
            >
              <span className="material-symbols-outlined">rocket_launch</span>
              {primaryCtaLabel}
            </button>

            <a
              href={supportHref}
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-white/50 transition-colors hover:text-white"
            >
              <span className="material-symbols-outlined text-sm">help</span>
              Contactar soporte técnico
            </a>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}
