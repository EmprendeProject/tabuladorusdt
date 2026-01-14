import { useCallback, useEffect, useState } from 'react'
import { tasasService } from '../services/tasasService'

export const useTasas = () => {
  const [tasaBCV, setTasaBCV] = useState('365')
  const [tasaUSDT, setTasaUSDT] = useState('800')
  const [cargandoBCV, setCargandoBCV] = useState(false)
  const [cargandoUSDT, setCargandoUSDT] = useState(false)

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
    refrescarBCV()
    refrescarUSDT()
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
