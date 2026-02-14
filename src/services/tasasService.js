// Eliminado valor de respaldo manual a petición del usuario

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
      // En desarrollo: usar proxy de Vite (evita CORS)
      // En producción: usar URL completa (CORS permitido desde dominios HTTPS)
      const isDev = import.meta.env.DEV
      const url = isDev
        ? '/api/bcv/usd'  // Proxy de Vite en desarrollo
        : 'https://bcv-api-seven.vercel.app/api/bcv/usd'  // URL directa en producción

      const data = await fetchJson(url)

      // Validación estricta
      const value = Number(data?.rate)
      if (!value || isNaN(value)) {
        console.error('BCV API Error: La respuesta no tiene una tasa válida', data)
        throw new Error('La API BCV devolvió una tasa inválida')
      }

      return value
    } catch (error) {
      console.error('TasasService Error: Falló la conexión con la API BCV', error)
      throw error
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
