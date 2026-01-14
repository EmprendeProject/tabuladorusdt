import { useCallback, useEffect, useState } from 'react'
import { productosRepository, PRODUCTOS_EVENT } from '../data/productosRepository'

export const useProductos = ({ scope } = {}) => {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setError('')
    setCargando(true)

    try {
      const list = scope === 'public' ? await productosRepository.listPublic() : await productosRepository.listAll()
      setProductos(list)
    } catch (e) {
      console.error('Error al cargar productos:', e)
      setError(e?.message || 'No se pudieron cargar los productos.')
    } finally {
      setCargando(false)
    }
  }, [scope])

  useEffect(() => {
    cargar()

    const unsubscribe = productosRepository.subscribe((event) => {
      const isPublic = scope === 'public'

      if (event.type === PRODUCTOS_EVENT.INSERT) {
        if (isPublic && event.producto?.activo === false) return
        setProductos((prev) => [event.producto, ...prev.filter((p) => p.id !== event.producto.id)])
      } else if (event.type === PRODUCTOS_EVENT.UPDATE) {
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
      unsubscribe?.()
    }
  }, [cargar, scope])

  return { productos, setProductos, cargando, error, recargar: cargar }
}
