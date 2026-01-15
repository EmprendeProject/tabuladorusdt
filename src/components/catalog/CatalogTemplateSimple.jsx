import { useEffect, useMemo, useState } from 'react'
import { Menu, Search } from 'lucide-react'

const formatearNumero = (value, digits = 2) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const Tab = ({ active, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'flex flex-col items-center justify-center border-b-[2px] border-[#f2a60d] text-[#181611] pb-3 pt-4 min-w-fit'
          : 'flex flex-col items-center justify-center border-b-[2px] border-transparent text-[#8a7c60] pb-3 pt-4 min-w-fit'
      }
    >
      <p className="text-[10px] font-bold leading-normal tracking-[0.1em] uppercase">{children}</p>
    </button>
  )
}

const CatalogTemplateSimple = ({
  productosFiltrados,
  query,
  setQuery,
  categorias,
  categoriaActiva,
  setCategoriaActiva,
  cargando,
  error,
  onSelectProducto,
  brandName,
}) => {
  const nombreTienda = String(brandName || 'Elégance').trim() || 'Elégance'
  const cats = Array.isArray(categorias) ? categorias : []
  const activeCat = String(categoriaActiva || '')

  const [busquedaVisible, setBusquedaVisible] = useState(false)

  useEffect(() => {
    if (!busquedaVisible) return
    const t = globalThis?.setTimeout?.(() => {
      const el = globalThis?.document?.getElementById?.('catalog-elegance-search')
      el?.focus?.()
    }, 0)
    return () => {
      globalThis?.clearTimeout?.(t)
    }
  }, [busquedaVisible])

  const latestSixItems = useMemo(() => {
    // `productosFiltrados` ya viene ordenado por `created_at desc` desde la query.
    const list = Array.isArray(productosFiltrados) ? productosFiltrados : []
    return list.slice(0, 6)
  }, [productosFiltrados])

  const allItems = useMemo(() => {
    const list = Array.isArray(productosFiltrados) ? productosFiltrados : []
    return list
  }, [productosFiltrados])

  return (
    <div className="bg-[#f8f7f5] text-[#181611] min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f8f7f5] overflow-x-hidden max-w-md mx-auto">
        <header className="sticky top-0 z-50 flex items-center bg-[#f8f7f5]/95 backdrop-blur-sm p-4 pb-2 justify-between border-b border-[#f2a60d]/10">
          <div className="flex size-12 shrink-0 items-center justify-start">
            <button
              type="button"
              className="text-[#f2a60d] size-12 flex items-center justify-start"
              title="Menú"
              aria-label="Menú"
              onClick={() => {}}
            >
              <Menu size={22} />
            </button>
          </div>

          <div className="flex flex-col items-center">
            <h1 className="text-[#181611] text-xl font-bold leading-tight tracking-[0.2em] uppercase text-center" style={{ fontFamily: 'ui-serif, Georgia, Times New Roman, serif' }}>
              {nombreTienda}
            </h1>
            <div className="h-[1px] w-8 bg-[#f2a60d] mt-1" />
          </div>

          <div className="flex w-12 items-center justify-end">
            <button
              type="button"
              className="flex items-center justify-center rounded h-12 w-12 bg-transparent text-[#181611]"
              title={busquedaVisible ? 'Cerrar búsqueda' : 'Buscar'}
              aria-label={busquedaVisible ? 'Cerrar búsqueda' : 'Buscar'}
              onClick={() => setBusquedaVisible((v) => !v)}
            >
              <Search size={22} />
            </button>
          </div>
        </header>

        {busquedaVisible ? (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7c60]" />
                <input
                  id="catalog-elegance-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setBusquedaVisible(false)
                  }}
                  placeholder="Buscar producto…"
                  className="w-full bg-white border border-[#f2a60d]/20 rounded px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-[#f2a60d]/30"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setBusquedaVisible(false)
                }}
                className="shrink-0 text-[10px] text-[#f2a60d] font-bold uppercase tracking-[0.3em]"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}

        <nav className="bg-[#f8f7f5]">
          <div
            className="flex border-b border-[#f2a60d]/10 px-4 gap-8 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            <Tab active={!activeCat} onClick={() => setCategoriaActiva?.('')}>All Collections</Tab>
            {cats.map((c) => (
              <Tab key={c} active={activeCat === c} onClick={() => setCategoriaActiva?.(c)}>
                {c}
              </Tab>
            ))}
          </div>
        </nav>

        <main className="flex-1">
          {error ? (
            <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
              {error}
            </div>
          ) : null}

          <div className="pt-8 px-4 flex justify-between items-end">
            <div>
              <h2 className="text-[#181611] text-2xl font-light leading-tight tracking-tight" style={{ fontFamily: 'ui-serif, Georgia, Times New Roman, serif' }}>
                Destacado
              </h2>
            </div>
            <button
              type="button"
              className="text-[#f2a60d] text-xs uppercase tracking-widest border-b border-[#f2a60d] pb-1"
              onClick={() => {
                const el = globalThis?.document?.getElementById?.('elegance-latest')
                el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
              }}
            >
              View All
            </button>
          </div>

          <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-stretch p-4 gap-4">
              {latestSixItems.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProducto?.(p)}
                  className="flex h-full flex-1 flex-col gap-4 rounded min-w-72 text-left group"
                  aria-label={`Ver ${p.nombre || 'producto'}`}
                >
                  <div className="w-full bg-center bg-no-repeat aspect-[4/5] bg-cover rounded shadow-sm transition-transform duration-500 group-hover:scale-[1.01] bg-[#eee] overflow-hidden">
                    {p.imagenUrl ? (
                      <img
                        src={p.imagenUrl}
                        alt={p.nombre || 'Imagen del producto'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="px-1">
                    <p className="text-[#181611] text-lg font-light leading-normal" style={{ fontFamily: 'ui-serif, Georgia, Times New Roman, serif' }}>
                      {p.nombre || 'Sin nombre'}
                    </p>
                    <p className="text-[#f2a60d] text-sm font-medium tracking-widest mt-1">
                      ${formatearNumero(p.precioSugeridoUsd ?? p.precioUSDT, 2)}
                    </p>
                  </div>
                </button>
              ))}

              {latestSixItems.length === 0 && !cargando ? (
                <div className="px-4 py-8 text-sm text-[#8a7c60]">No hay productos para mostrar.</div>
              ) : null}
            </div>
          </div>

          <div className="mx-4 my-6 h-[0.5px] bg-[#f2a60d]/20" />

          <h3
            id="elegance-latest"
            className="text-[#181611] text-lg font-bold leading-tight tracking-[0.1em] px-4 pb-4 uppercase"
          >
            Productos
          </h3>

          <div className="px-4 pb-10" aria-busy={cargando ? 'true' : 'false'}>
            <div className="grid grid-cols-2 gap-8">
              {allItems.map((p) => {
                const cat = String(p?.categoria || '').trim()
                const price = `$${formatearNumero(p.precioSugeridoUsd ?? p.precioUSDT, 2)}`
                const meta = cat ? `${cat.toUpperCase()} / ${price}` : price

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProducto?.(p)}
                    className="flex flex-col gap-3 text-left group"
                    aria-label={`Ver ${p.nombre || 'producto'}`}
                  >
                    <div className="bg-cover bg-center flex flex-col rounded aspect-[3/4] transition-opacity duration-300 group-hover:opacity-90 bg-[#eee] overflow-hidden">
                      {p.imagenUrl ? (
                        <img
                          src={p.imagenUrl}
                          alt={p.nombre || 'Imagen del producto'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : null}
                    </div>
                    <div>
                      <p
                        className="text-[#181611] text-xl font-light leading-tight"
                        style={{ fontFamily: 'ui-serif, Georgia, Times New Roman, serif' }}
                      >
                        {p.nombre || 'Sin nombre'}
                      </p>
                      <p
                        className="text-[#8a7c60] text-xs font-light mt-1 tracking-wider uppercase"
                        style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}
                      >
                        {meta}
                      </p>
                    </div>
                  </button>
                )
              })}

              {allItems.length === 0 && !cargando ? (
                <div className="col-span-2 py-6 text-center text-sm text-[#8a7c60]">No hay productos para mostrar.</div>
              ) : null}
            </div>
          </div>

          <section className="p-8 mt-2 bg-[#f2a60d]/5 text-center">
            <p
              className="text-[#f2a60d] text-[10px] uppercase tracking-[0.4em] mb-4"
              style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}
            >
              2026
            </p>
            <h4
              className="text-xl font-light italic leading-relaxed"
              style={{ fontFamily: 'ui-serif, Georgia, Times New Roman, serif' }}
            >
              {nombreTienda}
            </h4>
          </section>
        </main>
      </div>
    </div>
  )
}

export default CatalogTemplateSimple
