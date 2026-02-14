import { useCallback, useEffect, useState } from 'react'
import { tasasService } from '../services/tasasService'

// Cache keys para localStorage
const CACHE_KEY_BCV = 'tasa_bcv_cache'
const CACHE_KEY_USDT = 'tasa_usdt_cache'
const CACHE_TIMESTAMP_BCV = 'tasa_bcv_timestamp'
const CACHE_TIMESTAMP_USDT = 'tasa_usdt_timestamp'

// Utilidades para localStorage
const getCachedValue = (key) => {
  try {
    const cached = localStorage.getItem(key)
    return cached ? parseFloat(cached) : null
  } catch (e) {
    console.warn('Error leyendo caché:', e)
    return null
  }
}

const setCachedValue = (key, value, timestampKey) => {
  try {
    localStorage.setItem(key, String(value))
    localStorage.setItem(timestampKey, String(Date.now()))
  } catch (e) {
    console.warn('Error guardando caché:', e)
  }
}

export const useTasas = () => {
  // Inicializar con valores en caché si existen
  const [tasaBCV, setTasaBCV] = useState(() => {
    const cached = getCachedValue(CACHE_KEY_BCV)
    return cached ? cached.toFixed(2) : null
  })
  const [tasaUSDT, setTasaUSDT] = useState(() => {
    const cached = getCachedValue(CACHE_KEY_USDT)
    return cached ? cached.toFixed(2) : null
  })
  const [cargandoBCV, setCargandoBCV] = useState(true)
  const [cargandoUSDT, setCargandoUSDT] = useState(true)

  const refrescarBCV = useCallback(async (isRetry = false) => {
    setCargandoBCV(true)
    try {
      const value = await tasasService.fetchTasaBCV()
      const formatted = Number(value).toFixed(2)
      setTasaBCV(formatted)
      // Guardar en caché
      setCachedValue(CACHE_KEY_BCV, formatted, CACHE_TIMESTAMP_BCV)
    } catch (e) {
      console.error('Error al obtener la tasa BCV:', e)

      // Intentar usar valor en caché como fallback
      const cached = getCachedValue(CACHE_KEY_BCV)
      if (cached && !tasaBCV) {
        console.log('Usando tasa BCV en caché:', cached)
        setTasaBCV(cached.toFixed(2))
      }

      // Si es el primer intento y no hay caché, reintentar después de 5 segundos
      if (!isRetry && !cached && !tasaBCV) {
        console.log('Reintentando obtener tasa BCV en 5 segundos...')
        setTimeout(() => refrescarBCV(true), 5000)
      }
    } finally {
      setCargandoBCV(false)
    }
  }, [tasaBCV])

  const refrescarUSDT = useCallback(async (isRetry = false) => {
    setCargandoUSDT(true)
    try {
      const value = await tasasService.fetchTasaUSDT()
      const formatted = Number(value).toFixed(2)
      setTasaUSDT(formatted)
      // Guardar en caché
      setCachedValue(CACHE_KEY_USDT, formatted, CACHE_TIMESTAMP_USDT)
    } catch (e) {
      console.error('Error al obtener la tasa USDT:', e)

      // Intentar usar valor en caché como fallback
      const cached = getCachedValue(CACHE_KEY_USDT)
      if (cached && !tasaUSDT) {
        console.log('Usando tasa USDT en caché:', cached)
        setTasaUSDT(cached.toFixed(2))
      }

      // Si es el primer intento y no hay caché, reintentar después de 5 segundos
      if (!isRetry && !cached && !tasaUSDT) {
        console.log('Reintentando obtener tasa USDT en 5 segundos...')
        setTimeout(() => refrescarUSDT(true), 5000)
      }
    } finally {
      setCargandoUSDT(false)
    }
  }, [tasaUSDT])

  useEffect(() => {
    // Carga inicial
    refrescarBCV()
    refrescarUSDT()

    // Actualización automática: cada 30 minutos (más frecuente que antes)
    // 30 min * 60 seg * 1000 ms = 1,800,000 ms
    const INTERVALO_MS = 30 * 60 * 1000

    const intervalo = setInterval(() => {
      console.log('Actualizando tasas automáticamente...')
      refrescarBCV()
      refrescarUSDT()
    }, INTERVALO_MS)

    return () => clearInterval(intervalo)
  }, [refrescarBCV, refrescarUSDT])

  return {
    tasaBCV,
    setTasaBCV,
    tasaUSDT,
    setTasaUSDT,
    cargandoBCV,
    cargandoUSDT,
    refrescarBCV,
    refrescarUSDT,
  }
}
