// Carga el Pixel de Meta (Facebook) en la página pública y dispara PageView.
// Solo acepta IDs numéricos: así no se puede inyectar código desde el panel.

const SCRIPT_ID = 'cataly-meta-pixel'

export const isValidMetaPixelId = (value) => /^[0-9]{5,20}$/.test(String(value || ''))

export const loadMetaPixel = (pixelId) => {
  if (!isValidMetaPixelId(pixelId)) return
  if (typeof window === 'undefined') return

  if (!window.fbq) {
    // Snippet oficial de Meta, sin inline <script>.
    const fbq = function (...args) {
      if (fbq.callMethod) fbq.callMethod(...args)
      else fbq.queue.push(args)
    }
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    if (!window._fbq) window._fbq = fbq

    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement('script')
      s.id = SCRIPT_ID
      s.async = true
      s.src = 'https://connect.facebook.net/en_US/fbevents.js'
      document.head.appendChild(s)
    }
  }

  window.__catalyPixels = window.__catalyPixels || new Set()
  if (!window.__catalyPixels.has(pixelId)) {
    window.fbq('init', pixelId)
    window.__catalyPixels.add(pixelId)
  }
  window.fbq('trackSingle', pixelId, 'PageView')
}

// Evento estándar al hacer clic en el botón principal de la landing.
export const trackMetaLead = (pixelId) => {
  if (!isValidMetaPixelId(pixelId) || typeof window === 'undefined' || !window.fbq) return
  window.fbq('trackSingle', pixelId, 'Lead')
}
