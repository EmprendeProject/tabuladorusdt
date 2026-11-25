import { getPlanLabel, getPricingPlanById } from '../data/pricingPlans'
import { TIERS } from './planFeatures'

const DAY = 24 * 60 * 60 * 1000

// `fecha_pago` es 'YYYY-MM-DD' (fecha local del pago); si falta, usamos revisión/creación.
export const paymentDate = (p) => {
  const raw = String(p?.fecha_pago || '')
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(p?.reviewed_at || p?.created_at || '')
  return Number.isFinite(d.getTime()) ? d : null
}

export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export const monthLabel = (key, { withYear = true } = {}) => {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const month = d.toLocaleDateString('es-VE', { month: 'short' }).replace('.', '')
  return withYear ? `${month} ${String(y).slice(2)}` : month
}

// Lista continua de meses entre dos fechas (incluidas).
const monthRange = (from, to) => {
  const out = []
  const d = new Date(from.getFullYear(), from.getMonth(), 1)
  const end = new Date(to.getFullYear(), to.getMonth(), 1)
  while (d <= end) {
    out.push(monthKey(d))
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

const amount = (p) => Number(p?.plan_price_usd) || 0

const isPaidPlan = (planId) => Boolean(getPricingPlanById(planId))

export function computeMetrics({ accounts = [], payments = [], now = new Date() } = {}) {
  const thisMonth = monthKey(now)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = monthKey(lastMonthDate)

  // ---------- Ingresos por mes (toda la historia) ----------
  const byMonth = new Map()
  let firstPayment = null
  for (const p of payments) {
    const d = paymentDate(p)
    if (!d) continue
    if (!firstPayment || d < firstPayment) firstPayment = d
    const k = monthKey(d)
    const cur = byMonth.get(k) || { value: 0, count: 0 }
    cur.value += amount(p)
    cur.count += 1
    byMonth.set(k, cur)
  }

  let cumulative = 0
  const monthlyRevenue = (firstPayment ? monthRange(firstPayment, now) : [thisMonth]).map((key) => {
    const cur = byMonth.get(key) || { value: 0, count: 0 }
    cumulative += cur.value
    return { key, label: monthLabel(key), value: cur.value, count: cur.count, cumulative }
  })

  const last12Keys = monthRange(new Date(now.getFullYear(), now.getMonth() - 11, 1), now)
  const revenueLast12 = last12Keys.map((key) => {
    const cur = byMonth.get(key) || { value: 0, count: 0 }
    return { key, label: monthLabel(key), value: cur.value, count: cur.count }
  })

  const totalRevenue = payments.reduce((acc, p) => acc + amount(p), 0)
  const revenueThisMonth = byMonth.get(thisMonth)?.value || 0
  const revenueLastMonth = byMonth.get(lastMonth)?.value || 0
  // Comparación justa: del 1 a hoy de este mes vs el mismo tramo del mes anterior.
  const dayOfMonth = now.getDate()
  const revenueLastMonthToDate = payments.reduce((acc, p) => {
    const d = paymentDate(p)
    if (!d || monthKey(d) !== lastMonth || d.getDate() > dayOfMonth) return acc
    return acc + amount(p)
  }, 0)
  const revenueDeltaPct =
    revenueLastMonthToDate > 0 ? ((revenueThisMonth - revenueLastMonthToDate) / revenueLastMonthToDate) * 100 : null

  // ---------- Registros por mes (últimos 12) ----------
  const signupsMap = new Map()
  for (const a of accounts) {
    const d = a.joinedAt ? new Date(a.joinedAt) : null
    if (!d || !Number.isFinite(d.getTime())) continue
    const k = monthKey(d)
    signupsMap.set(k, (signupsMap.get(k) || 0) + 1)
  }
  const signupsLast12 = last12Keys.map((key) => ({ key, label: monthLabel(key), value: signupsMap.get(key) || 0 }))
  const signupsThisMonth = signupsMap.get(thisMonth) || 0
  const signupsLastMonth = signupsMap.get(lastMonth) || 0

  // ---------- Clientes ----------
  const paymentsByOwner = new Map()
  for (const p of payments) {
    if (!p.owner_id) continue
    paymentsByOwner.set(p.owner_id, (paymentsByOwner.get(p.owner_id) || 0) + 1)
  }
  const payingCustomers = paymentsByOwner.size
  const repeatCustomers = Array.from(paymentsByOwner.values()).filter((n) => n >= 2).length
  const conversionPct = accounts.length ? (payingCustomers / accounts.length) * 100 : 0
  const repeatPct = payingCustomers ? (repeatCustomers / payingCustomers) * 100 : 0
  const avgTicket = payments.length ? totalRevenue / payments.length : 0

  // Suscriptores de pago vigentes y MRR (ingreso mensual recurrente estimado por su plan).
  const activePaid = accounts.filter((a) => a.hasAccess && isPaidPlan(a.plan))
  const mrr = activePaid.reduce((acc, a) => {
    const plan = getPricingPlanById(a.plan)
    return acc + (plan ? plan.price / (plan.durationDays / 30) : 0)
  }, 0)
  const activePro = activePaid.filter((a) => a.tier === TIERS.PREMIUM).length
  const trialsActive = accounts.filter((a) => a.plan === 'trial' && a.hasAccess).length

  // ---------- Mezcla de ingresos ----------
  const tierTotals = { [TIERS.STANDARD]: 0, [TIERS.PREMIUM]: 0 }
  const planTotals = new Map()
  const methodTotals = { ves: 0, binance: 0 }
  for (const p of payments) {
    const plan = getPricingPlanById(p.plan_id)
    const tier = plan?.tier || TIERS.STANDARD
    tierTotals[tier] += amount(p)
    const cur = planTotals.get(p.plan_id) || { planId: p.plan_id, label: getPlanLabel(p.plan_id), value: 0, count: 0 }
    cur.value += amount(p)
    cur.count += 1
    planTotals.set(p.plan_id, cur)
    if (p.metodo === 'ves' || p.metodo === 'binance') methodTotals[p.metodo] += amount(p)
  }
  const revenueByPlan = Array.from(planTotals.values()).sort((a, b) => b.value - a.value)

  // ---------- Próximos vencimientos (30 días) ----------
  const nowMs = now.getTime()
  const expiringSoon = accounts
    .filter((a) => {
      if (!a.hasAccess || !a.expiresAt) return false
      const t = new Date(a.expiresAt).getTime()
      return Number.isFinite(t) && t > nowMs && t - nowMs <= 30 * DAY
    })
    .map((a) => {
      const plan = getPricingPlanById(a.plan)
      return {
        ...a,
        daysLeft: Math.ceil((new Date(a.expiresAt).getTime() - nowMs) / DAY),
        renewalValue: plan ? plan.price : 0,
        isPaid: Boolean(plan),
      }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
  const renewalsAtRisk = expiringSoon.filter((a) => a.isPaid)
  const renewalValueAtRisk = renewalsAtRisk.reduce((acc, a) => acc + a.renewalValue, 0)

  const bestMonth = monthlyRevenue.reduce((best, m) => (m.value > (best?.value || 0) ? m : best), null)

  return {
    totalRevenue,
    revenueThisMonth,
    revenueLastMonth,
    revenueLastMonthToDate,
    revenueDeltaPct,
    monthlyRevenue,
    revenueLast12,
    bestMonth,
    signupsLast12,
    signupsThisMonth,
    signupsLastMonth,
    totalAccounts: accounts.length,
    payingCustomers,
    repeatCustomers,
    conversionPct,
    repeatPct,
    avgTicket,
    paymentsCount: payments.length,
    activePaidCount: activePaid.length,
    activePro,
    trialsActive,
    mrr,
    tierTotals,
    revenueByPlan,
    methodTotals,
    expiringSoon,
    renewalsAtRisk,
    renewalValueAtRisk,
  }
}

export const formatUsd = (value, { compact = false } = {}) => {
  const n = Number(value) || 0
  if (compact && Math.abs(n) >= 10000) {
    return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`
  }
  return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)}`
}

export const formatInt = (value) => new Intl.NumberFormat('es-VE').format(Number(value) || 0)

export const formatPct = (value, digits = 1) => `${(Number(value) || 0).toFixed(digits)}%`
