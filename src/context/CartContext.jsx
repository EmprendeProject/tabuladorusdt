import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([]) // [{ producto, cantidad }]

  const addItem = useCallback((producto, cantidad = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.producto.id === producto.id)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cantidad }
        return next
      }
      return [...prev, { producto, cantidad }]
    })
  }, [])

  const removeItem = useCallback((productoId) => {
    setItems((prev) => prev.filter((i) => i.producto.id !== productoId))
  }, [])

  const updateCantidad = useCallback((productoId, cantidad) => {
    const n = Math.max(1, Number(cantidad) || 1)
    setItems((prev) =>
      prev.map((i) => (i.producto.id === productoId ? { ...i, cantidad: n } : i)),
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalItems = useMemo(() => items.reduce((acc, i) => acc + i.cantidad, 0), [items])

  const totalUSD = useMemo(
    () =>
      items.reduce((acc, i) => {
        const precio = Number(i.producto.precioSugeridoUsd ?? i.producto.precioUSDT) || 0
        return acc + precio * i.cantidad
      }, 0),
    [items],
  )

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateCantidad, clearCart, totalItems, totalUSD }),
    [items, addItem, removeItem, updateCantidad, clearCart, totalItems, totalUSD],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
