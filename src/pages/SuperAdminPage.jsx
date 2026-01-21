import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  Copy,
  Download,
  LayoutDashboard,
  Search,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Store,
} from 'lucide-react'

import { useAuthSession } from '../hooks/useAuthSession'
import { adminRepository } from '../data/adminRepository'
import { suscripcionesRepository } from '../data/suscripcionesRepository'
import { PRICING_PLANS } from '../data/pricingPlans'
import { solicitudesPagoRepository } from '../data/solicitudesPagoRepository'

const PLANS = ['All', 'free', ...PRICING_PLANS.map((p) => p.id)]

const getPlanLabel = (planId) => {
  const id = String(planId || '').trim()
  if (!id) return '—'
  if (id === 'free') return 'Free'
  if (id === 'monthly') return '1 Mes'
  if (id === 'biannual') return '6 Meses'
  if (id === 'annual') return 'Anual'
  return id
}

const formatDateTime = (value) => {
  if (!value) return ''
  try {
    const d = new Date(value)
    return d.toLocaleString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

const formatJoined = (value) => {
  if (!value) return ''
  try {
    const d = new Date(value)
    return d.toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: '2-digit' })
  } catch {
    return ''
  }
}

const toCsv = (rows) => {
  const headers = ['negocio', 'email', 'plan', 'activa', 'handle', 'owner_id', 'joined_at']
  const escape = (v) => {
    const s = String(v ?? '')
    if (/[\n",]/.test(s)) return `"${s.replaceAll('"', '""')}"`
    return s
  }

  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.nombreNegocio,
        r.email,
        r.plan,
        r.activa ? '1' : '0',
        r.handle,
        r.ownerId,
        r.joinedAt,
      ]
        .map(escape)
        .join(','),
    )
  }
  return lines.join('\n')
}

const downloadCsv = (rows) => {
  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `suscripciones-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function PlanChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary text-white px-4 text-sm font-semibold'
          : 'flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white border border-slate-200 px-4 text-sm font-medium text-slate-700'
      }
    >
      {label}
    </button>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
    </label>
  )
}

export default function SuperAdminPage() {
  const { session, cargando } = useAuthSession()
  const [isSuperadmin, setIsSuperadmin] = useState(null)
  const [roleError, setRoleError] = useState('')

  const supabaseProjectHost = useMemo(() => {
    const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
    if (!url) return '—'
    try {
      return new URL(url).host
    } catch {
      return url
    }
  }, [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accounts, setAccounts] = useState([])

  const [tab, setTab] = useState('usuarios')

  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState('')
  const [payments, setPayments] = useState([])
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [paymentProofUrl, setPaymentProofUrl] = useState('')
  const [paymentActionLoading, setPaymentActionLoading] = useState(false)
  const [paymentNote, setPaymentNote] = useState('')

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsAccount, setDetailsAccount] = useState(null)
  const [detailsSaving, setDetailsSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('All')

  useEffect(() => {
    let mounted = true

    if (!session) {
      setIsSuperadmin(null)
      setRoleError('')
      return () => {
        mounted = false
      }
    }

    ;(async () => {
      try {
        const ok = await adminRepository.isSuperadmin()
        if (mounted) {
          setIsSuperadmin(ok)
          setRoleError('')
        }
      } catch (err) {
        if (mounted) {
          setIsSuperadmin(false)
          const msg = String(err?.message || '').trim()
          const code = String(err?.code || err?.status || '').trim()
          setRoleError(
            msg
              ? `No se pudo verificar el rol de superadmin: ${msg}${code ? ` (código ${code})` : ''}`
              : 'No se pudo verificar el rol de superadmin (revisa RLS/tabla app_admins).',
          )
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [session])

  const reload = async () => {
    setError('')
    setLoading(true)
    try {
      const rows = await suscripcionesRepository.listAccounts()
      setAccounts(rows)
    } catch (e) {
      setError(e?.message || 'No se pudieron cargar las cuentas.')
    } finally {
      setLoading(false)
    }
  }

  const reloadPayments = async () => {
    setPaymentsError('')
    setPaymentsLoading(true)
    try {
      const rows = await solicitudesPagoRepository.listSolicitudes({ status: 'pending' })
      setPayments(rows)
    } catch (e) {
      setPaymentsError(e?.message || 'No se pudieron cargar los cobros.')
    } finally {
      setPaymentsLoading(false)
    }
  }

  useEffect(() => {
    if (!session) return
    if (isSuperadmin !== true) return
    reload()
  }, [session, isSuperadmin])

  useEffect(() => {
    if (!session) return
    if (isSuperadmin !== true) return
    if (tab !== 'cobros') return
    reloadPayments()
  }, [session, isSuperadmin, tab])

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase()

    return accounts.filter((a) => {
      if (planFilter !== 'All' && a.plan !== planFilter) return false
      if (!q) return true
      const hay = `${a.nombreNegocio || ''} ${a.email || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [accounts, planFilter, search])

  const stats = useMemo(() => {
    const total = accounts.length
    const active = accounts.filter((a) => a.hasAccess).length
    const expired = total - active

    const planPrices = {
      free: 0,
      monthly: PRICING_PLANS.find((p) => p.id === 'monthly')?.price ?? 0,
      biannual: PRICING_PLANS.find((p) => p.id === 'biannual')?.price ?? 0,
      annual: PRICING_PLANS.find((p) => p.id === 'annual')?.price ?? 0,
    }

    const revenue = accounts.reduce((acc, a) => {
      if (!a.hasAccess) return acc
      return acc + (planPrices[a.plan] ?? 0)
    }, 0)

    return { total, active, expired, revenue }
  }, [accounts])

  const isExpiredAt = (value) => {
    if (!value) return false
    try {
      const d = new Date(value)
      return Number.isFinite(d.getTime()) && d.getTime() <= Date.now()
    } catch {
      return false
    }
  }

  const handleToggle = async (ownerId, next) => {
    setError('')
    setAccounts((prev) => prev.map((a) => (a.ownerId === ownerId ? { ...a, activa: next } : a)))
    try {
      await suscripcionesRepository.setActive(ownerId, next)
    } catch (e) {
      setAccounts((prev) => prev.map((a) => (a.ownerId === ownerId ? { ...a, activa: !next } : a)))
      setError(e?.message || 'No se pudo actualizar la suscripción.')
    }
  }

  const openDetails = (account) => {
    setDetailsAccount(account)
    setDetailsOpen(true)
  }

  const closeDetails = () => {
    setDetailsOpen(false)
    setDetailsAccount(null)
    setDetailsSaving(false)
  }

  const copyText = async (value) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(value || ''))
      } else {
        window.prompt('Copia esto:', String(value || ''))
      }
    } catch {
      window.prompt('Copia esto:', String(value || ''))
    }
  }

  const openPaymentDetails = async (p) => {
    setPaymentDetails(p)
    setPaymentNote(p?.review_note || '')
    setPaymentDetailsOpen(true)
    setPaymentProofUrl('')
    try {
      const signedUrl = await solicitudesPagoRepository.createSignedProofUrl(p?.comprobante_path)
      setPaymentProofUrl(signedUrl)
    } catch {
      setPaymentProofUrl('')
    }
  }

  const closePaymentDetails = () => {
    setPaymentDetailsOpen(false)
    setPaymentDetails(null)
    setPaymentProofUrl('')
    setPaymentActionLoading(false)
    setPaymentNote('')
  }

  const computeExtendedExpiresAtIso = (planId, currentExpiresAt) => {
    const id = String(planId || '').trim()
    const days = id === 'monthly' ? 30 : id === 'biannual' ? 180 : id === 'annual' ? 365 : 0
    if (!days) return null

    // Si ya tenía expiración null (lifetime), mantenemos null.
    if (currentExpiresAt === null) return null

    const now = Date.now()
    let base = now
    if (currentExpiresAt) {
      const d = new Date(currentExpiresAt)
      const t = d.getTime()
      if (Number.isFinite(t) && t > now) base = t
    }

    const next = new Date(base)
    next.setDate(next.getDate() + days)
    return next.toISOString()
  }

  const approvePayment = async () => {
    if (!paymentDetails?.id) return
    setPaymentsError('')
    setPaymentActionLoading(true)
    try {
      await solicitudesPagoRepository.updateStatus(paymentDetails.id, {
        status: 'approved',
        reviewNote: paymentNote,
      })

      const currentSub = await suscripcionesRepository.getByOwnerId(paymentDetails.owner_id)
      const nextExpiresAt = computeExtendedExpiresAtIso(paymentDetails.plan_id, currentSub?.expiresAt)

      await suscripcionesRepository.upsertSubscription(paymentDetails.owner_id, {
        plan: paymentDetails.plan_id,
        activa: true,
        expiresAt: nextExpiresAt,
      })

      await reloadPayments()
      await reload()
      closePaymentDetails()
    } catch (e) {
      setPaymentsError(e?.message || 'No se pudo aprobar el pago.')
    } finally {
      setPaymentActionLoading(false)
    }
  }

  const rejectPayment = async () => {
    if (!paymentDetails?.id) return
    setPaymentsError('')
    setPaymentActionLoading(true)
    try {
      await solicitudesPagoRepository.updateStatus(paymentDetails.id, {
        status: 'rejected',
        reviewNote: paymentNote,
      })

      await reloadPayments()
      closePaymentDetails()
    } catch (e) {
      setPaymentsError(e?.message || 'No se pudo rechazar el pago.')
    } finally {
      setPaymentActionLoading(false)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center p-6 text-slate-600">
        Cargando…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Mientras validamos el rol, mostramos skeleton simple.
  if (isSuperadmin === null) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center p-6 text-slate-600">
        Verificando acceso…
      </div>
    )
  }

  if (isSuperadmin === false) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="text-base font-semibold text-slate-900">Acceso restringido</div>
          <div className="mt-2 text-sm text-slate-600">
            Tu cuenta no tiene permisos de superadmin.
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Sesión actual</div>
            <div className="mt-1 text-xs text-slate-700 break-all">
              <span className="font-semibold">user_id:</span> {session?.user?.id || '—'}
            </div>
            <div className="mt-1 text-xs text-slate-700 break-all">
              <span className="font-semibold">email:</span> {session?.user?.email || '—'}
            </div>
            <div className="mt-1 text-xs text-slate-700 break-all">
              <span className="font-semibold">supabase:</span> {supabaseProjectHost}
            </div>
          </div>

          {roleError ? (
            <div className="mt-3 text-sm text-rose-600">{roleError}</div>
          ) : null}

          <div className="mt-4 text-sm text-slate-700">
            Verifica en Supabase:
            <ul className="list-disc ml-5 mt-2 space-y-1 text-slate-600">
              <li>Que ejecutaste el SQL que crea <span className="font-mono">app_admins</span> y sus policies.</li>
              <li>Que exista tu fila en <span className="font-mono">public.app_admins</span> con role <span className="font-mono">superadmin</span>.</li>
              <li>Que estás logueado con el usuario correcto (Auth Users id).</li>
            </ul>
          </div>

          <div className="mt-5 flex gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-xl bg-primary text-white px-4 h-10 text-sm font-semibold"
            >
              Ir al admin
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 px-4 h-10 text-sm font-semibold"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-light text-[#0e141b] min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col bg-background-light max-w-[480px] mx-auto overflow-x-hidden border-x border-slate-200">
        {/* TopAppBar */}
        <div className="sticky top-0 z-20 bg-background-light/80 backdrop-blur-md">
          <div className="flex items-center p-4 pb-2 justify-between">
            <div className="text-primary flex size-10 shrink-0 items-center justify-center bg-primary/10 rounded-lg">
              <LayoutDashboard size={18} />
            </div>
            <h2 className="text-[#0e141b] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 ml-3">
              {tab === 'cobros' ? 'Cobros' : 'Suscripciones'}
            </h2>
            <div className="flex w-10 items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  if (tab === 'usuarios') downloadCsv(filtered)
                  if (tab === 'cobros') reloadPayments()
                }}
                className="flex items-center justify-center rounded-lg h-10 w-10 bg-white border border-slate-200 text-[#0e141b]"
                title={tab === 'usuarios' ? 'Descargar CSV' : 'Recargar'}
                aria-label={tab === 'usuarios' ? 'Descargar CSV' : 'Recargar'}
              >
                {tab === 'usuarios' ? <Download size={18} /> : <LayoutDashboard size={18} />}
              </button>
            </div>
          </div>
        </div>

        {tab === 'usuarios' ? (
          <>
            {/* Stats */}
            <div className="flex flex-wrap gap-3 p-4">
              <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl p-4 bg-white shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total usuarios</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-[#0e141b] tracking-tight text-xl font-bold leading-tight">{stats.total}</p>
                </div>
              </div>
              <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl p-4 bg-white shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Activas</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-[#0e141b] tracking-tight text-xl font-bold leading-tight">{stats.active}</p>
                </div>
              </div>
              <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl p-4 bg-white shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Inactivas</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-[#0e141b] tracking-tight text-xl font-bold leading-tight">{stats.expired}</p>
                </div>
              </div>
              <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl p-4 bg-white shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Revenue (estimado)</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-[#0e141b] tracking-tight text-xl font-bold leading-tight">${stats.revenue}</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
              <label className="flex flex-col min-w-40 h-12 w-full">
                <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
                  <div className="text-slate-400 flex border-none bg-white items-center justify-center pl-4 rounded-l-xl">
                    <Search size={18} />
                  </div>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-[#0e141b] focus:outline-0 focus:ring-0 border-none bg-white focus:border-none h-full placeholder:text-slate-400 px-4 pl-2 text-base font-normal leading-normal"
                    placeholder="Buscar negocio o email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </label>
            </div>

            {/* Chips */}
            <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
              {PLANS.map((p) => (
                <PlanChip
                  key={p}
                  label={p === 'All' ? 'Todos' : getPlanLabel(p)}
                  active={planFilter === p}
                  onClick={() => setPlanFilter(p)}
                />
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-2">
              <h3 className="text-[#0e141b] text-lg font-bold leading-tight tracking-[-0.015em]">Cuentas</h3>
              <span className="text-xs font-semibold text-slate-500">{filtered.length} TOTAL</span>
            </div>

            {error ? <div className="px-4 pt-3 text-sm text-rose-600">{error}</div> : null}

            {/* List */}
            <div className="flex flex-col gap-3 p-4 pb-24">
              {loading ? (
                <div className="text-slate-600 text-sm">Cargando cuentas…</div>
              ) : filtered.length === 0 ? (
                <div className="text-slate-600 text-sm">No hay resultados.</div>
              ) : (
                filtered.map((u) => (
                  <div
                    key={u.ownerId}
                    className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 ${u.hasAccess ? '' : 'opacity-80'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-base text-[#0e141b]">{u.nombreNegocio || 'Sin nombre'}</span>
                        <span className="text-sm text-slate-500">{u.email || '—'}</span>
                      </div>

                      <Toggle checked={u.activa} disabled={loading} onChange={(next) => handleToggle(u.ownerId, next)} />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex gap-2 items-center">
                        <span
                          className={
                            u.plan === 'annual'
                              ? 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary'
                              : u.plan === 'biannual'
                                ? 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600'
                                : u.plan === 'monthly'
                                  ? 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700'
                                  : 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-600'
                          }
                        >
                          {getPlanLabel(u.plan)}
                          {u.hasAccess ? '' : u.activa && isExpiredAt(u.expiresAt) ? ' (expirada)' : ' (sin acceso)'}
                        </span>
                        <span className="text-[11px] text-slate-400">{u.joinedAt ? `Desde ${formatJoined(u.joinedAt)}` : ''}</span>
                      </div>

                      <div className="flex gap-3">
                        {u.handle ? (
                            <Link
                                to={`/${u.handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-primary transition-colors flex items-center justify-center"
                                title={`Ver catálogo: /${u.handle}`}
                            >
                              <Store size={16} />
                            </Link>
                        ) : null}
                        <button type="button" onClick={() => openDetails(u)} className="text-primary text-sm font-bold flex items-center gap-1">
                          Detalles
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {paymentsError ? <div className="px-4 pt-3 text-sm text-rose-600">{paymentsError}</div> : null}

            <div className="flex items-center justify-between px-4 pt-4">
              <h3 className="text-[#0e141b] text-lg font-bold leading-tight tracking-[-0.015em]">Solicitudes pendientes</h3>
              <span className="text-xs font-semibold text-slate-500">{payments.length} TOTAL</span>
            </div>

            <div className="flex flex-col gap-3 p-4 pb-24">
              {paymentsLoading ? (
                <div className="text-slate-600 text-sm">Cargando cobros…</div>
              ) : payments.length === 0 ? (
                <div className="text-slate-600 text-sm">No hay solicitudes pendientes.</div>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {p.nombreNegocio || 'Sin negocio'}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 truncate">{p.email || '—'}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                            {getPlanLabel(p.plan_id)}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                            {p.metodo === 'ves' ? 'Bolívares' : 'Binance'}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                            {p.plan_price_usd ? `$${p.plan_price_usd}` : '—'}
                          </span>
                        </div>
                      </div>

                      <button type="button" onClick={() => openPaymentDetails(p)} className="text-primary text-sm font-bold flex items-center gap-1 shrink-0">
                        Revisar
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="mt-3 border-t border-slate-50 pt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Ref: <span className="font-mono text-slate-700">{p.referencia || '—'}</span></span>
                      <span>{formatDateTime(p.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Bottom Nav (solo visual) */}
        <div className="fixed bottom-0 w-full max-w-[480px] bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center h-20 pb-4 px-2">
          <button
            type="button"
            onClick={() => setTab('usuarios')}
            className={tab === 'usuarios' ? 'flex flex-col items-center gap-1 text-primary' : 'flex flex-col items-center gap-1 text-slate-400'}
          >
            <Users size={18} />
            <span className="text-[10px] font-bold">Usuarios</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('cobros')}
            className={tab === 'cobros' ? 'flex flex-col items-center gap-1 text-primary' : 'flex flex-col items-center gap-1 text-slate-400'}
          >
            <CreditCard size={18} />
            <span className="text-[10px] font-medium">Cobros</span>
          </button>
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <BarChart3 size={18} />
            <span className="text-[10px] font-medium">Analítica</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <Settings size={18} />
            <span className="text-[10px] font-medium">Ajustes</span>
          </div>
        </div>

        <div className="sr-only">
          <button type="button" onClick={reload}>Recargar</button>
        </div>
      </div>

      {detailsOpen && detailsAccount ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">{detailsAccount.nombreNegocio || 'Sin nombre'}</div>
                <div className="text-xs text-slate-500">{detailsAccount.email || '—'}</div>
              </div>
              <button type="button" onClick={closeDetails} className="text-slate-500 hover:text-slate-700">
                Cerrar
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-700">Suscripción activa</div>
                <Toggle
                  checked={detailsAccount.activa}
                  disabled={detailsSaving}
                  onChange={async (next) => {
                    setDetailsSaving(true)
                    setDetailsAccount((prev) => (prev ? { ...prev, activa: next } : prev))
                    setAccounts((prev) => prev.map((a) => (a.ownerId === detailsAccount.ownerId ? { ...a, activa: next } : a)))
                    try {
                      await suscripcionesRepository.setActive(detailsAccount.ownerId, next)
                    } catch (e) {
                      setError(e?.message || 'No se pudo actualizar la suscripción.')
                      setDetailsAccount((prev) => (prev ? { ...prev, activa: !next } : prev))
                      setAccounts((prev) => prev.map((a) => (a.ownerId === detailsAccount.ownerId ? { ...a, activa: !next } : a)))
                    } finally {
                      setDetailsSaving(false)
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-700">Plan</div>
                <select
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={detailsAccount.plan}
                  disabled={detailsSaving}
                  onChange={async (e) => {
                    const nextPlan = e.target.value
                    setDetailsSaving(true)
                    setDetailsAccount((prev) => (prev ? { ...prev, plan: nextPlan } : prev))
                    setAccounts((prev) => prev.map((a) => (a.ownerId === detailsAccount.ownerId ? { ...a, plan: nextPlan } : a)))
                    try {
                      await suscripcionesRepository.setPlan(detailsAccount.ownerId, nextPlan)
                    } catch (err) {
                      setError(err?.message || 'No se pudo actualizar el plan.')
                      await reload()
                    } finally {
                      setDetailsSaving(false)
                    }
                  }}
                >
                  <option value="Free">Free</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-slate-500">Owner ID</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono text-slate-700 break-all">{detailsAccount.ownerId}</div>
                  <button
                    type="button"
                    onClick={() => copyText(detailsAccount.ownerId)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-700"
                    title="Copiar"
                    aria-label="Copiar"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {paymentDetailsOpen && paymentDetails ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">{paymentDetails.nombreNegocio || 'Solicitud'}</div>
                <div className="text-xs text-slate-500">{paymentDetails.email || '—'}</div>
              </div>
              <button type="button" onClick={closePaymentDetails} className="text-slate-500 hover:text-slate-700">
                Cerrar
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">Plan</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{getPlanLabel(paymentDetails.plan_id)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">Método</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{paymentDetails.metodo === 'ves' ? 'Bolívares' : 'Binance'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">Referencia</div>
                  <div className="mt-1 text-sm font-mono text-slate-900 break-all">{paymentDetails.referencia || '—'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">Fecha pago</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{paymentDetails.fecha_pago || '—'}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] text-slate-500">Comprobante</div>
                {paymentProofUrl ? (
                  <a
                    href={paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary text-white px-4 h-10 text-sm font-semibold"
                  >
                    Abrir comprobante
                  </a>
                ) : (
                  <div className="mt-2 text-sm text-slate-600">No se pudo generar el link del comprobante.</div>
                )}
              </div>

              <div>
                <div className="text-[11px] text-slate-500 mb-2">Nota (opcional)</div>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  placeholder="Ej: Pago confirmado por Binance / Falta referencia / etc."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={rejectPayment}
                  disabled={paymentActionLoading}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 h-11 text-sm font-semibold disabled:opacity-60"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={approvePayment}
                  disabled={paymentActionLoading}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary text-white px-4 h-11 text-sm font-semibold disabled:opacity-60"
                >
                  Aprobar y activar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="hidden">
        <Link to="/admin">Admin</Link>
      </div>
    </div>
  )
}
