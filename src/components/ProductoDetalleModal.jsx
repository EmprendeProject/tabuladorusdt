import { useEffect } from 'react'
import { X } from 'lucide-react'

const formatearNumero = (value, digits = 2) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export default function ProductoDetalleModal({ open, producto, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !producto) return null

  const nombre = producto?.nombre || 'Producto'
  const descripcion = String(producto?.descripcion || '').trim()
  const precio = producto?.precioSugeridoUsd ?? producto?.precioUSDT
  const tasaBCV = Number(producto?._tasaBCV) || 0
  const precioBs = tasaBCV > 0 ? Number(precio || 0) * tasaBCV : null
  const imagenUrl = String(producto?.imagenUrl || '').trim()

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
            <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
              {imagenUrl ? (
                <img
                  src={imagenUrl}
                  alt={nombre}
                  className="w-full h-auto max-h-[60vh] object-contain"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-72 flex items-center justify-center text-sm text-gray-500">Sin foto</div>
              )}
            </div>

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
