import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Instagram, MapPin, MessageCircle, Store } from 'lucide-react'
import { PAGINA_TIPOS } from '../data/paginasRepository'
import { tiendasRepository } from '../data/tiendasRepository'
import { loadMetaPixel, trackMetaLead } from '../lib/metaPixel'
import { DEFAULT_ACCENT, instagramUrl, isHexColor, safeUrl, whatsappUrl } from '../lib/paginas'

// Link interno (/handle) con react-router; externo con <a>.
function SmartLink({ href, className, style, children, onClick }) {
  const url = safeUrl(href)
  if (!url) return null
  if (url.startsWith('/')) {
    return (
      <Link to={url} className={className} style={style} onClick={onClick}>
        {children}
      </Link>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className} style={style} onClick={onClick}>
      {children}
    </a>
  )
}

function useCatalogos(ids) {
  const key = (ids || []).join(',')
  const [state, setState] = useState({ key: '', rows: [] })
  useEffect(() => {
    let mounted = true
    if (!key) return () => { mounted = false }
    tiendasRepository
      .listPublicByIds(key.split(','))
      .then((rows) => mounted && setState({ key, rows }))
      .catch(() => mounted && setState({ key, rows: [] }))
    return () => {
      mounted = false
    }
  }, [key])
  return key && state.key === key ? state.rows : []
}

function Avatar({ url, name, accent }) {
  if (url) return <img src={url} alt={name} className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg" />
  const initial = String(name || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white text-3xl font-black text-white shadow-lg" style={{ background: accent }}>
      {initial}
    </div>
  )
}

function PoweredBy() {
  return (
    <div className="py-8 text-center text-xs text-gray-400">
      Hecho con <Link to="/" className="font-semibold text-gray-500 hover:text-gray-700">Cataly</Link>
    </div>
  )
}

function HomeView({ pagina, accent }) {
  const c = pagina.contenido
  const catalogos = useCatalogos(c.catalogoIds)
  const wa = whatsappUrl(c.whatsapp, `Hola ${pagina.titulo}, vengo de su página.`)
  const ig = instagramUrl(c.instagram)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-44 w-full bg-cover bg-center" style={c.portadaUrl ? { backgroundImage: `url("${encodeURI(c.portadaUrl)}")` } : { background: accent }} />
      <div className="mx-auto max-w-xl px-5">
        <div className="-mt-12 flex flex-col items-center text-center">
          <Avatar url={c.avatarUrl} name={pagina.titulo} accent={accent} />
          <h1 className="mt-4 text-3xl font-black text-gray-900">{pagina.titulo}</h1>
          {c.descripcion ? <p className="mt-3 whitespace-pre-line text-gray-600">{c.descripcion}</p> : null}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {wa ? (
              <SmartLink href={wa} className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white" style={{ background: accent }}>
                <MessageCircle size={16} /> WhatsApp
              </SmartLink>
            ) : null}
            {ig ? (
              <SmartLink href={ig} className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-bold text-gray-800">
                <Instagram size={16} /> Instagram
              </SmartLink>
            ) : null}
          </div>
        </div>

        {catalogos.length ? (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-500">Nuestros catálogos</h2>
            <div className="space-y-3">
              {catalogos.map((t) => (
                <Link
                  key={t.id}
                  to={`/${t.handle}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: accent }}>
                      <Store size={18} />
                    </span>
                    <span className="font-semibold text-gray-900">{t.nombreNegocio}</span>
                  </span>
                  <ArrowRight size={18} className="text-gray-400" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {c.direccion || c.mapsUrl ? (
          <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 text-gray-500" />
              <div className="text-sm text-gray-700">
                {c.direccion ? <div>{c.direccion}</div> : null}
                {c.mapsUrl ? (
                  <SmartLink href={c.mapsUrl} className="mt-1 inline-block font-semibold" style={{ color: accent }}>
                    Ver en el mapa
                  </SmartLink>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <PoweredBy />
      </div>
    </div>
  )
}

function LinkInBioView({ pagina, accent }) {
  const c = pagina.contenido
  const catalogos = useCatalogos(c.catalogoIds)
  const links = (c.links || []).filter((l) => safeUrl(l?.url))

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${accent}22 0%, #ffffff 60%)` }}>
      <div className="mx-auto flex max-w-md flex-col items-center px-5 pt-14">
        <Avatar url={c.avatarUrl} name={pagina.titulo} accent={accent} />
        <h1 className="mt-4 text-2xl font-black text-gray-900">{pagina.titulo}</h1>
        {c.bio ? <p className="mt-2 whitespace-pre-line text-center text-sm text-gray-600">{c.bio}</p> : null}

        <div className="mt-8 w-full space-y-3">
          {catalogos.map((t) => (
            <Link
              key={t.id}
              to={`/${t.handle}`}
              className="flex h-14 w-full items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md active:scale-[0.98] transition"
              style={{ background: accent }}
            >
              🛍️ {t.nombreNegocio}
            </Link>
          ))}
          {links.map((l) => (
            <SmartLink
              key={l.id}
              href={l.url}
              className="flex h-14 w-full items-center justify-center rounded-2xl border-2 bg-white px-4 text-center text-sm font-bold text-gray-900 shadow-sm active:scale-[0.98] transition"
              style={{ borderColor: accent }}
            >
              {l.label || l.url}
            </SmartLink>
          ))}
        </div>
        <PoweredBy />
      </div>
    </div>
  )
}

function LandingView({ pagina, accent }) {
  const c = pagina.contenido
  const beneficios = (c.beneficios || []).map((b) => String(b || '').trim()).filter(Boolean)

  const cta = safeUrl(c.ctaUrl) ? (
    <SmartLink
      href={c.ctaUrl}
      onClick={() => trackMetaLead(pagina.metaPixelId)}
      className="inline-flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-2xl text-base font-black text-white shadow-lg active:scale-[0.98] transition"
      style={{ background: accent }}
    >
      {c.ctaTexto || 'Quiero más información'} <ArrowRight size={18} />
    </SmartLink>
  ) : null

  return (
    <div className="min-h-screen bg-white">
      <section className="mx-auto max-w-3xl px-5 pt-14 pb-10 text-center">
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>{pagina.titulo}</div>
        <h1 className="mt-3 text-4xl md:text-5xl font-black leading-tight text-gray-900">{c.titular || pagina.titulo}</h1>
        {c.subtitulo ? <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-lg text-gray-600">{c.subtitulo}</p> : null}
        <div className="mt-8 flex justify-center">{cta}</div>
      </section>

      {c.imagenUrl ? (
        <div className="mx-auto max-w-3xl px-5">
          <img src={c.imagenUrl} alt={c.titular || pagina.titulo} className="w-full rounded-3xl object-cover shadow-xl" />
        </div>
      ) : null}

      {beneficios.length ? (
        <section className="mx-auto max-w-xl px-5 py-12">
          <ul className="space-y-4">
            {beneficios.map((b) => (
              <li key={b} className="flex items-start gap-3 text-gray-800">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
                  <Check size={14} />
                </span>
                <span className="text-base">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex justify-center">{cta}</div>
        </section>
      ) : null}

      <PoweredBy />
    </div>
  )
}

export default function PaginaPublica({ pagina }) {
  const accent = useMemo(
    () => (isHexColor(pagina?.contenido?.accentColor) ? pagina.contenido.accentColor : DEFAULT_ACCENT),
    [pagina],
  )

  useEffect(() => {
    if (pagina?.titulo) document.title = pagina.titulo
    if (pagina?.metaPixelId) loadMetaPixel(pagina.metaPixelId)
  }, [pagina?.titulo, pagina?.metaPixelId])

  if (!pagina) return null
  if (pagina.tipo === PAGINA_TIPOS.HOME) return <HomeView pagina={pagina} accent={accent} />
  if (pagina.tipo === PAGINA_TIPOS.LINKINBIO) return <LinkInBioView pagina={pagina} accent={accent} />
  return <LandingView pagina={pagina} accent={accent} />
}
