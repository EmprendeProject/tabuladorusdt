import { useMemo } from 'react'
import { Share2, Search } from 'lucide-react'

const money = (value, digits = 2) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const Chip = ({ active, children, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'flex h-10 shrink-0 items-center justify-center rounded bg-[#ec6d13] px-5 shadow-lg'
          : 'flex h-10 shrink-0 items-center justify-center rounded border border-zinc-800 bg-[#1e1e1e] px-5'
      }
    >
      <p className={active ? 'text-white text-xs font-black uppercase tracking-widest' : 'text-zinc-400 text-xs font-black uppercase tracking-widest'}>
        {children}
      </p>
    </button>
  )
}

const brushedMetalStyle = {
  backgroundImage:
    'linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 75%, transparent 75%, transparent)',
  backgroundSize: '4px 4px',
}

const shareProduct = async ({ title, text, url }) => {
  const t = String(title || '').trim()
  const body = String(text || '').trim()
  const u = String(url || '').trim()

  try {
    if (globalThis?.navigator?.share) {
      await globalThis.navigator.share({ title: t || undefined, text: body || undefined, url: u || undefined })
      return
    }
  } catch {
    // ignore and fallback
  }

  const payload = [t, body, u].filter(Boolean).join('\n')
  if (globalThis?.navigator?.clipboard?.writeText) {
    await globalThis.navigator.clipboard.writeText(payload)
    return
  }

  globalThis?.prompt?.('Copia:', payload)
}

const CatalogTemplateHeavy = ({
  productosFiltrados,
  query,
  setQuery,
  categorias,
  categoriaActiva,
  setCategoriaActiva,
  cargando,
  error,
  onReload,
  onSelectProducto,
  brandName = 'Catálogo',
}) => {
  const cats = Array.isArray(categorias) ? categorias : []
  const activeCat = String(categoriaActiva || '')

  const gridItems = useMemo(() => {
    const list = Array.isArray(productosFiltrados) ? productosFiltrados : []
    return list.slice(0, 8)
  }, [productosFiltrados])

  const priorityItems = useMemo(() => {
    const list = Array.isArray(productosFiltrados) ? productosFiltrados : []
    return list.slice(8, 14)
  }, [productosFiltrados])

  return (
    <div className="bg-[#121212] text-slate-100 min-h-screen font-sans">
      <header className="sticky top-0 z-50 bg-[#121212] border-b border-zinc-800">
        <div className="flex items-center justify-center p-4 pb-2">
          <h2 className="text-xl font-bold tracking-tighter uppercase truncate text-center">{brandName}</h2>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        <div className="px-4 py-4">
          <label className="flex flex-col min-w-40 h-14 w-full">
            <div className="flex w-full flex-1 items-stretch rounded border-2 border-zinc-800 focus-within:border-[#ec6d13] transition-colors bg-[#1e1e1e]">
              <div className="flex items-center justify-center pl-4 pr-2">
                <Search className="text-zinc-500" size={18} />
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-zinc-500 px-2 text-base font-medium tracking-tight"
                placeholder="BUSCAR EN EL INVENTARIO..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center pr-4">
                <span className="text-zinc-500 text-xs font-bold">#{gridItems.length}</span>
              </div>
            </div>
          </label>
        </div>

        <div className="flex gap-2 p-4 pt-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Chip active={!activeCat} onClick={() => setCategoriaActiva?.('')}>Todo</Chip>
          {cats.map((c) => (
            <Chip key={c} active={activeCat === c} onClick={() => setCategoriaActiva?.(c)}>
              {c}
            </Chip>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <h3 className="text-white text-sm font-black uppercase tracking-[0.2em] border-l-4 border-[#ec6d13] pl-3">
            Productos
          </h3>
          <button
            type="button"
            className="text-[#ec6d13] text-[10px] font-bold tracking-widest uppercase"
            onClick={onReload}
            disabled={cargando}
          >
            Ver todo
          </button>
        </div>

        {error ? (
          <div className="px-4 pb-2">
            <div className="bg-red-950/30 border border-red-900 text-red-200 rounded-lg p-3 text-sm">{error}</div>
          </div>
        ) : null}

        {cargando ? (
          <div className="px-4 pb-6">
            <div className="bg-[#1e1e1e] border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300">Cargando…</div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 p-4">
          {gridItems.map((p) => {
            const precio = p?.precioSugeridoUsd ?? p?.precioUSDT
            const sku = String(p?.sku || p?.codigo || p?.id || '').slice(0, 8).toUpperCase()

            return (
              <div key={p.id} className="group relative flex flex-col bg-[#1e1e1e] border border-zinc-800 rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => onSelectProducto?.(p)}
                  aria-label={`Ver ${p.nombre || 'producto'}`}
                >
                  <div
                    className="aspect-square w-full bg-cover bg-center flex items-start justify-end p-2"
                    style={{
                      backgroundImage: p?.imagenUrl
                        ? `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 40%), url(${JSON.stringify(p.imagenUrl).slice(1, -1)})`
                        : 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 40%)',
                    }}
                  >
                    {typeof p?.stock === 'number' ? (
                      <span className="bg-black/80 text-[#ec6d13] text-[10px] font-black px-2 py-1 rounded-sm uppercase">
                        Stock: {String(p.stock).padStart(2, '0')}
                      </span>
                    ) : null}
                  </div>

                  <div className="p-3 bg-zinc-900/50" style={brushedMetalStyle}>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mb-1">SKU: {sku || 'N/A'}</p>
                    <h4 className="text-white text-sm font-bold leading-tight line-clamp-2 uppercase h-10">
                      {p.nombre || 'Sin nombre'}
                    </h4>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[#ec6d13] font-bold text-lg">${money(precio, 2)}</span>
                      <button
                        type="button"
                        className="bg-zinc-800 p-1.5 rounded flex items-center justify-center hover:bg-zinc-700"
                        title="Compartir"
                        aria-label="Compartir"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          await shareProduct({
                            title: p?.nombre || 'Producto',
                            text: `Precio: $${money(precio, 2)}`,
                          })
                        }}
                      >
                        <Share2 className="text-white" size={16} />
                      </button>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        {priorityItems.length ? (
          <div className="px-4 py-6">
            <h3 className="text-white text-sm font-black uppercase tracking-[0.2em] mb-4">Otros</h3>
            <div className="space-y-3">
              {priorityItems.map((p) => {
                const precio = p?.precioSugeridoUsd ?? p?.precioUSDT
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProducto?.(p)}
                    className="w-full flex items-center gap-4 p-3 bg-[#1e1e1e] border border-zinc-800 rounded-lg text-left"
                    aria-label={`Ver ${p.nombre || 'producto'}`}
                  >
                    <div className="size-14 bg-zinc-800 shrink-0 flex items-center justify-center rounded overflow-hidden">
                      {p?.imagenUrl ? (
                        <img src={p.imagenUrl} alt={p.nombre || 'Producto'} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-zinc-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-xs font-bold uppercase truncate">{p.nombre || 'Sin nombre'}</h4>
                      <p className="text-zinc-500 text-[10px] font-medium truncate">{p?.categoria ? String(p.categoria) : 'Sin categoría'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#ec6d13] font-bold">${money(precio, 2)}</p>
                      <span className="text-zinc-600 text-sm">›</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {!gridItems.length && !cargando ? (
          <div className="px-4 pb-10">
            <div className="bg-[#1e1e1e] border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300">No hay productos para mostrar.</div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default CatalogTemplateHeavy
