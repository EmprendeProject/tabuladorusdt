import { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, ImagePlus, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PAGINA_TIPOS, PAGINA_TIPO_LABELS, normalizeMetaPixelId, paginasRepository } from '../../data/paginasRepository'
import { tiendasRepository } from '../../data/tiendasRepository'
import { uploadPageImage } from '../../lib/storage'
import { defaultContenido, isHexColor, newLinkId, DEFAULT_ACCENT } from '../../lib/paginas'

const inputClass =
  'mt-1 w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400'
const textareaClass =
  'mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400'

function Field({ label, hint, children }) {
  return (
    <label className="block text-sm text-gray-700">
      {label}
      {children}
      {hint ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}
    </label>
  )
}

function ImageField({ label, value, onChange, ownerId }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { publicUrl } = await uploadPageImage({ file, ownerId })
      onChange(publicUrl)
    } catch (err) {
      setError(err?.message || 'No se pudo subir la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="text-sm text-gray-700">
      {label}
      <div className="mt-1 flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-16 w-16 rounded-xl object-cover border border-gray-200" />
        ) : (
          <div className="h-16 w-16 rounded-xl border border-dashed border-gray-300 bg-gray-50" />
        )}
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold hover:bg-gray-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {value ? 'Cambiar' : 'Subir imagen'}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        </label>
        {value ? (
          <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-rose-600">
            Quitar
          </button>
        ) : null}
      </div>
      {error ? <div className="mt-1 text-xs text-rose-600">{error}</div> : null}
    </div>
  )
}

function CatalogosPicker({ catalogos, value, onChange }) {
  const selected = new Set(value || [])
  return (
    <div className="text-sm text-gray-700">
      Catálogos a mostrar
      <div className="mt-1 space-y-1.5">
        {catalogos.map((c) => (
          <label key={c.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={(e) => {
                const next = (value || []).filter((id) => id !== c.id)
                onChange(e.target.checked ? [...next, c.id] : next)
              }}
            />
            {c.nombreNegocio} <span className="text-xs text-gray-400">/{c.handle}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function LinksEditor({ links, onChange }) {
  const list = Array.isArray(links) ? links : []
  const update = (id, patch) => onChange(list.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const move = (idx, dir) => {
    const next = [...list]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }

  return (
    <div className="text-sm text-gray-700">
      Links
      <div className="mt-1 space-y-2">
        {list.map((l, idx) => (
          <div key={l.id} className="rounded-xl border border-gray-200 p-2 space-y-2">
            <div className="flex gap-2">
              <input className={inputClass + ' mt-0'} placeholder="Texto del botón" value={l.label} onChange={(e) => update(l.id, { label: e.target.value })} />
              <button type="button" onClick={() => move(idx, -1)} className="h-10 w-10 shrink-0 rounded-xl border border-gray-200 flex items-center justify-center" title="Subir"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(idx, 1)} className="h-10 w-10 shrink-0 rounded-xl border border-gray-200 flex items-center justify-center" title="Bajar"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => onChange(list.filter((x) => x.id !== l.id))} className="h-10 w-10 shrink-0 rounded-xl border border-rose-200 text-rose-600 flex items-center justify-center" title="Quitar"><Trash2 size={14} /></button>
            </div>
            <input className={inputClass + ' mt-0'} placeholder="https://…" value={l.url} onChange={(e) => update(l.id, { url: e.target.value })} />
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...list, { id: newLinkId(), label: '', url: '' }])}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold hover:bg-gray-50"
        >
          <Plus size={14} /> Agregar link
        </button>
      </div>
    </div>
  )
}

export default function PaginaEditor({ pagina, ownerId, catalogos, publicBaseUrl, onSaved, onBack }) {
  const isNew = !pagina?.id
  const tipo = pagina.tipo
  const [titulo, setTitulo] = useState(pagina.titulo || '')
  const [slug, setSlug] = useState(pagina.slug || '')
  const [publicada, setPublicada] = useState(pagina.publicada !== false)
  const [metaPixelId, setMetaPixelId] = useState(pagina.metaPixelId || '')
  const [contenido, setContenido] = useState(() => ({ ...defaultContenido(tipo), ...(pagina.contenido || {}) }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState(null)

  const set = (patch) => setContenido((prev) => ({ ...prev, ...patch }))
  const slugPreview = tiendasRepository.normalizeHandle(slug || titulo)

  const save = async (e) => {
    e?.preventDefault?.()
    setError('')
    if (!String(titulo).trim()) {
      setError('El título es requerido.')
      return
    }
    const pixel = normalizeMetaPixelId(metaPixelId)
    if (pixel && (pixel.length < 5 || pixel.length > 20)) {
      setError('El ID del Pixel de Meta debe tener entre 5 y 20 dígitos.')
      return
    }
    if (!isHexColor(contenido.accentColor)) set({ accentColor: DEFAULT_ACCENT })

    setSaving(true)
    try {
      if (slugPreview !== pagina.slug) {
        const libre = await paginasRepository.isSlugAvailable(slugPreview)
        if (!libre) throw new Error(`El link /${slugPreview} ya está en uso. Elige otro.`)
      }

      const fields = {
        titulo,
        slug: slugPreview,
        publicada,
        contenido: { ...contenido, accentColor: isHexColor(contenido.accentColor) ? contenido.accentColor : DEFAULT_ACCENT },
        metaPixelId: pixel,
      }
      const saved = isNew ? await paginasRepository.create({ tipo, ...fields }) : await paginasRepository.update(pagina.id, fields)
      setSavedAt(new Date())
      onSaved?.(saved)
    } catch (err) {
      setError(err?.message || 'No se pudo guardar la página.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Páginas
        </button>
        {!isNew && pagina.slug ? (
          <Link to={`/${pagina.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900">
            Ver página <ExternalLink size={14} />
          </Link>
        ) : null}
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-amber-700">{PAGINA_TIPO_LABELS[tipo]}</div>
        <h2 className="text-xl font-bold text-gray-900">{isNew ? 'Nueva página' : titulo || 'Editar página'}</h2>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <Field label="Título">
          <input className={inputClass} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nombre de tu negocio" />
        </Field>
        <Field label="Link" hint={`${publicBaseUrl || ''}/${slugPreview}`}>
          <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="minegocio" />
        </Field>
        <div className="flex flex-wrap items-center gap-6">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={publicada} onChange={(e) => setPublicada(e.target.checked)} />
            Publicada
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            Color
            <input
              type="color"
              value={isHexColor(contenido.accentColor) ? contenido.accentColor : DEFAULT_ACCENT}
              onChange={(e) => set({ accentColor: e.target.value })}
              className="h-8 w-10 rounded border border-gray-200"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        {tipo === PAGINA_TIPOS.HOME ? (
          <>
            <ImageField label="Logo / foto" value={contenido.avatarUrl} onChange={(v) => set({ avatarUrl: v })} ownerId={ownerId} />
            <ImageField label="Portada" value={contenido.portadaUrl} onChange={(v) => set({ portadaUrl: v })} ownerId={ownerId} />
            <Field label="Descripción del negocio">
              <textarea rows={4} className={textareaClass} value={contenido.descripcion} onChange={(e) => set({ descripcion: e.target.value })} />
            </Field>
            <CatalogosPicker catalogos={catalogos} value={contenido.catalogoIds} onChange={(v) => set({ catalogoIds: v })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="WhatsApp">
                <input className={inputClass} value={contenido.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="584120000000" />
              </Field>
              <Field label="Instagram">
                <input className={inputClass} value={contenido.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="@minegocio" />
              </Field>
              <Field label="Dirección">
                <input className={inputClass} value={contenido.direccion} onChange={(e) => set({ direccion: e.target.value })} />
              </Field>
              <Field label="Link de Google Maps">
                <input className={inputClass} value={contenido.mapsUrl} onChange={(e) => set({ mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
              </Field>
            </div>
          </>
        ) : null}

        {tipo === PAGINA_TIPOS.LINKINBIO ? (
          <>
            <ImageField label="Foto de perfil" value={contenido.avatarUrl} onChange={(v) => set({ avatarUrl: v })} ownerId={ownerId} />
            <Field label="Bio">
              <textarea rows={3} className={textareaClass} value={contenido.bio} onChange={(e) => set({ bio: e.target.value })} />
            </Field>
            <CatalogosPicker catalogos={catalogos} value={contenido.catalogoIds} onChange={(v) => set({ catalogoIds: v })} />
            <LinksEditor links={contenido.links} onChange={(v) => set({ links: v })} />
          </>
        ) : null}

        {tipo === PAGINA_TIPOS.LANDING ? (
          <>
            <Field label="Titular">
              <input className={inputClass} value={contenido.titular} onChange={(e) => set({ titular: e.target.value })} placeholder="La mejor ropa para tu bebé" />
            </Field>
            <Field label="Subtítulo">
              <textarea rows={2} className={textareaClass} value={contenido.subtitulo} onChange={(e) => set({ subtitulo: e.target.value })} />
            </Field>
            <ImageField label="Imagen principal" value={contenido.imagenUrl} onChange={(v) => set({ imagenUrl: v })} ownerId={ownerId} />
            <Field label="Beneficios" hint="Uno por línea.">
              <textarea
                rows={4}
                className={textareaClass}
                value={(contenido.beneficios || []).join('\n')}
                onChange={(e) => set({ beneficios: e.target.value.split('\n') })}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Texto del botón">
                <input className={inputClass} value={contenido.ctaTexto} onChange={(e) => set({ ctaTexto: e.target.value })} />
              </Field>
              <Field label="Link del botón" hint="WhatsApp, tu catálogo (/mi-catalogo) o cualquier URL.">
                <input className={inputClass} value={contenido.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} placeholder="https://wa.me/58412…" />
              </Field>
            </div>
            <Field label="ID del Pixel de Meta" hint="Solo números. Lo encuentras en Meta Events Manager. Registra PageView al entrar y Lead al tocar el botón.">
              <input
                className={inputClass}
                inputMode="numeric"
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(normalizeMetaPixelId(e.target.value))}
                placeholder="123456789012345"
              />
            </Field>
          </>
        ) : null}
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {savedAt && !error ? <div className="text-sm text-emerald-700">Guardado.</div> : null}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {isNew ? 'Crear página' : 'Guardar cambios'}
      </button>
    </form>
  )
}
