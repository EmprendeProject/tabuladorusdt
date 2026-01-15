const buildWhatsAppUrl = ({ number, message, url }) => {
  const explicit = String(url || '').trim()
  if (explicit) return explicit

  const digits = String(number || '').replace(/\D/g, '')
  if (!digits) return ''

  const text = String(message || '').trim()
  if (!text) return `https://wa.me/${digits}`

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

const WhatsAppIcon = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M19.11 17.73c-.22-.11-1.27-.63-1.47-.7-.2-.07-.35-.11-.5.11-.15.22-.57.7-.7.85-.13.15-.26.17-.48.06-.22-.11-.93-.34-1.78-1.1-.66-.58-1.1-1.3-1.23-1.52-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.01-.39-.06-.11-.5-1.2-.68-1.64-.18-.43-.36-.37-.5-.38h-.43c-.15 0-.39.06-.59.28-.2.22-.78.76-.78 1.86s.8 2.16.91 2.31c.11.15 1.57 2.4 3.8 3.36.53.23.95.37 1.27.47.53.17 1.01.15 1.39.09.42-.06 1.27-.52 1.45-1.02.18-.5.18-.93.13-1.02-.05-.09-.2-.15-.42-.26z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16 3C8.82 3 3 8.74 3 15.82c0 2.26.6 4.37 1.65 6.2L3 29l7.14-1.6a13.2 13.2 0 0 0 5.86 1.36C23.18 28.76 29 23.02 29 15.94 29 8.86 23.18 3 16 3zm0 23.39c-1.86 0-3.61-.5-5.13-1.37l-.37-.22-4.23.95.99-4.1-.24-.4a10.99 10.99 0 0 1-1.7-5.86C5.32 9.96 10.12 5.2 16 5.2c5.88 0 10.68 4.76 10.68 10.62 0 5.86-4.8 10.57-10.68 10.57z"
        clipRule="evenodd"
      />
    </svg>
  )
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
      className="fixed z-50 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#25D366] text-white shadow-2xl shadow-emerald-500/30 hover:brightness-95 active:brightness-90 focus:outline-none focus:ring-4 focus:ring-emerald-200"
      style={{
        right: 'var(--catalog-fab-right, 1.5rem)',
        bottom: 'var(--catalog-fab-bottom, 1.5rem)',
      }}
      aria-label="Contactar por WhatsApp"
      title="WhatsApp"
    >
      <WhatsAppIcon className="w-7 h-7" />
    </a>
  )
}

export default FloatingWhatsAppButton
