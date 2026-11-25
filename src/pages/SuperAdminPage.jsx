import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  Copy,
  Download,
  LayoutDashboard,
  RefreshCw,
  Search,
  Users,
  CreditCard,
  BarChart3,
  Store,
  MessageCircle,
} from 'lucide-react'

import { useAuthSession } from '../hooks/useAuthSession'
import { adminRepository } from '../data/adminRepository'
import { suscripcionesRepository } from '../data/suscripcionesRepository'
import { PRICING_PLANS, getPricingPlanById, getPlanLabel } from '../data/pricingPlans'
import { TIERS } from '../lib/planFeatures'
import { solicitudesPagoRepository } from '../data/solicitudesPagoRepository'
import MetricsDashboard from '../components/superadmin/MetricsDashboard'
import { formatInt, formatUsd } from '../lib/adminMetrics'

const DAY = 24 * 60 * 60 * 1000
const PAGE = 50

const expMs = (a) => {
  const t = a.expiresAt ? new Date(a.expiresAt).getTime() : NaN
  return Number.isFinite(t) ? t : null
}

// Filtros de estado: se calculan sobre `hasAccess` (activa + no vencida), no sobre el interruptor.
const STATUS_FILTERS = [
  { key: 'all', label: 'Todas', test: () => true },
  { key: 'active', label: 'Activas', test: (a) => a.hasAccess },
  { key: 'paying', label: 'De pago', test: (a) => a.hasAccess && Boolean(getPricingPlanById(a.plan)) },
  { key: 'trial', label: 'En prueba', test: (a) => a.hasAccess && a.plan === 'trial' },
  {
    key: 'expiring',
    label: 'Vencen en 7 días',
    test: (a, now) => {
      const t = expMs(a)
      return a.hasAccess && t !== null && t > now && t - now <= 7 * DAY
    },
  },
  { key: 'inactive', label: 'Sin acceso', test: (a) => !a.hasAccess },
]

// Filtros de plan: la duración agrupa Estándar y Pro; "Cattaly Pro" filtra por nivel.
const PLAN_FILTERS = [
  { key: 'all', label: 'Todos los planes', test: () => true },
  { key: 'trial', label: 'Prueba', test: (a) => a.plan === 'trial' },
  { key: 'monthly', label: '1 mes', test: (a) => a.plan === 'monthly' || a.plan === 'premium_monthly' },
  { key: 'biannual', label: '6 meses', test: (a) => a.plan === 'biannual' || a.plan === 'premium_biannual' },
  { key: 'annual', label: 'Anual', test: (a) => a.plan === 'annual' || a.plan === 'premium_annual' },
  { key: 'pro', label: 'Cattaly Pro', test: (a) => a.tier === TIERS.PREMIUM },
  { key: 'free', label: 'Free', test: (a) => a.plan === 'free' },
]

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

function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ' +
        (active ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400')
      }
    >
      {label}
      {typeof count === 'number' ? (
        <span className={active ? 'text-neutral-400' : 'text-neutral-400'}>{formatInt(count)}</span>
      ) : null}
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
      <div className="relative w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:tranneutral-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900" />
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
  const [approvedPayments, setApprovedPayments] = useState([])
  const totalEarnings = useMemo(
    () => approvedPayments.reduce((acc, p) => acc + (Number(p.plan_price_usd) || 0), 0),
    [approvedPayments],
  )

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
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent') // recent | expiring
  // Cuántas cuentas se muestran; se reinicia a PAGE cuando cambian los filtros.
  const [visible, setVisible] = useState({ sig: '', count: PAGE })

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
      const [rows, payments] = await Promise.all([
        suscripcionesRepository.listAccounts(),
        solicitudesPagoRepository.listApprovedPayments(),
      ])
      setAccounts(rows)
      setApprovedPayments(payments)
    } catch (e) {
      setError(e?.message || 'No se pudieron cargar los datos.')
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

  const statusDef = STATUS_FILTERS.find((f) => f.key === statusFilter) || STATUS_FILTERS[0]
  const planDef = PLAN_FILTERS.find((f) => f.key === planFilter) || PLAN_FILTERS[0]

  const searched = useMemo(() => {
    const q = String(search || '').trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter((a) => `${a.nombreNegocio || ''} ${a.email || ''} ${a.handle || ''}`.toLowerCase().includes(q))
  }, [accounts, search])

  // Conteos por chip (respetan la búsqueda y el otro grupo de filtros).
  const counts = useMemo(() => {
    const now = Date.now()
    const status = {}
    const plan = {}
    for (const f of STATUS_FILTERS) status[f.key] = searched.filter((a) => planDef.test(a, now) && f.test(a, now)).length
    for (const f of PLAN_FILTERS) plan[f.key] = searched.filter((a) => statusDef.test(a, now) && f.test(a, now)).length
    return { status, plan }
  }, [searched, statusDef, planDef])

  const filtered = useMemo(() => {
    const now = Date.now()
    const list = searched.filter((a) => statusDef.test(a, now) && planDef.test(a, now))
    if (sortBy === 'expiring') {
      return [...list].sort((a, b) => (expMs(a) ?? Infinity) - (expMs(b) ?? Infinity))
    }
    return list
  }, [searched, statusDef, planDef, sortBy])

  const filterSig = `${search}|${statusFilter}|${planFilter}|${sortBy}`
  const visibleCount = visible.sig === filterSig ? visible.count : PAGE
  const shown = filtered.slice(0, visibleCount)

  const stats = useMemo(() => {
    const total = accounts.length
    const active = accounts.filter((a) => a.hasAccess).length
    const paying = accounts.filter((a) => a.hasAccess && getPricingPlanById(a.plan)).length
    return { total, active, inactive: total - active, paying }
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
    const days = getPricingPlanById(String(planId || '').trim())?.durationDays || 0
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
        tier: getPricingPlanById(paymentDetails.plan_id)?.tier || TIERS.STANDARD,
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-neutral-600">
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-neutral-600">
        Verificando acceso…
      </div>
    )
  }

  if (isSuperadmin === false) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
          <div className="text-base font-semibold text-neutral-900">Acceso restringido</div>
          <div className="mt-2 text-sm text-neutral-600">
            Tu cuenta no tiene permisos de superadmin.
          </div>

          <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Sesión actual</div>
            <div className="mt-1 text-xs text-neutral-700 break-all">
              <span className="font-semibold">user_id:</span> {session?.user?.id || '—'}
            </div>
            <div className="mt-1 text-xs text-neutral-700 break-all">
              <span className="font-semibold">email:</span> {session?.user?.email || '—'}
            </div>
            <div className="mt-1 text-xs text-neutral-700 break-all">
              <span className="font-semibold">supabase:</span> {supabaseProjectHost}
            </div>
          </div>

          {roleError ? (
            <div className="mt-3 text-sm text-rose-600">{roleError}</div>
          ) : null}

          <div className="mt-4 text-sm text-neutral-700">
            Verifica en Supabase:
            <ul className="list-disc ml-5 mt-2 space-y-1 text-neutral-600">
              <li>Que ejecutaste el SQL que crea <span className="font-mono">app_admins</span> y sus policies.</li>
              <li>Que exista tu fila en <span className="font-mono">public.app_admins</span> con role <span className="font-mono">superadmin</span>.</li>
              <li>Que estás logueado con el usuario correcto (Auth Users id).</li>
            </ul>
          </div>

          <div className="mt-5 flex gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 text-white px-4 h-10 text-sm font-semibold"
            >
              Ir al admin
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 px-4 h-10 text-sm font-semibold"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 text-neutral-900 min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col bg-neutral-50 max-w-[480px] mx-auto overflow-x-hidden border-x border-neutral-200">
        {/* Barra superior */}
        <div className="sticky top-0 z-20 bg-neutral-50/85 backdrop-blur-md border-b border-neutral-200">
          <div className="flex items-center p-4 justify-between">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
              <LayoutDashboard size={18} />
            </div>
            <div className="flex-1 ml-3">
              <h2 className="text-base font-semibold leading-tight tracking-tight">
                {tab === 'cobros' ? 'Cobros' : tab === 'metricas' ? 'Métricas' : 'Suscripciones'}
              </h2>
              <p className="text-[11px] text-neutral-500">Cattaly · Superadmin</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (tab === 'usuarios') downloadCsv(filtered)
                if (tab === 'cobros') reloadPayments()
                if (tab === 'metricas') reload()
              }}
              className="flex items-center justify-center rounded-xl h-10 w-10 bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-100"
              title={tab === 'usuarios' ? 'Descargar CSV (con filtros)' : 'Recargar'}
              aria-label={tab === 'usuarios' ? 'Descargar CSV' : 'Recargar'}
            >
              {tab === 'usuarios' ? <Download size={18} /> : <RefreshCw size={18} className={loading || paymentsLoading ? 'animate-spin' : ''} />}
            </button>
          </div>
        </div>

        {tab === 'metricas' ? (
          <MetricsDashboard accounts={accounts} payments={approvedPayments} loading={loading} error={error} onReload={reload} />
        ) : tab === 'usuarios' ? (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3 p-4">
              {[
                { label: 'Cuentas', value: formatInt(stats.total), onClick: () => setStatusFilter('all') },
                { label: 'Activas', value: formatInt(stats.active), onClick: () => setStatusFilter('active') },
                { label: 'De pago activas', value: formatInt(stats.paying), onClick: () => setStatusFilter('paying') },
                { label: 'Ganancias reales', value: formatUsd(totalEarnings), onClick: () => setTab('metricas') },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={t.onClick}
                  className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-4 text-left hover:border-neutral-400 transition-colors"
                >
                  <span className="text-xs text-neutral-500">{t.label}</span>
                  <span className="text-xl font-semibold tracking-tight">{loading && !accounts.length ? '…' : t.value}</span>
                </button>
              ))}
            </div>

            {/* Búsqueda */}
            <div className="px-4 pb-3">
              <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 focus-within:border-neutral-900">
                <Search size={16} className="text-neutral-400" />
                <input
                  className="h-full w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                  placeholder="Buscar negocio, email o link"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            {/* Filtros: estado */}
            <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
              {STATUS_FILTERS.map((f) => (
                <FilterChip key={f.key} label={f.label} count={counts.status[f.key]} active={statusFilter === f.key} onClick={() => setStatusFilter(f.key)} />
              ))}
            </div>
            {/* Filtros: plan */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
              {PLAN_FILTERS.map((f) => (
                <FilterChip key={f.key} label={f.label} count={counts.plan[f.key]} active={planFilter === f.key} onClick={() => setPlanFilter(f.key)} />
              ))}
            </div>

            <div className="flex items-center justify-between px-4 pt-1">
              <h3 className="text-sm font-semibold">
                {formatInt(filtered.length)} cuenta{filtered.length === 1 ? '' : 's'}
              </h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-medium text-neutral-700"
                aria-label="Ordenar"
              >
                <option value="recent">Más recientes</option>
                <option value="expiring">Vencen primero</option>
              </select>
            </div>

            {error ? <div className="px-4 pt-3 text-sm text-rose-700">{error}</div> : null}

            {/* Lista */}
            <div className="flex flex-col gap-2.5 p-4 pb-28">
              {loading && !accounts.length ? (
                <div className="text-neutral-500 text-sm">Cargando cuentas…</div>
              ) : filtered.length === 0 ? (
                <div className="text-neutral-500 text-sm">No hay resultados.</div>
              ) : (
                <>
                  {shown.map((u) => {
                    const exp = expMs(u)
                    const daysLeft = exp ? Math.ceil((exp - Date.now()) / DAY) : null
                    return (
                      <div key={u.ownerId} className="rounded-2xl border border-neutral-200 bg-white p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[15px]">{u.nombreNegocio || 'Sin nombre'}</div>
                            <div className="truncate text-xs text-neutral-500">{u.email || '—'}</div>
                          </div>
                          <Toggle checked={u.activa} disabled={loading} onChange={(next) => handleToggle(u.ownerId, next)} />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-700">
                              <span className={`h-1.5 w-1.5 rounded-full ${u.hasAccess ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                              {getPlanLabel(u.plan)}
                              {u.hasAccess ? '' : u.activa && isExpiredAt(u.expiresAt) ? ' · vencida' : ' · sin acceso'}
                            </span>
                            {u.tier === TIERS.PREMIUM ? (
                              <span className="rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Pro</span>
                            ) : null}
                            <span className="text-[11px] text-neutral-400">
                              {u.hasAccess && daysLeft !== null
                                ? `${daysLeft <= 0 ? 'vence hoy' : `${daysLeft} d restantes`}`
                                : u.joinedAt
                                  ? `Desde ${formatJoined(u.joinedAt)}`
                                  : ''}
                            </span>
                          </div>

                          <div className="flex shrink-0 gap-3 items-center">
                            {u.telefono ? (
                              <a
                                href={`https://wa.me/${String(u.telefono).replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neutral-400 hover:text-neutral-900 transition-colors"
                                title={`WhatsApp: ${u.telefono}`}
                              >
                                <MessageCircle size={16} />
                              </a>
                            ) : null}
                            {u.handle ? (
                              <Link
                                to={`/${u.handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neutral-400 hover:text-neutral-900 transition-colors"
                                title={`Ver catálogo: /${u.handle}`}
                              >
                                <Store size={16} />
                              </Link>
                            ) : null}
                            <button type="button" onClick={() => openDetails(u)} className="text-neutral-900 text-xs font-semibold flex items-center gap-1">
                              Detalles
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {filtered.length > shown.length ? (
                    <button
                      type="button"
                      onClick={() => setVisible({ sig: filterSig, count: visibleCount + PAGE })}
                      className="h-11 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
                    >
                      Mostrar más ({formatInt(filtered.length - shown.length)} restantes)
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {paymentsError ? <div className="px-4 pt-3 text-sm text-rose-700">{paymentsError}</div> : null}

            <div className="flex items-center justify-between px-4 pt-4">
              <h3 className="text-sm font-semibold">Solicitudes pendientes</h3>
              <span className="text-xs font-medium text-neutral-500">{formatInt(payments.length)} en total</span>
            </div>

            <div className="flex flex-col gap-2.5 p-4 pb-28">
              {paymentsLoading ? (
                <div className="text-neutral-500 text-sm">Cargando cobros…</div>
              ) : payments.length === 0 ? (
                <div className="text-neutral-500 text-sm">No hay solicitudes pendientes.</div>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{p.nombreNegocio || 'Sin negocio'}</div>
                        <div className="mt-0.5 text-xs text-neutral-500 truncate">{p.email || '—'}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-700">
                            {getPlanLabel(p.plan_id)}
                          </span>
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-700">
                            {p.metodo === 'ves' ? 'Bolívares' : 'Binance'}
                          </span>
                          <span className="rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                            {p.plan_price_usd ? `$${p.plan_price_usd}` : '—'}
                          </span>
                        </div>
                      </div>

                      <button type="button" onClick={() => openPaymentDetails(p)} className="text-neutral-900 text-xs font-semibold flex items-center gap-1 shrink-0">
                        Revisar
                        <ArrowRight size={13} />
                      </button>
                    </div>

                    <div className="mt-3 border-t border-neutral-100 pt-3 flex items-center justify-between text-xs text-neutral-500">
                      <span>Ref: <span className="font-mono text-neutral-700">{p.referencia || '—'}</span></span>
                      <span>{formatDateTime(p.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Navegación inferior */}
        <div className="fixed bottom-0 w-full max-w-[480px] bg-white/95 backdrop-blur-lg border-t border-neutral-200 grid grid-cols-3 h-20 pb-4 px-2">
          {[
            { key: 'usuarios', label: 'Usuarios', icon: <Users size={18} /> },
            { key: 'cobros', label: 'Cobros', icon: <CreditCard size={18} /> },
            { key: 'metricas', label: 'Métricas', icon: <BarChart3 size={18} /> },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center justify-center gap-1 ${tab === t.key ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              {t.icon}
              <span className={`text-[10px] ${tab === t.key ? 'font-semibold' : 'font-medium'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {detailsOpen && detailsAccount ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-xl border border-neutral-200 overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-900">{detailsAccount.nombreNegocio || 'Sin nombre'}</div>
                <div className="text-xs text-neutral-500">{detailsAccount.email || '—'}</div>
              </div>
              <button type="button" onClick={closeDetails} className="text-neutral-500 hover:text-neutral-700">
                Cerrar
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-700">Suscripción activa</div>
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
                <div className="text-sm text-neutral-700">Plan</div>
                <select
                  className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
                  value={detailsAccount.plan}
                  disabled={detailsSaving}
                  onChange={async (e) => {
                    const nextPlan = e.target.value
                    const nextTier = getPricingPlanById(nextPlan)?.tier || TIERS.STANDARD
                    setDetailsSaving(true)
                    setDetailsAccount((prev) => (prev ? { ...prev, plan: nextPlan, tier: nextTier } : prev))
                    setAccounts((prev) => prev.map((a) => (a.ownerId === detailsAccount.ownerId ? { ...a, plan: nextPlan, tier: nextTier } : a)))
                    try {
                      await suscripcionesRepository.setPlan(detailsAccount.ownerId, nextPlan, { tier: nextTier })
                    } catch (err) {
                      setError(err?.message || 'No se pudo actualizar el plan.')
                      await reload()
                    } finally {
                      setDetailsSaving(false)
                    }
                  }}
                >
                  <option value="free">Free</option>
                  <option value="trial">Prueba</option>
                  {PRICING_PLANS.map((p) => (
                    <option key={p.id} value={p.id}>{getPlanLabel(p.id)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-neutral-500">Owner ID</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono text-neutral-700 break-all">{detailsAccount.ownerId}</div>
                  <button
                    type="button"
                    onClick={() => copyText(detailsAccount.ownerId)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-neutral-200 bg-white text-neutral-700"
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
          <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-xl border border-neutral-200 overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-900">{paymentDetails.nombreNegocio || 'Solicitud'}</div>
                <div className="text-xs text-neutral-500">{paymentDetails.email || '—'}</div>
              </div>
              <button type="button" onClick={closePaymentDetails} className="text-neutral-500 hover:text-neutral-700">
                Cerrar
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-[11px] text-neutral-500">Plan</div>
                  <div className="mt-1 text-sm font-semibold text-neutral-900">{getPlanLabel(paymentDetails.plan_id)}</div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-[11px] text-neutral-500">Método</div>
                  <div className="mt-1 text-sm font-semibold text-neutral-900">{paymentDetails.metodo === 'ves' ? 'Bolívares' : 'Binance'}</div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-[11px] text-neutral-500">Referencia</div>
                  <div className="mt-1 text-sm font-mono text-neutral-900 break-all">{paymentDetails.referencia || '—'}</div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-[11px] text-neutral-500">Fecha pago</div>
                  <div className="mt-1 text-sm font-semibold text-neutral-900">{paymentDetails.fecha_pago || '—'}</div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="text-[11px] text-neutral-500">Comprobante</div>
                {paymentProofUrl ? (
                  <a
                    href={paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center justify-center rounded-xl bg-neutral-900 text-white px-4 h-10 text-sm font-semibold"
                  >
                    Abrir comprobante
                  </a>
                ) : (
                  <div className="mt-2 text-sm text-neutral-600">No se pudo generar el link del comprobante.</div>
                )}
              </div>

              <div>
                <div className="text-[11px] text-neutral-500 mb-2">Nota (opcional)</div>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm"
                  placeholder="Ej: Pago confirmado por Binance / Falta referencia / etc."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={rejectPayment}
                  disabled={paymentActionLoading}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-800 px-4 h-11 text-sm font-semibold disabled:opacity-60"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={approvePayment}
                  disabled={paymentActionLoading}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-neutral-900 text-white px-4 h-11 text-sm font-semibold disabled:opacity-60"
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
