import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, MessageCircle, RefreshCw } from 'lucide-react'
import { computeMetrics, formatInt, formatPct, formatUsd, monthLabel } from '../../lib/adminMetrics'
import { getPlanLabel } from '../../data/pricingPlans'
import { ColumnChart, HBarList, SegmentedBar } from './Charts'

// Colores de la paleta validada para Estándar vs Pro (identidad, no estado).
const TIER_COLORS = {
  standard: { color: '#257de0', ink: '#ffffff' },
  premium: { color: '#f47230', ink: '#191919' },
}

function Card({ title, subtitle, action, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value, hint, delta }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">{value}</p>
      {delta ? (
        <p className={`mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold ${delta.up ? 'text-emerald-700' : 'text-rose-700'}`}>
          {delta.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {delta.text}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>
      ) : null}
    </div>
  )
}

export default function MetricsDashboard({ accounts, payments, loading, error, onReload }) {
  const [showTable, setShowTable] = useState(false)
  const m = useMemo(() => computeMetrics({ accounts, payments }), [accounts, payments])

  const revenue12 = useMemo(
    () =>
      m.revenueLast12.map((d) => ({
        ...d,
        shortLabel: monthLabel(d.key, { withYear: false }),
        tooltip: `${d.count} pago${d.count === 1 ? '' : 's'}`,
      })),
    [m.revenueLast12],
  )
  const signups12 = useMemo(
    () => m.signupsLast12.map((d) => ({ ...d, shortLabel: monthLabel(d.key, { withYear: false }) })),
    [m.signupsLast12],
  )
  const maxRevenueKey = revenue12.reduce((best, d) => (d.value > (best?.value || 0) ? d : best), null)?.key
  const lastKey = revenue12[revenue12.length - 1]?.key

  const firstMonth = m.monthlyRevenue.find((x) => x.value > 0)

  if (loading && !accounts.length) {
    return <div className="p-6 text-sm text-neutral-500">Calculando métricas…</div>
  }

  return (
    <div className="space-y-3 p-4 pb-28">
      {error ? <div className="text-sm text-rose-700">{error}</div> : null}

      {/* Hero */}
      <section className="rounded-2xl bg-neutral-900 p-5 text-white">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">Ganancias reales totales</p>
          <button type="button" onClick={onReload} className="text-neutral-400 hover:text-white" title="Recargar" aria-label="Recargar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="mt-2 text-5xl font-semibold tracking-tight">{formatUsd(m.totalRevenue)}</p>
        <p className="mt-2 text-xs text-neutral-400">
          {formatInt(m.paymentsCount)} pagos aprobados
          {firstMonth ? ` · desde ${monthLabel(firstMonth.key)}` : ''}
          {m.bestMonth?.value ? ` · mejor mes ${m.bestMonth.label} (${formatUsd(m.bestMonth.value)})` : ''}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Este mes"
          value={formatUsd(m.revenueThisMonth)}
          delta={
            m.revenueDeltaPct === null
              ? null
              : { up: m.revenueDeltaPct >= 0, text: `${m.revenueDeltaPct >= 0 ? '+' : ''}${m.revenueDeltaPct.toFixed(0)}% vs mismos días del mes pasado` }
          }
          hint={`Mes anterior: ${formatUsd(m.revenueLastMonth)}`}
        />
        <Stat label="MRR estimado" value={formatUsd(Math.round(m.mrr))} hint="Ingreso mensual de los planes vigentes" />
        <Stat
          label="Clientes de pago activos"
          value={formatInt(m.activePaidCount)}
          hint={`${formatInt(m.activePro)} en Cattaly Pro · ${formatInt(m.trialsActive)} en prueba`}
        />
        <Stat label="Ticket promedio" value={formatUsd(m.avgTicket)} hint="Por pago aprobado" />
        <Stat
          label="Conversión a pago"
          value={formatPct(m.conversionPct)}
          hint={`${formatInt(m.payingCustomers)} de ${formatInt(m.totalAccounts)} cuentas pagaron`}
        />
        <Stat
          label="Clientes que renuevan"
          value={formatPct(m.repeatPct, 0)}
          hint={`${formatInt(m.repeatCustomers)} pagaron 2 veces o más`}
        />
      </div>

      <Card
        title="Ingresos por mes"
        subtitle="Últimos 12 meses · pagos aprobados por fecha de pago"
        action={
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="h-8 shrink-0 rounded-lg border border-neutral-200 px-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            {showTable ? 'Ver gráfico' : 'Historial completo'}
          </button>
        }
      >
        {showTable ? (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white text-neutral-500">
                <tr>
                  <th className="py-1.5 text-left font-medium">Mes</th>
                  <th className="py-1.5 text-right font-medium">Pagos</th>
                  <th className="py-1.5 text-right font-medium">Ingresos</th>
                  <th className="py-1.5 text-right font-medium">Acumulado</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...m.monthlyRevenue].reverse().map((row) => (
                  <tr key={row.key} className="border-t border-neutral-100">
                    <td className="py-1.5 text-neutral-700">{row.label}</td>
                    <td className="py-1.5 text-right text-neutral-500">{row.count}</td>
                    <td className="py-1.5 text-right font-semibold text-neutral-900">{formatUsd(row.value)}</td>
                    <td className="py-1.5 text-right text-neutral-500">{formatUsd(row.cumulative)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ColumnChart
            data={revenue12}
            isMoney
            formatValue={(v) => formatUsd(v)}
            highlightKeys={[maxRevenueKey, lastKey].filter(Boolean)}
            ariaLabel="Ingresos por mes, últimos 12 meses"
          />
        )}
      </Card>

      <Card
        title="Nuevos registros"
        subtitle={`Cuentas creadas por mes · este mes ${formatInt(m.signupsThisMonth)} (mes anterior ${formatInt(m.signupsLastMonth)})`}
      >
        <ColumnChart
          data={signups12}
          formatValue={(v) => `${formatInt(v)} cuentas`}
          labelFormat={(v) => formatInt(v)}
          highlightKeys={[signups12[signups12.length - 1]?.key].filter(Boolean)}
          ariaLabel="Nuevos registros por mes"
        />
      </Card>

      <Card title="Ingresos por nivel" subtitle="Estándar vs Cattaly Pro, toda la historia">
        <SegmentedBar
          formatValue={(v) => formatUsd(v)}
          parts={[
            { key: 'standard', label: 'Estándar', value: m.tierTotals.standard, ...TIER_COLORS.standard },
            { key: 'premium', label: 'Cattaly Pro', value: m.tierTotals.premium, ...TIER_COLORS.premium },
          ]}
        />
      </Card>

      <Card title="Ingresos por plan" subtitle="Toda la historia">
        {m.revenueByPlan.length ? (
          <HBarList
            formatValue={(v) => formatUsd(v)}
            rows={m.revenueByPlan.map((r) => ({
              key: r.planId,
              label: r.label,
              value: r.value,
              tooltip: `${r.count} pagos`,
            }))}
          />
        ) : (
          <p className="text-sm text-neutral-500">Aún no hay pagos aprobados.</p>
        )}
      </Card>

      <Card title="Método de pago" subtitle="Ingresos en USD según cómo pagaron">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-neutral-500">Binance</p>
            <p className="text-lg font-semibold text-neutral-900">{formatUsd(m.methodTotals.binance)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Bolívares</p>
            <p className="text-lg font-semibold text-neutral-900">{formatUsd(m.methodTotals.ves)}</p>
          </div>
        </div>
      </Card>

      <Card
        title="Renovaciones próximas"
        subtitle={`${formatInt(m.renewalsAtRisk.length)} clientes de pago vencen en 30 días · ${formatUsd(m.renewalValueAtRisk)} por renovar`}
      >
        {m.renewalsAtRisk.length ? (
          <ul className="divide-y divide-neutral-100">
            {m.renewalsAtRisk.slice(0, 15).map((a) => (
              <li key={a.ownerId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{a.nombreNegocio || a.email || 'Sin nombre'}</p>
                  <p className="text-xs text-neutral-500">
                    {getPlanLabel(a.plan)} · {formatUsd(a.renewalValue)} · {a.daysLeft <= 1 ? 'vence mañana' : `vence en ${a.daysLeft} días`}
                  </p>
                </div>
                {a.telefono ? (
                  <a
                    href={`https://wa.me/${String(a.telefono).replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hola ${a.nombreNegocio || ''}, tu plan de Cattaly vence pronto. ¿Te ayudo a renovarlo?`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-neutral-200 px-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <MessageCircle size={14} /> Escribir
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">Ningún cliente de pago vence en los próximos 30 días.</p>
        )}
      </Card>
    </div>
  )
}
