import { PAGINA_TIPOS } from '../data/paginasRepository'

// Solo permitimos links seguros (evita `javascript:` y similares en páginas públicas).
export const safeUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '' // otro esquema: bloqueado
  if (raw.startsWith('/')) return raw // ruta interna de Cataly
  return `https://${raw}`
}

export const whatsappUrl = (phone, text = '') => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export const instagramUrl = (user) => {
  const u = String(user || '').trim().replace(/^@/, '')
  if (!u) return ''
  if (/^https?:/i.test(u)) return u
  return `https://instagram.com/${encodeURIComponent(u)}`
}

export const newLinkId = () =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `l-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const DEFAULT_ACCENT = '#FF3399'

// Contenido inicial por tipo de página.
export const defaultContenido = (tipo) => {
  if (tipo === PAGINA_TIPOS.HOME) {
    return {
      descripcion: '',
      avatarUrl: '',
      portadaUrl: '',
      catalogoIds: [],
      whatsapp: '',
      instagram: '',
      direccion: '',
      mapsUrl: '',
      accentColor: DEFAULT_ACCENT,
    }
  }
  if (tipo === PAGINA_TIPOS.LINKINBIO) {
    return {
      bio: '',
      avatarUrl: '',
      links: [],
      catalogoIds: [],
      accentColor: DEFAULT_ACCENT,
    }
  }
  return {
    titular: '',
    subtitulo: '',
    imagenUrl: '',
    beneficios: [],
    ctaTexto: 'Escríbenos por WhatsApp',
    ctaUrl: '',
    accentColor: DEFAULT_ACCENT,
  }
}

export const isHexColor = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || ''))
