import { useEffect, useState } from 'react'
import { authRepository } from '../data/authRepository'

export const useAuthSession = () => {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    authRepository
      .getSession()
      .then((s) => {
        if (!mounted) return
        setSession(s)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e?.message || 'No se pudo cargar la sesión')
        setSession(null)
      })
      .finally(() => {
        if (!mounted) return
        setCargando(false)
      })

    const unsubscribe = authRepository.onAuthStateChange((newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  const cerrarSesion = async () => {
    setError('')
    await authRepository.signOut()
  }

  return { session, cargando, error, cerrarSesion }
}
