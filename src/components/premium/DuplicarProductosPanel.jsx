import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Copy, Loader2, MoveRight } from 'lucide-react'
import { productosRepository } from '../../data/productosRepository'
import { copiarProductosEntreCatalogos, moverProductosEntreCatalogos } from '../../usecases/catalogosUsecases'

const selectClass = 'mt-1 w-full h-10 px-3 border border-gray-200 rounded-xl text-sm bg-white'

export default function DuplicarProductosPanel({ ownerId, catalogos, defaultFromId }) {
  const [fromId, setFromId] = useState(defaultFromId || catalogos[0]?.id || '')
  const [toId, setToId] = useState(() => catalogos.find((c) => c.id !== (defaultFromId || catalogos[0]?.id))?.id || '')
  const [modo, setModo] = useState('copiar') // copiar | mover
  const [alcance, setAlcance] = useState('todos') // todos | seleccion
  const [copiarApariencia, setCopiarApariencia] = useState(false)

  const [productos, setProductos] = useState([])
  const [cargandoProductos, setCargandoProductos] = useState(false)
  const [seleccion, setSeleccion] = useState(() => new Set())
  const [filtro, setFiltro] = useState('')

  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    if (!fromId) return () => { mounted = false }
    setCargandoProductos(true)
    setSeleccion(new Set())
    productosRepository
      .listAll(ownerId, { tiendaId: fromId })
      .then((list) => mounted && setProductos(list))
      .catch(() => mounted && setProductos([]))
      .finally(() => mounted && setCargandoProductos(false))
    return () => {
      mounted = false
    }
  }, [fromId, ownerId])

  // Si origen y destino coinciden, mover el destino a otro catálogo.
  useEffect(() => {
    if (fromId && fromId === toId) setToId(catalogos.find((c) => c.id !== fromId)?.id || '')
  }, [catalogos, fromId, toId])

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return productos
    return productos.filter((p) => `${p.nombre} ${p.categoria}`.toLowerCase().includes(q))
  }, [filtro, productos])

  const total = alcance === 'todos' ? productos.length : seleccion.size

  const toggle = (id) => {
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const ejecutar = async () => {
    setError('')
    setResult(null)
    if (!total) {
      setError('No hay productos seleccionados.')
      return
    }
    setBusy(true)
    try {
      const productIds = alcance === 'todos' ? undefined : Array.from(seleccion)
      if (modo === 'copiar') {
        const res = await copiarProductosEntreCatalogos({
          ownerId,
          fromTiendaId: fromId,
          toTiendaId: toId,
          productIds,
          copiarApariencia,
          onProgress: setProgress,
        })
        setResult({ text: `Se copiaron ${res.copiados} producto(s).`, errors: res.errors, warnings: res.warnings })
      } else {
        const res = await moverProductosEntreCatalogos({ ownerId, fromTiendaId: fromId, toTiendaId: toId, productIds })
        setResult({ text: `Se movieron ${res.movidos} producto(s).`, errors: [], warnings: [] })
        const list = await productosRepository.listAll(ownerId, { tiendaId: fromId })
        setProductos(list)
        setSeleccion(new Set())
      }
    } catch (e) {
      setError(e?.message || 'No se pudo completar la operación.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Duplicar o migrar productos</h3>
        <p className="text-sm text-gray-500">Copia tu inventario de un catálogo a otro, o muévelo.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
        <label className="block text-sm text-gray-700">
          Desde
          <select className={selectClass} value={fromId} onChange={(e) => setFromId(e.target.value)} disabled={busy}>
            {catalogos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombreNegocio}</option>
            ))}
          </select>
        </label>
        <ArrowRight className="hidden sm:block mb-2.5 text-gray-400" size={18} />
        <label className="block text-sm text-gray-700">
          Hacia
          <select className={selectClass} value={toId} onChange={(e) => setToId(e.target.value)} disabled={busy}>
            {catalogos.filter((c) => c.id !== fromId).map((c) => (
              <option key={c.id} value={c.id}>{c.nombreNegocio}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'copiar', label: 'Copiar', desc: 'Quedan en ambos catálogos', icon: Copy },
          { id: 'mover', label: 'Mover', desc: 'Salen del catálogo origen', icon: MoveRight },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModo(m.id)}
            disabled={busy}
            className={
              'rounded-xl border p-3 text-left ' +
              (modo === m.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:bg-gray-50')
            }
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <m.icon size={16} /> {m.label}
            </div>
            <div className="text-xs text-gray-500">{m.desc}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-700">
        <label className="inline-flex items-center gap-2">
          <input type="radio" checked={alcance === 'todos'} onChange={() => setAlcance('todos')} disabled={busy} />
          Todos ({productos.length})
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" checked={alcance === 'seleccion'} onChange={() => setAlcance('seleccion')} disabled={busy} />
          Elegir productos
        </label>
        {modo === 'copiar' ? (
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={copiarApariencia} onChange={(e) => setCopiarApariencia(e.target.checked)} disabled={busy} />
            Copiar también tema, logo y color
          </label>
        ) : null}
      </div>

      {alcance === 'seleccion' ? (
        <div className="rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 border-b border-gray-100 p-2">
            <input
              className="h-9 flex-1 rounded-lg border border-gray-200 px-3 text-sm"
              placeholder="Buscar producto…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <button
              type="button"
              className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-semibold"
              onClick={() => setSeleccion(new Set(visibles.map((p) => p.id)))}
            >
              Marcar todos
            </button>
            <button type="button" className="h-9 rounded-lg border border-gray-200 px-3 text-xs font-semibold" onClick={() => setSeleccion(new Set())}>
              Ninguno
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
            {cargandoProductos ? <div className="p-3 text-sm text-gray-500">Cargando…</div> : null}
            {!cargandoProductos && !visibles.length ? <div className="p-3 text-sm text-gray-500">Sin productos.</div> : null}
            {visibles.map((p) => (
              <label key={p.id} className="flex items-center gap-3 p-2.5 text-sm hover:bg-gray-50">
                <input type="checkbox" checked={seleccion.has(p.id)} onChange={() => toggle(p.id)} />
                {p.imagenUrl ? (
                  <img src={p.imagenUrl} alt="" className="h-8 w-8 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <span className="h-8 w-8 rounded-lg bg-gray-100" />
                )}
                <span className="flex-1 truncate">{p.nombre}</span>
                {p.categoria ? <span className="text-xs text-gray-400">{p.categoria}</span> : null}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {progress ? (
        <div className="text-sm text-gray-600">
          {progress.label} {progress.total ? `${progress.done}/${progress.total}` : ''}
        </div>
      ) : null}
      {result ? (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="font-semibold">{result.text}</div>
          {[...result.errors, ...result.warnings].slice(0, 8).map((m) => (
            <div key={m} className="mt-1 text-xs text-amber-800">{m}</div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={ejecutar}
        disabled={busy || !toId || !total}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : modo === 'copiar' ? <Copy size={16} /> : <MoveRight size={16} />}
        {modo === 'copiar' ? 'Copiar' : 'Mover'} {total} producto(s)
      </button>
    </div>
  )
}
