import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthSession } from '../hooks/useAuthSession'
import { solicitudesPagoRepository } from '../data/solicitudesPagoRepository'
import { suscripcionesRepository } from '../data/suscripcionesRepository'

export default function PaymentPendingPage() {
  const navigate = useNavigate()
  const { session, cargando } = useAuthSession()

  const [checking, setChecking] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [lastStatus, setLastStatus] = useState(null)
  const [reviewNote, setReviewNote] = useState('')

  const checkStatus = useCallback(async () => {
    if (!session?.user?.id) return
    if (checking) return

    setStatusMsg('')
    setChecking(true)
    try {
      const sub = await suscripcionesRepository.getMyStatus()
      if (sub?.hasAccess) {
        navigate('/admin', { replace: true })
        return
      }

      const latest = await solicitudesPagoRepository.getMyLatestSolicitud()
      const s = latest?.status || null
      setLastStatus(s)
      setReviewNote(String(latest?.review_note || '').trim())

      if (s === 'rejected') {
        setStatusMsg('Tu pago fue rechazado. Revisa el motivo (si aplica) o envía un nuevo comprobante.')
      } else if (s === 'approved') {
        // Si ya está aprobado pero la suscripción aún no refrescó, manda al panel a revalidar.
        navigate('/admin', { replace: true })
      } else {
        setStatusMsg('Aún estamos verificando tu pago. Intenta de nuevo en unos segundos.')
      }
    } catch (e) {
      setStatusMsg(e?.message || 'No se pudo verificar el estado. Intenta de nuevo.')
    } finally {
      setChecking(false)
    }
  }, [checking, navigate, session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id) return
    // Auto-check suave al entrar.
    checkStatus()
  }, [checkStatus, session?.user?.id])

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
    <div className="min-h-screen bg-white text-gray-900 font-[Manrope] selection:bg-[#1840f5] selection:text-white antialiased">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden z-10">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1840f5]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1840f5]/10 rounded-full blur-[100px]" />
        </div>

        <div className="flex items-center p-6 pb-2 justify-between z-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-900 flex size-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
            aria-label="Volver"
            title="Volver"
          >
            <span className="material-symbols-outlined cursor-pointer text-[20px]">arrow_back_ios_new</span>
          </button>
          <h2 className="text-gray-900 text-lg font-bold tracking-tight flex-1 text-center pr-10">Cattaly</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 z-10">
          <div className="w-full max-w-sm mb-12 text-center">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute w-32 h-32 bg-[#1840f5]/20 blur-3xl rounded-full" aria-hidden="true" />
              <div className="relative w-40 h-40 rounded-full flex items-center justify-center border border-[#1840f5]/20 bg-white/50 backdrop-blur-md shadow-lg shadow-[#1840f5]/10">
                <span
                  className="material-symbols-outlined text-[84px] text-[#1840f5]"
                  style={{
                    fontVariationSettings: "'FILL' 1, 'wght' 300",
                  }}
                  aria-hidden="true"
                >
                  hourglass_empty
                </span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center shadow-xl border border-gray-100 bg-white/80 backdrop-blur-sm">
            <div className="mb-2 inline-flex px-3 py-1 rounded-full bg-[#1840f5]/10 border border-[#1840f5]/20">
              <span className="text-[#1840f5] text-[10px] uppercase font-bold tracking-widest">Estado del Pago</span>
            </div>

            <h3 className="text-gray-900 text-3xl font-extrabold leading-tight pb-3">¡Pago en proceso!</h3>

            <p className="text-gray-600 text-base font-medium leading-relaxed mb-10 max-w-[260px]">
              Estamos verificando tu pago. En breve podrás seguir disfrutando de{' '}
              <span className="text-[#1840f5] font-bold">Cattaly</span>
            </p>

            {statusMsg ? (
              <div className="mb-4 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-left">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Actualización</div>
                <div className="mt-1 text-sm text-gray-700">{statusMsg}</div>
                {lastStatus === 'rejected' && reviewNote ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Motivo</div>
                    <div className="mt-1 text-sm text-rose-800">{reviewNote}</div>
                  </div>
                ) : null}
                {lastStatus ? (
                  <div className="mt-2 text-[11px] text-gray-500">
                    Último estado: <span className="font-semibold text-gray-800">{String(lastStatus)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={checkStatus}
              disabled={checking}
              className="w-full bg-[#1840f5] hover:bg-[#1430b8] text-white font-bold py-5 rounded-2xl transition-all duration-300 shadow-xl shadow-[#1840f5]/20 hover:shadow-[#1840f5]/40 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              {checking ? 'Verificando…' : 'Ver estado'}
            </button>

            {lastStatus === 'rejected' ? (
              <button
                type="button"
                onClick={() => navigate('/precios')}
                className="mt-3 w-full border border-gray-200 bg-gray-50 text-gray-900 font-bold py-4 rounded-2xl transition-colors hover:bg-gray-100"
              >
                Enviar nuevo comprobante
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                window.location.href = 'mailto:soporte@cattaly.com'
              }}
              className="mt-8 text-gray-500 text-sm font-semibold hover:text-gray-900 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">support_agent</span>
              Contactar soporte
            </button>
          </div>

          <div className="mt-12 flex items-center gap-2 opacity-50 grayscale">
            <div className="h-[1px] w-8 bg-gray-300" />
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-gray-400">Security & Billing</span>
            <div className="h-[1px] w-8 bg-gray-300" />
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  )
}
