import { useCallback, useRef, useState } from 'react'

export const TOAST_TYPE = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
}

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const nextIdRef = useRef(1)

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    ({ type = TOAST_TYPE.INFO, title, message, durationMs = 3500 }) => {
      const id = nextIdRef.current++
      setToasts((prev) => [...prev, { id, type, title, message }])
      if (durationMs && durationMs > 0) {
        window.setTimeout(() => dismissToast(id), durationMs)
      }
      return id
    },
    [dismissToast]
  )

  return { toasts, pushToast, dismissToast }
}
