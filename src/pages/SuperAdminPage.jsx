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
} from 'lucide-react'

import { useAuthSession } from '../hooks/useAuthSession'
import { adminRepository } from '../data/adminRepository'
import { suscripcionesRepository } from '../data/suscripcionesRepository'

const PLANS = ['All', 'Free', 'Pro', 'Enterprise']

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

  useEffect(() => {
    if (!session) return
    if (isSuperadmin !== true) return
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isSuperadmin])

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
    const active = accounts.filter((a) => a.activa).length
    const expired = total - active

    const planPrices = {
      Free: 0,
      Pro: 10,
      Enterprise: 25,
    }

    const revenue = accounts.reduce((acc, a) => {
      if (!a.activa) return acc
      return acc + (planPrices[a.plan] ?? 0)
    }, 0)

    return { total, active, expired, revenue }
  }, [accounts])

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
              Suscripciones
            </h2>
            <div className="flex w-10 items-center justify-end">
              <button
                type="button"
                onClick={() => downloadCsv(filtered)}
                className="flex items-center justify-center rounded-lg h-10 w-10 bg-white border border-slate-200 text-[#0e141b]"
                title="Descargar CSV"
                aria-label="Descargar CSV"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>

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
              label={p === 'All' ? 'Todos' : p}
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

        {error ? (
          <div className="px-4 pt-3 text-sm text-rose-600">{error}</div>
        ) : null}

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
                className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 ${u.activa ? '' : 'opacity-80'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-base text-[#0e141b]">{u.nombreNegocio || 'Sin nombre'}</span>
                    <span className="text-sm text-slate-500">{u.email || '—'}</span>
                  </div>

                  <Toggle
                    checked={u.activa}
                    disabled={loading}
                    onChange={(next) => handleToggle(u.ownerId, next)}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex gap-2 items-center">
                    <span
                      className={
                        u.plan === 'Enterprise'
                          ? 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary'
                          : u.plan === 'Pro'
                            ? 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600'
                            : 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-600'
                      }
                    >
                      {u.plan}{u.activa ? '' : ' (inactiva)'}
                    </span>
                    <span className="text-[11px] text-slate-400">{u.joinedAt ? `Desde ${formatJoined(u.joinedAt)}` : ''}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDetails(u)}
                    className="text-primary text-sm font-bold flex items-center gap-1"
                  >
                    Detalles
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Nav (solo visual) */}
        <div className="fixed bottom-0 w-full max-w-[480px] bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center h-20 pb-4 px-2">
          <Link to="/superadmin" className="flex flex-col items-center gap-1 text-primary">
            <Users size={18} />
            <span className="text-[10px] font-bold">Usuarios</span>
          </Link>
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <CreditCard size={18} />
            <span className="text-[10px] font-medium">Cobros</span>
          </div>
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

      <div className="hidden">
        <Link to="/admin">Admin</Link>
      </div>
    </div>
  )
}
