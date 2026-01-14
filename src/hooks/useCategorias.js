import { useCallback, useEffect, useMemo, useState } from 'react'
import { categoriasRepository } from '../data/categoriasRepository'

export function useCategorias() {
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    setCargando(true)
    try {
      const data = await categoriasRepository.listAll()
      setCategorias(Array.isArray(data) ? data : [])
    } catch (e) {
      setCategorias([])
      setError(e?.message || 'No se pudieron cargar las categorías')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createCategoria = useCallback(async (nombre) => {
    setError('')
    setGuardando(true)
    try {
      const created = await categoriasRepository.create({ nombre })
      setCategorias((prev) => {
        const next = [...(prev || [])]
        // evitar duplicados por nombre
        if (!next.some((c) => String(c?.nombre || '').toLowerCase() === String(created?.nombre || '').toLowerCase())) {
          next.push(created)
        }
        next.sort((a, b) => String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es'))
        return next
      })
      return created
    } catch (e) {
      setError(e?.message || 'No se pudo crear la categoría')
      throw e
    } finally {
      setGuardando(false)
    }
  }, [])

  const removeCategoria = useCallback(async (id) => {
    const cleanId = String(id || '').trim()
    if (!cleanId) throw new Error('El id de la categoría es requerido')

    setError('')
    setEliminandoId(cleanId)
    try {
      await categoriasRepository.remove({ id: cleanId })
      setCategorias((prev) => (prev || []).filter((c) => String(c?.id || '') !== cleanId))
      return { id: cleanId }
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar la categoría')
      throw e
    } finally {
      setEliminandoId('')
    }
  }, [])

  const nombres = useMemo(() => {
    return (categorias || []).map((c) => c?.nombre).filter(Boolean)
  }, [categorias])

  return { categorias, nombres, cargando, guardando, eliminandoId, error, refresh, createCategoria, removeCategoria }
}
