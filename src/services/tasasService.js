// Valor de respaldo para BCV cuando la API falla
// Puedes cambiar este valor manualmente según sea necesario
const BCV_FALLBACK_VALUE = 382.63

const fetchJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

export const tasasService = {
  async fetchTasaBCV() {
    try {
      const data = await fetchJson('https://bcv-api-seven.vercel.app/api/bcv/usd')
      const value = data?.rate
      if (typeof value !== 'number') {
        console.warn('BCV API devolvió respuesta inesperada, usando valor de respaldo:', BCV_FALLBACK_VALUE)
        return BCV_FALLBACK_VALUE
      }
      return value
    } catch (error) {
      console.warn('Error al obtener tasa BCV, usando valor de respaldo:', BCV_FALLBACK_VALUE, error)
      return BCV_FALLBACK_VALUE
    }
  },

  async fetchTasaUSDT() {
    const data = await fetchJson('https://criptoya.com/api/binancep2p/usdt/ves')
    const ask = data?.ask
    const bid = data?.bid

    if (ask != null && bid != null) {
      return (Number(ask) + Number(bid)) / 2
    }

    if (ask != null) return Number(ask)
    if (bid != null) return Number(bid)

    throw new Error('Respuesta inesperada de USDT')
  },
}
