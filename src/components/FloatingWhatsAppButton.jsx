import socialIcon from '../assets/social.png'

const buildWhatsAppUrl = ({ number, message, url }) => {
  const explicit = String(url || '').trim()
  if (explicit) return explicit

  const digits = String(number || '').replace(/\D/g, '')
  if (!digits) return ''

  const text = String(message || '').trim()
  if (!text) return `https://wa.me/${digits}`

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

const FloatingWhatsAppButton = ({
  number,
  message,
  url,
}) => {
  const href = buildWhatsAppUrl({ number, message, url })
  if (!href) {
    // Ayuda a diagnosticar en dev cuando falta configurar WhatsApp.
    if (import.meta.env.DEV) {
      console.warn(
        '[WhatsApp] Botón oculto: define un número (prop `number`) o una URL (prop `url`).',
      )
    }
    return null
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed z-50 inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden bg-transparent shadow-2xl shadow-black/20 hover:brightness-95 active:brightness-90 focus:outline-none focus:ring-4 focus:ring-emerald-200"
      style={{
        right: 'var(--catalog-fab-right, 1.5rem)',
        bottom: 'var(--catalog-fab-bottom, 1.5rem)',
      }}
      aria-label="Contactar por WhatsApp"
      title="WhatsApp"
    >
      <img
        src={socialIcon}
        alt="WhatsApp"
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </a>
  )
}

export default FloatingWhatsAppButton
