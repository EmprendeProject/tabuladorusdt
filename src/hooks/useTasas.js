import { useCallback, useEffect, useState } from 'react'
import { tasasService } from '../services/tasasService'

export const useTasas = () => {
  const [tasaBCV, setTasaBCV] = useState(null)
  const [tasaUSDT, setTasaUSDT] = useState(null)
  const [cargandoBCV, setCargandoBCV] = useState(true)
  const [cargandoUSDT, setCargandoUSDT] = useState(true)

  const refrescarBCV = useCallback(async () => {
    setCargandoBCV(true)
    try {
      const value = await tasasService.fetchTasaBCV()
      setTasaBCV(Number(value).toFixed(2))
    } catch (e) {
      console.error('Error al obtener la tasa BCV:', e)
    } finally {
      setCargandoBCV(false)
    }
  }, [])

  const refrescarUSDT = useCallback(async () => {
    setCargandoUSDT(true)
    try {
      const value = await tasasService.fetchTasaUSDT()
      setTasaUSDT(Number(value).toFixed(2))
    } catch (e) {
      console.error('Error al obtener la tasa USDT:', e)
    } finally {
      setCargandoUSDT(false)
    }
  }, [])

  useEffect(() => {
    // Carga inicial
    refrescarBCV()
    refrescarUSDT()

    // Actualización automática: 8 veces al día = cada 3 horas
    // 3 horas * 60 min * 60 seg * 1000 ms = 10,800,000 ms
    const INTERVALO_MS = 3 * 60 * 60 * 1000

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
