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
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-gray-500 font-[Manrope]">
        Cargando…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-[Manrope] selection:bg-[#1840f5] selection:text-white antialiased overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1840f5]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1840f5]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative flex h-full min-h-screen w-full flex-col max-w-[480px] mx-auto overflow-x-hidden pb-32 z-10">
        <header className="flex items-center justify-between p-6">
          <div className="size-10" />
          <h2 className="text-lg font-bold text-gray-500 uppercase text-[10px] tracking-widest">Confirmación</h2>
          <button
            type="button"
            onClick={() => navigate('/admin', { replace: true })}
            className="size-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <span className="material-symbols-outlined text-gray-900 text-[20px]">close</span>
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center pt-10">
          <div className="mb-10 relative">
            <div
              className="absolute -inset-10"
              style={{
                background: 'radial-gradient(circle, rgba(24,64,245,0.2) 0%, transparent 70%)',
                zIndex: -1,
              }}
              aria-hidden="true"
            />

            <div className="size-32 rounded-[40px] bg-gradient-to-tr from-[#1840f5] to-[#4068ff] flex items-center justify-center shadow-xl shadow-[#1840f5]/30 rotate-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 -skew-y-12" aria-hidden="true" />
              <span className="material-symbols-outlined text-white text-7xl font-bold -rotate-3 select-none" aria-hidden="true">
                check_circle
              </span>
            </div>
          </div>

          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
            ¡Pago <br />
            <span className="text-[#1840f5]">enviado!</span>
          </h1>

          <p className="text-gray-600 text-base leading-relaxed mb-10 max-w-[320px]">
            Nuestro equipo está verificando tu pago. ¡Tu catálogo estará listo muy pronto!
          </p>

          <div className="w-full rounded-[32px] p-6 text-left relative overflow-hidden bg-gray-50 border border-gray-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1840f5]/10 rounded-full blur-3xl -mr-10 -mt-10" aria-hidden="true" />

            <div className="flex flex-col gap-5 relative z-10">
              <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Detalles del plan</span>
                  <span className="text-lg font-bold text-gray-900">{planLabelEs}</span>
                </div>
                {priceLabel ? (
                  <div className="px-3 py-1.5 rounded-full bg-[#1840f5]/10 border border-[#1840f5]/20">
                    <span className="text-[#1840f5] text-xs font-black uppercase tracking-widest">{priceLabel}</span>
                  </div>
                ) : null}
              </div>

              <div className="h-px w-full bg-gray-200" />

              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Estado</span>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-yellow-500 shadow-sm" />
                    <span className="text-lg font-bold text-gray-900">Verificación pendiente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 p-8 pt-12 flex flex-col items-center gap-6 z-50" style={{ background: 'linear-gradient(to top, white 80%, transparent)' }}>
          <button
            type="button"
            onClick={() => navigate('/admin', { replace: true })}
            className="w-full max-w-[432px] bg-[#1840f5] hover:bg-[#1430b8] text-white h-16 rounded-2xl text-xl font-black shadow-xl shadow-[#1840f5]/30 hover:shadow-[#1840f5]/50 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tight"
          >
            Ir a mi panel
            <span className="material-symbols-outlined font-bold">auto_awesome</span>
          </button>

          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-[0.2em]">ID de transacción: {txLabel}</p>
        </footer>
      </div>
    </div>
  )
}
