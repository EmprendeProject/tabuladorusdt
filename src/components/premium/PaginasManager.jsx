import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Link2, Loader2, Megaphone, Pencil, Plus, Store, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PAGINA_TIPOS, PAGINA_TIPO_LABELS, paginasRepository } from '../../data/paginasRepository'
import { MAX_PAGINAS_POR_TIPO } from '../../lib/planFeatures'
import { defaultContenido } from '../../lib/paginas'
import PremiumUpsell from './PremiumUpsell'
import PaginaEditor from './PaginaEditor'

const TIPOS = [
  {
    tipo: PAGINA_TIPOS.HOME,
    icon: <Store size={18} />,
    desc: 'La página principal de tu negocio: quiénes son, tus catálogos y cómo contactarte.',
  },
  {
    tipo: PAGINA_TIPOS.LINKINBIO,
    icon: <Link2 size={18} />,
    desc: 'Tu árbol de links para la bio de Instagram o TikTok.',
  },
  {
    tipo: PAGINA_TIPOS.LANDING,
    icon: <Megaphone size={18} />,
    desc: 'Página de venta para tus anuncios, con Pixel de Meta.',
  },
]

export default function PaginasManager({ ownerId, premium, catalogos, publicBaseUrl }) {
  const [paginas, setPaginas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // página (o borrador {tipo})
  const [deletingId, setDeletingId] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setPaginas(await paginasRepository.listMine())
    } catch (e) {
      setError(e?.message || 'No se pudieron cargar tus páginas.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const remove = async (p) => {
    if (!globalThis.confirm?.(`¿Borrar la página "${p.titulo || p.slug}"? El link dejará de funcionar.`)) return
    setDeletingId(p.id)
    try {
      await paginasRepository.remove(p.id)
      setPaginas((prev) => prev.filter((x) => x.id !== p.id))
    } catch (e) {
      setError(e?.message || 'No se pudo borrar la página.')
    } finally {
      setDeletingId('')
    }
  }

  if (editing) {
    return (
      <PaginaEditor
        key={editing.id || `new-${editing.tipo}`}
        pagina={editing}
        ownerId={ownerId}
        catalogos={catalogos}
        publicBaseUrl={publicBaseUrl}
        onBack={() => {
          setEditing(null)
          recargar()
        }}
        onSaved={(saved) => {
          setEditing(saved)
          setPaginas((prev) => (prev.some((x) => x.id === saved.id) ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved]))
        }}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Páginas</h2>
        <p className="text-sm text-gray-500">Crea páginas para tu negocio con su propio link.</p>
      </div>

      {!premium ? (
        <PremiumUpsell
          title="Páginas para tu negocio"
          description="Homepage, link en la bio y landing pages con Pixel de Meta. Si ya tenías páginas, se reactivan al renovar Cattaly Pro."
        />
      ) : null}

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Cargando…
        </div>
      ) : null}

      {TIPOS.map(({ tipo, icon, desc }) => {
        const delTipo = paginas.filter((p) => p.tipo === tipo)
        const canCreate = premium && delTipo.length < MAX_PAGINAS_POR_TIPO[tipo]
        return (
          <section key={tipo} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  {icon}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{PAGINA_TIPO_LABELS[tipo]}</h3>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </div>
              {canCreate ? (
                <button
                  type="button"
                  onClick={() => setEditing({ tipo, titulo: '', slug: '', contenido: defaultContenido(tipo), publicada: true })}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-3 text-xs font-semibold text-white"
                >
                  <Plus size={14} /> Crear
                </button>
              ) : null}
            </div>

            {delTipo.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">{p.titulo || 'Sin título'}</span>
                    {!p.publicada ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">Borrador</span>
                    ) : null}
                    {p.metaPixelId ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">Pixel</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-gray-500">{publicBaseUrl || ''}/{p.slug}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link to={`/${p.slug}`} target="_blank" title="Ver" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                    <ExternalLink size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    disabled={!premium}
                    title={premium ? 'Editar' : 'Renueva Cattaly Pro para editar'}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    disabled={deletingId === p.id}
                    title="Borrar"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  >
                    {deletingId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
