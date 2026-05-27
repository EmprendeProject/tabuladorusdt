import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useCart } from '../context/CartContext'

const formatearNumero = (value, digits = 2) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const buildWhatsAppUrl = ({ number, message }) => {
  const digits = String(number || '').replace(/\D/g, '')
  if (!digits) return ''
  const text = String(message || '').trim()
  return text
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${digits}`
}

export default function CartDrawer({ open, onClose, whatsappNumber, tasaBCV, accentColor, shopName }) {
  const { items, removeItem, updateCantidad, clearCart, totalUSD } = useCart()
  const [shouldRender, setShouldRender] = useState(false)
  const [isShowing, setIsShowing] = useState(false)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      setShouldRender(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setIsShowing(true)))
    } else {
      setIsShowing(false)
      closeTimerRef.current = setTimeout(() => setShouldRender(false), 320)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!shouldRender) return null

  const tasaBCVNum = Number(tasaBCV) || 0
  const totalBs = tasaBCVNum > 0 ? totalUSD * tasaBCVNum : null

  const buildMessage = () => {
    const tienda = String(shopName || '').trim()
    const encabezado = tienda
      ? `📲 Pedido desde ${tienda}`
      : '📲 Mi pedido'
    const lineas = items.map((item) => {
      const precio = Number(item.producto.precioSugeridoUsd ?? item.producto.precioUSDT) || 0
      const subtotal = precio * item.cantidad
      return `• ${item.producto.nombre || 'Producto'} x${item.cantidad} — $${formatearNumero(subtotal, 2)}`
    })
    const partes = [encabezado, '', ...lineas, '', `Total: $${formatearNumero(totalUSD, 2)}`]
    return partes.join('\n')
  }

  const handlePedir = () => {
    const url = buildWhatsAppUrl({ number: whatsappNumber, message: buildMessage() })
    if (!url) {
      // Fallback: copiar el mensaje si no hay número configurado
      navigator.clipboard?.writeText(buildMessage()).catch(() => {})
      return
    }
    window.open(url, '_blank', 'noreferrer')
  }

  const accent = accentColor || '#137fec'

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Carrito de compras">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="absolute inset-0 flex items-end sm:items-center sm:justify-end pointer-events-none">
        <div
          className={
            'pointer-events-auto w-full sm:w-[400px] sm:h-full bg-white sm:rounded-none rounded-t-3xl ' +
            'flex flex-col shadow-2xl max-h-[90vh] sm:max-h-full ' +
            'transform transition-transform duration-300 ease-out ' +
            (isShowing ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-x-full')
          }
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} style={{ color: accent }} />
              <div>
                <div className="text-sm font-bold text-gray-900">Tu pedido</div>
                <div className="text-xs text-gray-500">{items.length} {items.length === 1 ? 'producto' : 'productos'}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar carrito"
            >
              <X size={18} />
            </button>
          </div>

          {/* Items list */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-3">
                <ShoppingBag size={40} className="opacity-30" />
                <span>Tu carrito está vacío</span>
              </div>
            ) : (
              items.map(({ producto, cantidad }) => {
                const precio = Number(producto.precioSugeridoUsd ?? producto.precioUSDT) || 0
                const subtotal = precio * cantidad
                return (
                  <div key={producto.id} className="flex gap-3 items-start">
                    {/* Miniatura */}
                    <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                      {producto.imagenUrl ? (
                        <img
                          src={producto.imagenUrl}
                          alt={producto.nombre || 'Producto'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">Sin foto</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{producto.nombre || 'Sin nombre'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">${formatearNumero(precio, 2)} c/u</div>

                      {/* Cantidad */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => cantidad <= 1 ? removeItem(producto.id) : updateCantidad(producto.id, cantidad - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          aria-label="Disminuir cantidad"
                        >
                          {cantidad <= 1 ? <Trash2 size={13} className="text-rose-500" /> : <Minus size={13} />}
                        </button>
                        <span className="text-sm font-semibold text-gray-800 w-6 text-center">{cantidad}</span>
                        <button
                          type="button"
                          onClick={() => updateCantidad(producto.id, cantidad + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold text-gray-900">${formatearNumero(subtotal, 2)}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="shrink-0 border-t border-gray-100 px-5 py-5 space-y-4 bg-white">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <div className="text-right">
                  <div className="text-xl font-black text-gray-900">${formatearNumero(totalUSD, 2)}</div>
                  {totalBs !== null && (
                    <div className="text-xs text-gray-400 font-medium">Bs. {formatearNumero(totalBs, 2)} aprox.</div>
                  )}
                </div>
              </div>

              {/* Botones */}
              <button
                type="button"
                onClick={handlePedir}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-lg active:scale-[0.98] transition-transform"
                style={{ backgroundColor: accent }}
              >
                {/* WhatsApp icon SVG inline */}
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Pedir por WhatsApp
              </button>

              <button
                type="button"
                onClick={clearCart}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-50 border border-gray-200 transition-colors"
              >
                Vaciar carrito
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
