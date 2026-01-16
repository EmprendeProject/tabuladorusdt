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
      <div className="min-h-screen bg-background-dark flex items-center justify-center p-6 text-white/70">
        Cargando…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background-dark font-[Manrope] antialiased">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <div
          className="absolute top-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,51,153,0.22) 0%, rgba(255,51,153,0) 70%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-[10%] right-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,51,153,0.16) 0%, rgba(255,51,153,0) 60%)',
          }}
          aria-hidden="true"
        />

        <div className="flex items-center p-6 pb-2 justify-between z-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-white/80 flex size-10 shrink-0 items-center justify-start"
            aria-label="Volver"
            title="Volver"
          >
            <span className="material-symbols-outlined cursor-pointer">arrow_back_ios</span>
          </button>
          <h2 className="text-white text-lg font-bold tracking-tight flex-1 text-center pr-10">Cataly</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 z-10">
          <div className="w-full max-w-sm mb-12 text-center">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute w-32 h-32 bg-primary/20 blur-3xl rounded-full" aria-hidden="true" />
              <div className="relative w-40 h-40 rounded-full flex items-center justify-center border border-primary/30 bg-white/5 backdrop-blur-[16px]">
                <span
                  className="material-symbols-outlined text-[84px] text-primary"
                  style={{
                    fontVariationSettings: "'FILL' 1, 'wght' 300",
                    textShadow: '0 0 20px rgba(255,51,153,0.6)',
                  }}
                  aria-hidden="true"
                >
                  hourglass_empty
                </span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl bg-white/5 backdrop-blur-[16px] border border-white/10">
            <div className="mb-2 inline-flex px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-primary text-[10px] uppercase font-bold tracking-widest">Estado del Pago</span>
            </div>

            <h3 className="text-white text-3xl font-extrabold leading-tight pb-3">¡Pago en proceso!</h3>

            <p className="text-white/70 text-base font-medium leading-relaxed mb-10 max-w-[260px]">
              Estamos verificando tu pago. En breve podrás seguir disfrutando de{' '}
              <span className="text-primary font-bold">Cataly</span>
            </p>

            {statusMsg ? (
              <div className="mb-4 w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
                <div className="text-xs font-bold uppercase tracking-widest text-white/40">Actualización</div>
                <div className="mt-1 text-sm text-white/70">{statusMsg}</div>
                {lastStatus === 'rejected' && reviewNote ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Motivo</div>
                    <div className="mt-1 text-sm text-white/80">{reviewNote}</div>
                  </div>
                ) : null}
                {lastStatus ? (
                  <div className="mt-2 text-[11px] text-white/40">
                    Último estado: <span className="font-semibold text-white/70">{String(lastStatus)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={checkStatus}
              disabled={checking}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-2xl transition-all duration-300 shadow-[0_8px_30px_rgba(255,51,153,0.3)] flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70"
            >
              <span className="material-symbols-outlined">receipt_long</span>
              {checking ? 'Verificando…' : 'Ver estado'}
            </button>

            {lastStatus === 'rejected' ? (
              <button
                type="button"
                onClick={() => navigate('/precios')}
                className="mt-3 w-full border border-white/10 bg-white/5 text-white font-bold py-4 rounded-2xl transition-colors hover:bg-white/10"
              >
                Enviar nuevo comprobante
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                window.location.href = 'mailto:soporte@cataly.app'
              }}
              className="mt-8 text-white/40 text-sm font-semibold hover:text-white transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">support_agent</span>
              Contactar soporte técnico
            </button>
          </div>

          <div className="mt-12 flex items-center gap-2 opacity-20 grayscale">
            <div className="h-[1px] w-8 bg-white" />
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-white">Security &amp; Billing</span>
            <div className="h-[1px] w-8 bg-white" />
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  )
}
