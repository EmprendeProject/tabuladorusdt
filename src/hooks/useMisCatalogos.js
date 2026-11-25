import { useCallback, useEffect, useMemo, useState } from 'react'
import { tiendasRepository } from '../data/tiendasRepository'

const storageKey = (userId) => `cataly:catalogo-activo:${userId}`

const readStored = (userId) => {
  if (!userId) return ''
  try {
    return globalThis.localStorage?.getItem(storageKey(userId)) || ''
  } catch {
    return ''
  }
}

/**
 * Lista de catálogos del usuario + cuál está activo en el panel.
 * - `canUseExtras`: si es false (no Premium), solo el principal puede quedar activo.
 * - `reloadKey`: cámbialo para forzar recarga (ej. tras crear el principal).
 */
export function useMisCatalogos({ userId, canUseExtras = false, reloadKey } = {}) {
  const [catalogos, setCatalogos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [activeId, setActiveIdState] = useState(() => readStored(userId))

  const recargar = useCallback(async () => {
    if (!userId) {
      setCatalogos([])
      return []
    }
    setCargando(true)
    setError('')
    try {
      const list = await tiendasRepository.listMine()
      setCatalogos(list)
      return list
    } catch (e) {
      setError(e?.message || 'No se pudieron cargar tus catálogos.')
      return []
    } finally {
      setCargando(false)
    }
  }, [userId])

  useEffect(() => {
    setActiveIdState(readStored(userId))
    recargar()
  }, [recargar, userId, reloadKey])

  const principal = useMemo(() => catalogos.find((c) => c.esPrincipal) || catalogos[0] || null, [catalogos])

  const activo = useMemo(() => {
    if (!canUseExtras) return principal
    return catalogos.find((c) => c.id === activeId) || principal
  }, [activeId, canUseExtras, catalogos, principal])

  const setActiveId = useCallback(
    (id) => {
      setActiveIdState(id || '')
      try {
        if (id) globalThis.localStorage?.setItem(storageKey(userId), id)
        else globalThis.localStorage?.removeItem(storageKey(userId))
      } catch {
        // noop
      }
    },
    [userId],
  )

  const crear = useCallback(
    async ({ nombreNegocio, handle }) => {
      const created = await tiendasRepository.createMine({ nombreNegocio, handle })
      await recargar()
      return created
    },
    [recargar],
  )

  const actualizar = useCallback(
    async (id, cambios) => {
      const updated = await tiendasRepository.updateById(id, cambios)
      setCatalogos((prev) => prev.map((c) => (c.id === id ? updated : c)))
      return updated
    },
    [],
  )

  return { catalogos, principal, activo, setActiveId, cargando, error, recargar, crear, actualizar }
}
