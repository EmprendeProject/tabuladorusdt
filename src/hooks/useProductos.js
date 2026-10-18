import { useCallback, useEffect, useState } from 'react'
import { productosRepository, PRODUCTOS_EVENT, PRODUCTOS_CHANGED_EVENT } from '../data/productosRepository'

export const useProductos = ({ scope, ownerId } = {}) => {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async ({ silent = false } = {}) => {
    setError('')
    if (!silent) setCargando(true)

    try {
      const list =
        scope === 'public'
          ? await productosRepository.listPublic(ownerId)
          : await productosRepository.listAll(ownerId)
      setProductos(list)
    } catch (e) {
      console.error('Error al cargar productos:', e)
      setError(e?.message || 'No se pudieron cargar los productos.')
    } finally {
      setCargando(false)
    }
  }, [ownerId, scope])

  useEffect(() => {
    cargar()

    // Refresco silencioso cuando se hace una carga masiva desde el perfil.
    const onChanged = () => cargar({ silent: true })
    globalThis.addEventListener?.(PRODUCTOS_CHANGED_EVENT, onChanged)

    const unsubscribe = productosRepository.subscribe((event) => {
      const isPublic = scope === 'public'
      const isDifferentOwner = ownerId && event?.producto?.ownerId && event.producto.ownerId !== ownerId

      if (event.type === PRODUCTOS_EVENT.INSERT) {
        if (isDifferentOwner) return
        if (isPublic && event.producto?.activo === false) return
        setProductos((prev) => [event.producto, ...prev.filter((p) => p.id !== event.producto.id)])
      } else if (event.type === PRODUCTOS_EVENT.UPDATE) {
        if (isDifferentOwner) return
        if (isPublic && event.producto?.activo === false) {
          setProductos((prev) => prev.filter((p) => p.id !== event.producto.id))
          return
        }

        setProductos((prev) => {
          const exists = prev.some((p) => p.id === event.producto.id)
          if (!exists) return [event.producto, ...prev]
          return prev.map((p) => (p.id === event.producto.id ? event.producto : p))
        })
      } else if (event.type === PRODUCTOS_EVENT.DELETE) {
        setProductos((prev) => prev.filter((p) => p.id !== event.id))
      }
    })

    return () => {
      globalThis.removeEventListener?.(PRODUCTOS_CHANGED_EVENT, onChanged)
      unsubscribe?.()
    }
  }, [cargar, ownerId, scope])

  return { productos, setProductos, cargando, error, recargar: cargar }
}
