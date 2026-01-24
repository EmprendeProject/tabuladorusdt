import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import Pagination from '../Pagination'

const formatearNumero = (value, digits = 2) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const Chip = ({ active, children, onClick, icon }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-[#eca413] px-5 shadow-lg shadow-[#eca413]/20'
          : 'flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-white dark:bg-zinc-800 px-5 border border-zinc-200 dark:border-zinc-700'
      }
    >
      {icon && (
        <span className={active ? 'text-black text-xl' : 'text-[#eca413] text-xl'}>
          {icon}
        </span>
      )}
      <p className={active ? 'text-black text-sm font-bold uppercase tracking-wider' : 'text-zinc-800 dark:text-white text-sm font-bold uppercase tracking-wider'}>
        {children}
      </p>
    </button>
  )
}

const CatalogTemplateUrbanStreet = ({
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
  const nombreTienda = String(brandName || 'URBAN STREET').trim().toUpperCase()
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
      const el = globalThis?.document?.getElementById?.('catalog-urban-search')
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

  // Featured product (first one of current page)
  const featuredProduct = productosPaginados[0] || null

  // Rest of products for masonry grid
  const gridProducts = productosPaginados.slice(1)

  return (
    <div className="bg-[#f8f7f6] dark:bg-[#121212] text-slate-900 dark:text-white min-h-screen font-[Space_Grotesk,sans-serif]">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }}>
        {/* TopAppBar */}
        <header className="sticky top-0 z-50 bg-[#f8f7f6]/80 dark:bg-[#121212]/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-[#eca413]/20">
          <div className="flex items-center gap-3">
            {/* Menu button - commented out */}
            {/* <div className="p-2 rounded-lg bg-[#eca413]/10 border border-[#eca413]/30">
              <svg className="w-6 h-6 text-[#eca413]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div> */}
            <h1 className="text-xl font-bold tracking-tighter uppercase italic leading-none">
              {nombreTienda.split(' ')[0] || 'URBAN'}<br />
              <span className="text-[#eca413]">{nombreTienda.split(' ').slice(1).join(' ') || 'STREET'}</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBusquedaVisible((v) => !v)}
              className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700"
              title="Buscar"
              aria-label="Buscar"
            >
              <Search size={20} className="text-zinc-600 dark:text-zinc-300" />
            </button>
          </div>
        </header>

        {/* SearchBar */}
        {busquedaVisible && (
          <div className="px-4 pt-6 pb-2">
            <label className="flex flex-col min-w-40 h-14 w-full group">
              <div className="flex w-full flex-1 items-stretch rounded-xl h-full border-2 border-zinc-200 dark:border-zinc-800 group-focus-within:border-[#eca413] transition-all overflow-hidden bg-white dark:bg-zinc-900">
                <div className="text-zinc-400 flex items-center justify-center pl-4">
                  <Search size={20} />
                </div>
                <input
                  id="catalog-urban-search"
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-zinc-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-zinc-500 px-4 text-base font-medium"
                  placeholder="Crave the streets..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </label>
          </div>
        )}

        {/* Chips / Category Filters */}
        <div className="flex gap-3 px-4 py-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Chip
            active={!activeCat}
            onClick={() => setCategoriaActiva?.('')}
            icon="🔥"
          >
            All
          </Chip>
          {cats.map((c) => {
            const isActive = activeCat.toLowerCase() === c.toLowerCase()
            return (
              <Chip
                key={c}
                active={isActive}
                onClick={() => setCategoriaActiva?.(c)}
              >
                {c}
              </Chip>
            )
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Featured High-Contrast Card */}
        {featuredProduct && (
          <div className="px-4 py-2">
            <button
              type="button"
              onClick={() => onSelectProducto?.(featuredProduct)}
              className="relative overflow-hidden rounded-2xl aspect-square shadow-2xl group w-full text-left"
              aria-label={`Ver ${featuredProduct.nombre || 'producto destacado'}`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{
                  backgroundImage: featuredProduct.imagenUrl
                    ? `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%), url(${featuredProduct.imagenUrl})`
                    : 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%), linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              />
              <div className="absolute top-4 left-4 bg-[#eca413] text-black px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">
                Destacado
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
                    {(featuredProduct.nombre || 'PRODUCTO').split(' ').slice(0, 2).join(' ')}
                  </h3>
                  <p className="text-[#eca413] font-bold text-xl mt-1">
                    ${formatearNumero(featuredProduct.precioSugeridoUsd ?? featuredProduct.precioUSDT, 2)}
                  </p>
                </div>
                <div className="bg-[#eca413] text-black font-black px-6 py-2 rounded-lg text-sm uppercase shadow-lg active:scale-95 transition-transform">
                  VER +
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Masonry Grid Style (2 columns) */}
        <div className="grid grid-cols-2 gap-4 p-4 pb-24">
          {gridProducts.map((p, idx) => {
            // Alternate aspect ratios for visual interest
            const aspectClass = idx % 4 === 0 ? 'aspect-[4/5]' : idx % 4 === 1 ? 'aspect-[4/6]' : idx % 4 === 2 ? 'aspect-[4/6]' : 'aspect-[4/5]'
            const marginClass = idx % 4 === 1 ? 'mt-6' : idx % 4 === 2 ? '-mt-4' : idx % 4 === 3 ? 'mt-2' : ''
            const isHot = idx % 5 === 0

            return (
              <div key={p.id} className={`flex flex-col gap-2 ${marginClass}`}>
                <button
                  type="button"
                  onClick={() => onSelectProducto?.(p)}
                  className={`relative ${aspectClass} overflow-hidden rounded-xl border border-zinc-800 dark:border-zinc-700 w-full`}
                  aria-label={`Ver ${p.nombre || 'producto'}`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: p.imagenUrl
                        ? `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, rgba(0,0,0,0.7) 100%), url(${p.imagenUrl})`
                        : 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, rgba(0,0,0,0.7) 100%), linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  />
                  {isHot && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <div className="bg-red-600 text-white p-1 rounded-md">
                        <span className="text-sm block">🔥</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <p className="text-white text-sm font-black bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded inline-block">
                      ${formatearNumero(p.precioSugeridoUsd ?? p.precioUSDT, 2)}
                    </p>
                  </div>
                </button>
                <div className="px-1">
                  <h4 className="text-lg font-black uppercase italic tracking-tighter leading-none">
                    {p.nombre || 'SIN NOMBRE'}
                  </h4>
                  {p.categoria && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {p.categoria}
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {gridProducts.length === 0 && !featuredProduct && !cargando && (
            <div className="col-span-2 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No hay productos para mostrar.
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalItems > 0 && (
          <div className="pb-8">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* Loading State */}
        {cargando && (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#eca413] text-sm font-bold uppercase tracking-wider">
              Cargando...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CatalogTemplateUrbanStreet
