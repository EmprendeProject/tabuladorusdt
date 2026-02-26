import { useEffect, useState } from 'react'
import {
  catalogSettingsRepository,
  DEFAULT_CATALOG_TEMPLATE,
} from '../data/catalogSettingsRepository'

export const useCatalogTemplate = ({ enableSave = false, ownerId } = {}) => {
  const [catalogTemplate, setCatalogTemplate] = useState(DEFAULT_CATALOG_TEMPLATE)
  const [logoUrl, setLogoUrl] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    setCargando(true)

    catalogSettingsRepository
      .fetchTemplate({ ownerId })
      .then((data) => {
        if (!mounted) return
        setCatalogTemplate(data.template)
        setLogoUrl(data.logoUrl)
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

    const unsubscribe = ownerId
      ? catalogSettingsRepository.subscribeTemplate({
        ownerId,
        onChange: (next) => {
          setCatalogTemplate(next.template)
          setLogoUrl(next.logoUrl)
        },
      })
      : null

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [ownerId])

  const guardar = async (nextTemplate) => {
    if (!enableSave) return

    setError('')
    setGuardando(true)

    try {
      const saved = await catalogSettingsRepository.saveTemplate(nextTemplate, { ownerId })
      setCatalogTemplate(saved)
    } catch (e) {
      setError(e?.message || 'No se pudo guardar la plantilla del catálogo')
    } finally {
      setGuardando(false)
    }
  }

  const guardarLogo = async (nextLogoUrl) => {
    if (!enableSave) return

    setError('')
    setGuardando(true)

    try {
      const saved = await catalogSettingsRepository.saveLogoUrl(nextLogoUrl, { ownerId })
      setLogoUrl(saved)
    } catch (e) {
      setError(e?.message || 'No se pudo guardar el logo')
    } finally {
      setGuardando(false)
    }
  }

  return {
    catalogTemplate,
    setCatalogTemplate: enableSave ? guardar : setCatalogTemplate,
    logoUrl,
    setLogoUrl: enableSave ? guardarLogo : setLogoUrl,
    cargando,
    guardando,
    error,
  }
}
