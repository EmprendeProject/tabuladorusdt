import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import Pagination from '../Pagination'

const formatearNumero = (value, digits = 2) => {
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
          ? 'flex h-9 shrink-0 items-center justify-center rounded-full bg-black px-5 shadow-md shadow-black/20'
          : 'flex h-9 shrink-0 items-center justify-center rounded-full bg-white px-5 border border-gray-100'
      }
    >
      <p className={active ? 'text-white text-sm font-semibold' : 'text-gray-700 text-sm font-medium'}>
        {children}
      </p>
    </button>
  )
}

const CatalogTemplateModern = ({
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
  brandName,
  shopName,
}) => {
  const nombreTienda = String(shopName || brandName || 'Tu Tienda')
  const cats = Array.isArray(categorias) ? categorias : []
  const activeCat = String(categoriaActiva || '')

  const [busquedaVisible, setBusquedaVisible] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Reset a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [query, categoriaActiva])

  useEffect(() => {
    if (!busquedaVisible) return
    const t = globalThis?.setTimeout?.(() => {
      const el = globalThis?.document?.getElementById?.('catalog-modern-search')
      el?.focus?.()
    }, 0)
    return () => {
      globalThis?.clearTimeout?.(t)
    }
  }, [busquedaVisible])

  // Calcular productos paginados
  const totalItems = productosFiltrados.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const productosPaginados = productosFiltrados.slice(startIndex, endIndex)

  return (
    <div className="bg-[#f6f7f8] text-[#111418] min-h-screen font-[Inter,system-ui,Segoe_UI,Roboto,Helvetica,Arial,sans-serif]">
      <header className="sticky top-0 z-50 bg-[#f6f7f8]/80 backdrop-blur-md">
        <div className="flex items-center p-4 pb-2 justify-between">
          <div className="flex items-center min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{nombreTienda}</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="size-10 flex items-center justify-center rounded-full bg-white shadow-sm"
              title={busquedaVisible ? 'Ocultar búsqueda' : 'Buscar'}
              aria-label={busquedaVisible ? 'Ocultar búsqueda' : 'Buscar'}
              onClick={() => setBusquedaVisible((v) => !v)}
            >
              <Search size={18} className="text-gray-700" />
            </button>
          </div>
        </div>

        {busquedaVisible ? (
          <div className="px-4 py-2">
            <div className="flex w-full items-stretch rounded-xl h-11 shadow-sm overflow-hidden">
              <div className="text-gray-400 flex bg-white items-center justify-center pl-4">
                <Search size={18} />
              </div>
              <input
                id="catalog-modern-search"
                className="flex w-full min-w-0 flex-1 text-sm bg-white placeholder:text-gray-400 px-4 pl-2 outline-none"
                placeholder="Buscar en el catálogo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="button"
                className="flex bg-white items-center justify-center pr-4 text-[#137fec]"
                title="Refrescar"
                aria-label="Refrescar"
                onClick={onReload}
                disabled={cargando}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Chip
            active={!activeCat}
            onClick={() => setCategoriaActiva?.('')}
          >
            Todo
          </Chip>
          {cats.map((c) => (
            <Chip
              key={c}
              active={activeCat === c}
              onClick={() => setCategoriaActiva?.(c)}
            >
              {c}
            </Chip>
          ))}
        </div>
      </header>

      <main className="px-4 pb-8">
        {error ? <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div> : null}

        <div
          style={{ columnCount: 2, columnGap: 12 }}
          aria-busy={cargando ? 'true' : 'false'}
        >
          {productosPaginados.map((p, idx) => {
            const ratio = idx % 6 === 0 ? 'aspect-[3/4]' : idx % 6 === 1 ? 'aspect-square' : idx % 6 === 2 ? 'aspect-[2/3]' : idx % 6 === 3 ? 'aspect-[4/3]' : idx % 6 === 4 ? 'aspect-square' : 'aspect-[3/5]'
            return (
              <div key={p.id} style={{ breakInside: 'avoid', marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => onSelectProducto?.(p)}
                  className="w-full text-left relative bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
                  aria-label={`Ver ${p.nombre || 'producto'}`}
                >
                  <div className={`bg-gray-100 ${ratio}`}>
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
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">Sin foto</div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-bold text-sm line-clamp-1">{p.nombre || 'Sin nombre'}</h3>
                    <p className="text-[#137fec] font-extrabold text-base mt-1">${formatearNumero(p.precioSugeridoUsd ?? p.precioUSDT, 2)}</p>
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        {productosFiltrados.length === 0 && !cargando ? (
          <div className="mt-8 text-center text-sm text-gray-500">No hay productos para mostrar.</div>
        ) : null}

        {/* Paginación */}
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </main>
    </div>
  )
}

export default CatalogTemplateModern
