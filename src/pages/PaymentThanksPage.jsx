import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession'

function formatUsd(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function getPlanLabelEs(planId) {
  const id = String(planId || '').trim().toLowerCase()
  if (id === 'monthly') return 'Acceso mensual'
  if (id === 'biannual') return 'Acceso semestral'
  if (id === 'annual') return 'Acceso anual'
  return 'Acceso'
}

function shortTxLabel({ solicitudId, referencia }) {
  const ref = String(referencia || '').trim()
  if (ref) return `#REF-${ref}`

  const raw = String(solicitudId || '').replace(/[^a-z0-9]/gi, '')
  if (raw.length >= 8) return `#${raw.slice(0, 4).toUpperCase()}-${raw.slice(-4).toUpperCase()}`
  if (raw) return `#${raw.toUpperCase()}`
  return '#—'
}

export default function PaymentThanksPage() {
  const navigate = useNavigate()
  const { session, cargando } = useAuthSession()
  const [params] = useSearchParams()

  const planId = params.get('plan') || ''
  const priceUsd = params.get('price') || ''
  const referencia = params.get('ref') || ''
  const solicitudId = params.get('solicitud') || ''

  const planLabelEs = useMemo(() => getPlanLabelEs(planId), [planId])
  const priceLabel = useMemo(() => {
    const f = formatUsd(priceUsd)
    return f ? `$${f}` : ''
  }, [priceUsd])

  const txLabel = useMemo(() => shortTxLabel({ solicitudId, referencia }), [solicitudId, referencia])

  useEffect(() => {
    // Si el usuario ya tiene acceso (aprobado), saltar directo al panel.
    // No consultamos aquí para evitar doble llamada; /admin ya valida y redirige si aplica.
  }, [])

  if (cargando) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center p-6 text-white/70">
        Cargando…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div
      className="min-h-screen text-white antialiased overflow-hidden"
      style={{
        backgroundColor: '#0f050a',
        backgroundImage: 'radial-gradient(circle at 50% 0%, #3d1226 0%, #0f050a 100%)',
      }}
    >
      {/* Partículas */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 size-1 rounded-full bg-primary opacity-60 scale-150" />
        <div className="absolute top-1/3 right-1/4 size-1 rounded-full bg-primary opacity-60" />
        <div className="absolute bottom-1/4 left-1/3 size-1 rounded-full bg-primary opacity-60 scale-110" />
        <div className="absolute top-2/3 right-1/3 size-1 rounded-full bg-primary opacity-60 scale-125" />
        <div className="absolute top-10 left-1/2 size-1 rounded-full bg-primary opacity-30" />
        <div className="absolute bottom-10 right-10 size-1 rounded-full bg-primary opacity-40 scale-150" />
      </div>

      <div className="relative flex h-full min-h-screen w-full flex-col max-w-[480px] mx-auto overflow-x-hidden pb-32 font-[Manrope]">
        <header className="flex items-center justify-between p-6">
          <div className="size-10" />
          <h2 className="text-lg font-bold opacity-50 uppercase text-[10px] tracking-widest">Confirmación</h2>
          <button
            type="button"
            onClick={() => navigate('/admin', { replace: true })}
            className="size-10 flex items-center justify-center rounded-full bg-white/10"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <span className="material-symbols-outlined text-white text-[20px]">close</span>
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center pt-10">
          <div className="mb-10 relative">
            <div
              className="absolute -inset-10"
              style={{
                background: 'radial-gradient(circle, rgba(255,45,146,0.4) 0%, transparent 70%)',
                zIndex: -1,
              }}
              aria-hidden="true"
            />

            <div className="size-32 rounded-[40px] bg-gradient-to-tr from-primary to-[#ff6fb3] flex items-center justify-center shadow-[0_20px_50px_rgba(255,45,146,0.5)] rotate-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 -skew-y-12" aria-hidden="true" />
              <span className="material-symbols-outlined text-white text-7xl font-bold -rotate-3 select-none" aria-hidden="true">
                check_circle
              </span>
            </div>
          </div>

          <h1 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
            ¡Pago <br />
            <span
              className="text-primary"
              style={{ textShadow: '0 0 20px rgba(255,45,146,0.6)' }}
            >
              enviado!
            </span>
          </h1>

          <p className="text-white/60 text-base leading-relaxed mb-10 max-w-[320px]">
            Nuestro equipo está verificando tu pago. ¡Tu catálogo estará listo muy pronto!
          </p>

          <div className="w-full rounded-[32px] p-6 text-left relative overflow-hidden bg-white/5 backdrop-blur-[16px] border border-white/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" aria-hidden="true" />

            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Detalles del plan</span>
                  <span className="text-lg font-bold">{planLabelEs}</span>
                </div>
                {priceLabel ? (
                  <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <span className="text-primary text-xs font-black uppercase tracking-widest">{priceLabel}</span>
                  </div>
                ) : null}
              </div>

              <div className="h-px w-full bg-white/10" />

              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Estado</span>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                    <span className="text-lg font-bold">Verificación pendiente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 p-8 pt-12 flex flex-col items-center gap-6 z-50" style={{ background: 'linear-gradient(to top, #0f050a 80%, transparent)' }}>
          <button
            type="button"
            onClick={() => navigate('/admin', { replace: true })}
            className="w-full max-w-[432px] bg-primary text-white h-16 rounded-2xl text-xl font-black shadow-[0_12px_40px_rgba(255,45,146,0.4)] active:scale-95 transition-transform flex items-center justify-center gap-3 uppercase tracking-tight"
          >
            Ir a mi panel
            <span className="material-symbols-outlined font-bold">auto_awesome</span>
          </button>

          <p className="text-white/30 text-[10px] uppercase font-bold tracking-[0.2em]">ID de transacción: {txLabel}</p>
        </footer>

        <div className="fixed top-1/4 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />
        <div className="fixed bottom-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  )
}
