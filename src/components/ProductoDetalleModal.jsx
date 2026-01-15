import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

const formatearNumero = (value, digits = 2) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export default function ProductoDetalleModal({ open, producto, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartRef = useRef(null)

  const imagenes = useMemo(() => {
    const list = Array.isArray(producto?.imagenes) ? producto.imagenes : []
    const cleaned = list.map((u) => String(u || '').trim()).filter(Boolean)
    const fallback = String(producto?.imagenUrl || '').trim()
    return cleaned.length ? cleaned : (fallback ? [fallback] : [])
  }, [producto])

  const maxIndex = useMemo(() => Math.max(0, imagenes.length - 1), [imagenes.length])

  const setIndexSafe = useCallback(
    (next) => {
      const clamped = Math.min(maxIndex, Math.max(0, Number(next) || 0))
      setActiveIndex(clamped)
    },
    [maxIndex],
  )

  const goPrev = useCallback(() => {
    setActiveIndex((idx) => (idx <= 0 ? 0 : idx - 1))
  }, [])

  const goNext = useCallback(() => {
    setActiveIndex((idx) => (idx >= maxIndex ? maxIndex : idx + 1))
  }, [maxIndex])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (imagenes.length > 1) {
        if (e.key === 'ArrowLeft') goPrev()
        if (e.key === 'ArrowRight') goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, imagenes.length, goNext, goPrev])

  useEffect(() => {
    if (!open) return
    // Evitar setState síncrono directo en el cuerpo del effect (regla lint).
    Promise.resolve().then(() => setActiveIndex(0))
  }, [open, producto?.id])

  if (!open || !producto) return null

  const nombre = producto?.nombre || 'Producto'
  const descripcion = String(producto?.descripcion || '').trim()
  const precio = producto?.precioSugeridoUsd ?? producto?.precioUSDT
  const tasaBCV = Number(producto?._tasaBCV) || 0
  const precioBs = tasaBCV > 0 ? Number(precio || 0) * tasaBCV : null

  const onTouchStart = (e) => {
    if (imagenes.length <= 1) return
    const t = e.touches?.[0]
    if (!t) return
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e) => {
    if (imagenes.length <= 1) return
    const start = touchStartRef.current
    touchStartRef.current = null
    const t = e.changedTouches?.[0]
    if (!start || !t) return

    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 50) return
    if (Math.abs(dx) < Math.abs(dy)) return

    if (dx < 0) goNext()
    else goPrev()
  }

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose?.()} aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center p-3" role="dialog" aria-modal="true">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh]">
          <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{nombre}</div>
              <div className="text-xs text-gray-500">Detalle del producto</div>
            </div>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="p-2 -mr-1 rounded-2xl text-gray-600 hover:bg-gray-50"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </header>

          <div className="p-4 overflow-y-auto">
            <div
              className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-100"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              role={imagenes.length > 1 ? 'group' : undefined}
              aria-label={imagenes.length > 1 ? 'Galería de fotos (desliza para cambiar)' : 'Foto del producto'}
            >
              {imagenes.length ? (
                <div className="relative">
                  <div className="overflow-hidden">
                    <div
                      className="flex transition-transform duration-300 ease-out"
                      style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                    >
                      {imagenes.map((url, idx) => (
                        <div key={`${url}-${idx}`} className="w-full shrink-0 flex items-center justify-center">
                          <img
                            src={url}
                            alt={`${nombre} ${idx + 1}`}
                            className="w-full h-auto max-h-[60vh] object-contain"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {imagenes.length > 1 ? (
                    <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
                      {imagenes.map((_, idx) => {
                        const active = idx === activeIndex
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setIndexSafe(idx)}
                            className={
                              'h-2 w-2 rounded-full transition-colors ' +
                              (active ? 'bg-slate-900' : 'bg-slate-900/30 hover:bg-slate-900/50')
                            }
                            aria-label={`Ir a foto ${idx + 1}`}
                            title={`Foto ${idx + 1}`}
                          />
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="w-full h-72 flex items-center justify-center text-sm text-gray-500">Sin foto</div>
              )}
            </div>

            {imagenes.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {imagenes.map((url, idx) => {
                  const active = idx === activeIndex
                  return (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setIndexSafe(idx)}
                      className={
                        "shrink-0 rounded-xl overflow-hidden border " +
                        (active ? 'border-slate-900' : 'border-gray-200 hover:border-gray-300')
                      }
                      aria-label={`Ver foto ${idx + 1}`}
                      title={`Foto ${idx + 1}`}
                    >
                      <img
                        src={url}
                        alt={`${nombre} ${idx + 1}`}
                        className="h-16 w-16 object-cover"
                        loading="lazy"
                      />
                    </button>
                  )
                })}
              </div>
            ) : null}

            <div className="mt-4 flex items-baseline justify-between gap-3">
              <div className="text-lg font-semibold text-gray-900 truncate">{nombre}</div>
              <div className="text-right shrink-0">
                <div className="text-xl font-black text-emerald-600">${formatearNumero(precio, 2)}</div>
                {precioBs !== null ? (
                  <div className="text-xs font-semibold text-gray-500">Bs. {formatearNumero(precioBs, 2)}</div>
                ) : null}
              </div>
            </div>

            {descripcion ? (
              <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{descripcion}</p>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Sin descripción.</p>
            )}

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onClose?.()}
                className="px-4 py-2 rounded-2xl text-sm font-semibold bg-slate-950 text-white hover:bg-slate-900"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
