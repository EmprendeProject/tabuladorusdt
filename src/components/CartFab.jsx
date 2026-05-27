import { ShoppingCart } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function CartFab({ onClick, accentColor }) {
  const { totalItems } = useCart()

  if (totalItems === 0) return null

  const accent = accentColor || '#137fec'

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-[70] flex items-center justify-center w-14 h-14 rounded-2xl shadow-2xl shadow-black/30 hover:brightness-95 active:scale-95 focus:outline-none focus:ring-4 transition-transform"
      style={{
        right: 'var(--catalog-fab-right, 1.5rem)',
        bottom: '6.5rem', // justo encima del botón de WhatsApp
        backgroundColor: accent,
      }}
      aria-label={`Ver carrito (${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'})`}
      title="Ver carrito"
    >
      <ShoppingCart size={24} className="text-white" />
      {/* Badge de cantidad */}
      <span
        className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full bg-white text-[11px] font-black leading-none shadow-md border-2"
        style={{ color: accent, borderColor: accent }}
        aria-hidden="true"
      >
        {totalItems > 99 ? '99+' : totalItems}
      </span>
    </button>
  )
}
