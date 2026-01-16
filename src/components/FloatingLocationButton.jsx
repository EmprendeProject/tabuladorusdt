const buildMapsUrl = ({ url }) => {
  const explicit = String(url || '').trim()
  if (!explicit) return ''
  return explicit
}

const MapPinIcon = ({ className = '' }) => {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2c-3.86 0-7 3.14-7 7 0 5.25 6.23 12.1 6.49 12.39.28.3.75.3 1.02 0C12.77 21.1 19 14.25 19 9c0-3.86-3.14-7-7-7zm0 17.23C10.4 17.36 7 12.99 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 3.99-3.4 8.36-5 10.23z"
      />
      <path fill="currentColor" d="M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm0 3.6a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2z" />
    </svg>
  )
}

const FloatingLocationButton = ({ url }) => {
  const href = buildMapsUrl({ url })
  if (!href) {
    if (import.meta.env.DEV) {
      console.warn(
        '[Maps] Botón oculto: define una URL de Google Maps (prop `url`).',
      )
    }
    return null
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed z-50 inline-flex items-center justify-center w-14 h-14 rounded-full bg-white text-black shadow-2xl shadow-black/20 hover:brightness-95 active:brightness-90 focus:outline-none focus:ring-4 focus:ring-white/40"
      style={{
        right: 'var(--catalog-fab-right, 1.5rem)',
        bottom: 'calc(var(--catalog-fab-bottom, 1.5rem) + 4.5rem)',
      }}
      aria-label="Ver ubicación"
      title="Ubicación"
    >
      <MapPinIcon className="w-7 h-7" />
    </a>
  )
}

export default FloatingLocationButton
