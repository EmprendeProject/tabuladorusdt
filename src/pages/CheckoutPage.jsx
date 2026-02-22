import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPricingPlanById, PRICING_PLANS } from '../data/pricingPlans'
import { useTasas } from '../hooks/useTasas'
import { useAuthSession } from '../hooks/useAuthSession'
import { solicitudesPagoRepository } from '../data/solicitudesPagoRepository'

const METHODS = [
  {
    id: 'binance',
    label: 'Binance',
    icon: 'currency_bitcoin',
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-500/10',
  },
  {
    id: 'ves',
    label: 'Bolívares',
    icon: 'account_balance',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/20',
  },
]

function getPlanTitleEs(plan) {
  const id = plan?.id
  if (id === 'annual') return 'Plan Anual'
  if (id === 'monthly') return '1 Mes'
  if (id === 'biannual') return '6 Meses'
  return plan?.title || 'Plan'
}

function getPlanBillingEs(plan) {
  const id = plan?.id
  if (id === 'annual') return 'Facturado anual • Acceso completo'
  if (id === 'monthly') return 'Facturado mensual • Acceso completo'
  if (id === 'biannual') return 'Facturado semestral • Acceso completo'
  return ''
}

function formatNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function formatLocalDateInputValue(date) {
  const d = date instanceof Date ? date : new Date(date)
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { tasaUSDT, cargandoUSDT } = useTasas()
  const { session } = useAuthSession()

  const planId = params.get('plan')
  const plan = useMemo(() => getPricingPlanById(planId) || PRICING_PLANS.find((p) => p.featured) || PRICING_PLANS[0], [planId])

  const [methodId, setMethodId] = useState('ves')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => formatLocalDateInputValue(new Date()))
  const [proofFile, setProofFile] = useState(null)

  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [sendError, setSendError] = useState('')

  const fileInputRef = useRef(null)

  const tasaUsdtNum = useMemo(() => {
    const n = Number.parseFloat(String(tasaUSDT || '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }, [tasaUSDT])

  const amountBs = useMemo(() => {
    if (methodId !== 'ves') return 0
    const priceUsd = Number(plan?.price || 0)
    if (!Number.isFinite(priceUsd) || !Number.isFinite(tasaUsdtNum) || tasaUsdtNum <= 0) return 0
    return priceUsd * tasaUsdtNum
  }, [methodId, plan?.price, tasaUsdtNum])

  const amountLabelBs = amountBs ? `Bs. ${formatNumber(amountBs)}` : 'Bs. —'

  const planTitleEs = useMemo(() => getPlanTitleEs(plan), [plan])
  const planBillingEs = useMemo(() => getPlanBillingEs(plan), [plan])

  const onPickFile = () => {
    fileInputRef.current?.click?.()
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null
    setProofFile(file)
  }

  const onConfirm = async () => {
    setSendError('')

    const planIdSafe = plan?.id || ''
    const returnTo = `/checkout?plan=${encodeURIComponent(planIdSafe)}`

    if (!session) {
      navigate(`/register?redirectTo=${encodeURIComponent(returnTo)}`)
      return
    }

    if (sending) return

    const ref = String(referenceNumber || '').trim()
    if (!/^[0-9]{6,8}$/.test(ref)) {
      setSendError('La referencia debe tener 6 a 8 dígitos.')
      return
    }

    if (!paymentDate) {
      setSendError('Selecciona la fecha de pago.')
      return
    }

    if (!proofFile) {
      setSendError('Adjunta el comprobante de pago (imagen o PDF).')
      return
    }

    const maxBytes = 5 * 1024 * 1024
    if (proofFile.size > maxBytes) {
      setSendError('El comprobante supera 5MB. Intenta con una imagen más liviana o PDF comprimido.')
      return
    }

    if (methodId === 'ves' && (cargandoUSDT || !amountBs)) {
      setSendError('Aún estamos calculando el monto en bolívares. Intenta de nuevo en unos segundos.')
      return
    }

    setSending(true)
    try {
      const created = await solicitudesPagoRepository.createSolicitud({
        planId: plan?.id,
        planPriceUsd: plan?.price,
        metodo: methodId,
        montoBs: methodId === 'ves' ? amountBs : null,
        referencia: ref,
        fechaPago: paymentDate,
        comprobanteFile: proofFile,
      })

      setSentOk(true)
      const query = new URLSearchParams({
        plan: String(plan?.id || ''),
        price: String(plan?.price || ''),
        ref: String(ref || ''),
        solicitud: String(created?.id || ''),
      })
      navigate(`/pago/gracias?${query.toString()}`, { replace: true })
    } catch (e) {
      const msg = String(e?.message || '').trim()
      setSendError(msg || 'No se pudo enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const method = METHODS.find((m) => m.id === methodId) || METHODS[0]

  return (
    <div className="min-h-screen bg-white text-gray-900 font-[Manrope] selection:bg-[#1840f5] selection:text-white antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col overflow-x-hidden pb-32 z-10">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1840f5]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1840f5]/10 rounded-full blur-[100px]" />
        </div>

        <header className="flex items-center justify-between p-6">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate(-1)}
            className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
          </button>

          <h2 className="text-lg font-bold tracking-tight text-gray-900">Pago</h2>
          <div className="size-10" />
        </header>

        <section className="px-6 mb-8">
          <div className="flex items-center justify-between rounded-3xl border border-gray-200 bg-gray-50 p-6 border-l-4 border-l-[#1840f5]">
            <div>
              <span className="block mb-1 text-[10px] font-black uppercase tracking-widest text-[#1840f5]">Plan seleccionado</span>
              <h3 className="text-2xl font-black text-gray-900">{planTitleEs}</h3>
              <p className="text-xs text-gray-500">{planBillingEs}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-gray-900">{plan?.priceLabel || ''}</span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">{plan?.currency || 'USD'}</span>
            </div>
          </div>
        </section>

        <section className="px-6 mb-8 relative z-10">
          <h4 className="mb-4 px-2 text-sm font-bold uppercase tracking-[0.15em] text-gray-500">Método de pago</h4>
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map((m) => {
              const active = m.id === methodId
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethodId(m.id)}
                  className={
                    'rounded-2xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-all active:scale-95 ' +
                    (active
                      ? 'border-2 border-[#1840f5] bg-[#1840f5]/5 shadow-lg shadow-[#1840f5]/20'
                      : 'border border-gray-200 bg-gray-50 hover:bg-gray-100')
                  }
                >
                  <div className={'size-12 rounded-xl flex items-center justify-center ' + (active ? (m.id==='ves' ? 'bg-[#1840f5]/20 text-[#1840f5]' : m.iconBg) : 'bg-gray-100')}>
                    <span className={'material-symbols-outlined text-3xl font-fill ' + (active ? (m.id==='ves' ? 'text-[#1840f5]' : m.iconColor) : 'text-gray-400')}>
                      {m.icon}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{m.label}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-4">
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Datos para pagar</div>
                  <div className="mt-1 text-base font-extrabold text-gray-900">{methodId === 'ves' ? 'Pago en bolívares' : 'Pago por Binance'}</div>
                </div>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600">
                  {method.label}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {methodId === 'ves' ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Monto a pagar</span>
                      <span className="font-black text-gray-900">{amountLabelBs}</span>
                    </div>
                    <div className="mt-3 h-px w-full bg-gray-200" />

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Cédula</span>
                      <span className="font-bold text-gray-900">27536328</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Banco</span>
                      <span className="font-bold text-gray-900">Banesco</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Teléfono</span>
                      <span className="font-bold text-gray-900">04243427035</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Monto a pagar</span>
                      <span className="font-black text-gray-900">{plan?.priceLabel} {plan?.currency || 'USD'}</span>
                    </div>

                    <div className="mt-3 h-px w-full bg-gray-200" />

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Correo Binance</span>
                      <span className="font-bold text-gray-900">brayandmg1998@gmail.com</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 space-y-6 relative z-10">
          {sentOk ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-5">
              <h5 className="mb-1 text-sm font-bold uppercase tracking-wide text-emerald-700">Solicitud enviada</h5>
              <p className="text-xs leading-relaxed text-emerald-800/80">
                Recibimos tu comprobante. Nuestro equipo lo verificará y activará tu acceso.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Ir al panel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSentOk(false)
                    setProofFile(null)
                    setReferenceNumber('')
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  Enviar otro
                </button>
              </div>
            </div>
          ) : null}

          {sendError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {sendError}
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                Número de referencia (6-8 dígitos)
              </label>
              <input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Ejemplo: 837492"
                type="text"
                inputMode="numeric"
                className="w-full rounded-2xl px-4 py-4 text-gray-900 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#1840f5] focus:ring-1 focus:ring-[#1840f5] transition-colors"
              />
            </div>

            <div>
              <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                Fecha de pago
              </label>
              <div className="relative">
                <input
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  type="date"
                  className="w-full appearance-none rounded-2xl px-4 py-4 text-gray-900 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#1840f5] focus:ring-1 focus:ring-[#1840f5] transition-colors"
                />
                <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  calendar_today
                </span>
              </div>
            </div>

            <div className="pt-2">
              <label className="mb-2 ml-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                Comprobante de pago
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={onFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={onPickFile}
                className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 transition-all hover:border-[#1840f5]/40 hover:bg-[#1840f5]/5"
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100">
                    <span className="material-symbols-outlined text-3xl text-gray-400">add_photo_alternate</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{proofFile ? 'Archivo listo' : 'Subir captura'}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {proofFile ? proofFile.name : 'JPG, PNG o PDF (máx 5MB)'}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1840f5]/20 bg-[#1840f5]/5 p-5">
            <h5 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#1840f5]">
              <span className="material-symbols-outlined text-sm">info</span>
              Instrucciones importantes
            </h5>
            <p className="text-xs leading-relaxed text-gray-600">
              {methodId === 'ves' ? (
                <>
                  Luego de realizar tu pago debes esperar unos minutos mientras es verificado por nuestro equipo de trabajo {'\n'} <strong>{amountLabelBs}</strong> vía Pago Móvil o transferencia.
                </>
              ) : (
                <>
                  Luego de realizar tu pago debes esperar unos minutos mientras es verificado por nuestro equipo de trabajo.    {'\n'}  <strong>{plan?.priceLabel} {plan?.currency || 'USD'}</strong> por Binance.
                </>
              )}
            </p>
            <p className="mt-2 text-[11px] text-gray-500">
              Método seleccionado: <span className="font-bold text-gray-900">{method.label}</span>
            </p>
          </div>
        </section>

        <div className="flex flex-col items-center gap-4 px-6 py-8 relative z-10">
          <p className="text-center text-[10px] leading-relaxed text-gray-400">
            Al tocar “Confirmar pago”, aceptas nuestros términos. Nuestro equipo verificará tu pago en menos de 24 horas.
          </p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-6 pt-10" style={{ background: 'linear-gradient(to top, white 80%, transparent)' }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sending || sentOk}
            className="flex h-16 w-full max-w-[432px] items-center justify-center gap-2 rounded-2xl bg-[#1840f5] text-xl font-black text-white shadow-xl shadow-[#1840f5]/30 hover:shadow-[#1840f5]/50 transition-all active:scale-95 uppercase tracking-tight disabled:opacity-60 disabled:active:scale-100 hover:bg-[#1430b8]"
          >
            {sending ? 'Enviando…' : sentOk ? 'Enviado' : 'Confirmar pago'}
            <span className="material-symbols-outlined font-bold">check_circle</span>
          </button>
        </div>

        <div className="pointer-events-none fixed top-1/4 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
        <div className="pointer-events-none fixed bottom-1/4 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
      </div>
    </div>
  )
}
