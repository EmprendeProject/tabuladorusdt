import { useEffect, useState } from 'react'
import {
  catalogSettingsRepository,
  DEFAULT_CATALOG_TEMPLATE,
} from '../data/catalogSettingsRepository'

export const useCatalogTemplate = ({ enableSave = false } = {}) => {
  const [catalogTemplate, setCatalogTemplate] = useState(DEFAULT_CATALOG_TEMPLATE)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    catalogSettingsRepository
      .fetchTemplate()
      .then((t) => {
        if (!mounted) return
        setCatalogTemplate(t)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e?.message || 'No se pudo cargar la plantilla del catálogo')
        setCatalogTemplate(DEFAULT_CATALOG_TEMPLATE)
      })
      .finally(() => {
        if (!mounted) return
        setCargando(false)
      })

    const unsubscribe = catalogSettingsRepository.subscribeTemplate((next) => {
      setCatalogTemplate(next)
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  const guardar = async (nextTemplate) => {
    if (!enableSave) return

    setError('')
    setGuardando(true)

    try {
      const saved = await catalogSettingsRepository.saveTemplate(nextTemplate)
      setCatalogTemplate(saved)
    } catch (e) {
      setError(e?.message || 'No se pudo guardar la plantilla del catálogo')
    } finally {
      setGuardando(false)
    }
  }

  return {
    catalogTemplate,
    setCatalogTemplate: enableSave ? guardar : setCatalogTemplate,
    cargando,
    guardando,
    error,
  }
}
