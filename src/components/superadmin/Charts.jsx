import { useState } from 'react'

// Gráficos livianos sin librerías (divs + CSS), con el estilo monocromo del superadmin.
// Reglas: barras finas (≤24px) con borde redondeado de 4px solo en el extremo de datos,
// grilla de 1px muy suave, tooltip al pasar/tocar, etiquetas directas solo donde importan.

const INK = '#18181b' // serie única: casi negro
const GRID = '#ececee'

// Escala "limpia" para el eje Y: 0, 50, 100… / 0, 1K, 2K…
const niceScale = (max, ticks = 4) => {
  if (!max || max <= 0) return { top: 1, step: 1 }
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) || 10 * pow
  return { top: Math.ceil(max / step) * step, step }
}

const compactTick = (v, isMoney) => {
  const s = Math.abs(v) >= 10000 ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v) : new Intl.NumberFormat('en-US').format(v)
  return isMoney ? `$${s}` : s
}

/**
 * Columnas verticales, una serie.
 * data: [{ key, label, value, tooltip? }]
 * highlightKeys: claves cuyo valor se rotula sobre la barra (p.ej. máximo y último mes)
 */
export function ColumnChart({ data, formatValue, labelFormat, isMoney = false, highlightKeys = [], height = 176, ariaLabel }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(0, ...data.map((d) => d.value))
  const { top, step } = niceScale(max)
  const ticks = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v)
  const highlight = new Set(highlightKeys)

  return (
    <div role="img" aria-label={ariaLabel} className="pt-3">
      <div className="relative flex" style={{ height }}>
        {/* Eje Y + grilla */}
        <div className="relative w-10 shrink-0">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-neutral-400"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {compactTick(t, isMoney)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px" style={{ bottom: `${(t / top) * 100}%`, background: GRID }} />
          ))}

          <div className="absolute inset-0 flex items-end">
            {data.map((d, i) => {
              const pct = top ? (d.value / top) * 100 : 0
              const active = hover === i
              return (
                <button
                  key={d.key}
                  type="button"
                  className="group relative flex h-full flex-1 items-end justify-center focus:outline-none"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  onClick={() => setHover((h) => (h === i ? null : i))}
                  aria-label={`${d.label}: ${formatValue(d.value)}`}
                >
                  {active ? <span className="absolute inset-x-0.5 bottom-0 top-0 rounded bg-neutral-900/[0.04]" /> : null}
                  <span
                    className="relative w-[60%] max-w-[24px] rounded-t transition-opacity"
                    style={{
                      height: d.value > 0 ? `max(${pct}%, 2px)` : 0,
                      background: INK,
                      opacity: hover === null || active ? 1 : 0.35,
                    }}
                  />
                  {highlight.has(d.key) && d.value > 0 && hover === null ? (
                    <span
                      className="pointer-events-none absolute whitespace-nowrap text-[10px] font-semibold text-neutral-700"
                      style={{
                        bottom: `calc(${pct}% + 4px)`,
                        // En los bordes alineamos hacia adentro para que no se corte.
                        ...(i === data.length - 1
                          ? { right: '50%', transform: 'translateX(12px)' }
                          : i === 0
                            ? { left: '50%', transform: 'translateX(-12px)' }
                            : { left: '50%', transform: 'translateX(-50%)' }),
                      }}
                    >
                      {(labelFormat || formatValue)(d.value)}
                    </span>
                  ) : null}
                  {active ? (
                    <span
                      className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-left text-[11px] leading-tight text-white shadow-lg"
                      style={{
                        bottom: `calc(${pct}% + 8px)`,
                        left: i < 2 ? '0%' : i > data.length - 3 ? '100%' : '50%',
                        transform: i < 2 ? 'translateX(0)' : i > data.length - 3 ? 'translateX(-100%)' : 'translateX(-50%)',
                      }}
                    >
                      <span className="block text-neutral-400">{d.label}</span>
                      <span className="block font-semibold">{formatValue(d.value)}</span>
                      {d.tooltip ? <span className="block text-neutral-400">{d.tooltip}</span> : null}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Eje X */}
      <div className="mt-1.5 flex pl-10">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center text-[10px] text-neutral-400">
            {data.length > 8 && i % 2 === 1 && i !== data.length - 1 ? '' : d.shortLabel || d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Barra segmentada alta: un todo dividido en partes (p.ej. Estándar vs Pro).
 * parts: [{ key, label, value, color, ink }]  — ink: color del texto dentro del bloque
 */
export function SegmentedBar({ parts, formatValue }) {
  const total = parts.reduce((acc, p) => acc + p.value, 0)
  const visible = parts.filter((p) => p.value > 0)
  return (
    <div>
      <div className="flex h-7 w-full gap-[2px]" role="img" aria-label={parts.map((p) => `${p.label}: ${formatValue(p.value)}`).join(', ')}>
        {total === 0 ? (
          <div className="h-full w-full rounded bg-neutral-100" />
        ) : (
          visible.map((p) => {
            const share = (p.value / total) * 100
            return (
              <div
                key={p.key}
                className="flex h-full items-center rounded px-2 text-[11px] font-semibold"
                style={{ width: `${share}%`, background: p.color, color: p.ink }}
                title={`${p.label}: ${formatValue(p.value)} (${share.toFixed(0)}%)`}
              >
                {share >= 14 ? `${share.toFixed(0)}%` : ''}
              </div>
            )
          })
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <span className="font-semibold text-neutral-900">{formatValue(p.value)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Barras horizontales ordenadas, una serie (p.ej. ingresos por plan). */
export function HBarList({ rows, formatValue }) {
  const max = Math.max(0, ...rows.map((r) => r.value))
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[84px_1fr] items-center gap-3" title={r.tooltip || ''}>
          <span className="truncate text-xs text-neutral-600">{r.label}</span>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 rounded-r"
              style={{ width: max ? `max(${(r.value / max) * 85}%, 2px)` : 0, background: INK }}
            />
            <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-neutral-900">{formatValue(r.value)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
