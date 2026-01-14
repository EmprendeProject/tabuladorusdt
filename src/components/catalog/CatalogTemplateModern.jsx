import { Bell, Search, SlidersHorizontal, User } from 'lucide-react'

const formatearNumero = (value, digits = 2) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const Chip = ({ active, children }) => {
  return (
    <div
      className={
        active
          ? 'flex h-9 shrink-0 items-center justify-center rounded-full bg-[#137fec] px-5 shadow-md shadow-blue-500/20'
          : 'flex h-9 shrink-0 items-center justify-center rounded-full bg-white px-5 border border-gray-100'
      }
    >
      <p className={active ? 'text-white text-sm font-semibold' : 'text-gray-700 text-sm font-medium'}>
        {children}
      </p>
    </div>
  )
}

const CatalogTemplateModern = ({
  productosFiltrados,
  query,
  setQuery,
  cargando,
  error,
  onReload,
  onSelectProducto,
  shopName = "Tu Tienda",
}) => {
  return (
    <div className="bg-[#f6f7f8] text-[#111418] min-h-screen font-[Inter,system-ui,Segoe_UI,Roboto,Helvetica,Arial,sans-serif]">
      <header className="sticky top-0 z-50 bg-[#f6f7f8]/80 backdrop-blur-md">
        <div className="flex items-center p-4 pb-2 justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#137fec]/10 flex items-center justify-center text-[#137fec]">
              <User size={18} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Welcome back,</p>
              <h1 className="text-lg font-bold leading-tight">{shopName}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="size-10 flex items-center justify-center rounded-full bg-white shadow-sm"
              title="Notificaciones"
              aria-label="Notificaciones"
            >
              <Bell size={18} className="text-gray-700" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2">
          <div className="flex w-full items-stretch rounded-xl h-11 shadow-sm overflow-hidden">
            <div className="text-gray-400 flex bg-white items-center justify-center pl-4">
              <Search size={18} />
            </div>
            <input
              className="flex w-full min-w-0 flex-1 text-sm bg-white placeholder:text-gray-400 px-4 pl-2 outline-none"
              placeholder="Search catalog..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="flex bg-white items-center justify-center pr-4 text-[#137fec]"
              title="Filtros"
              aria-label="Filtros"
              onClick={onReload}
              disabled={cargando}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Chip active>Featured</Chip>
          <Chip>New Tech</Chip>
          <Chip>Wearables</Chip>
          <Chip>Audio</Chip>
        </div>
      </header>

      <main className="px-4 pb-24">
        {error ? <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div> : null}

        <div
          style={{ columnCount: 2, columnGap: 12 }}
          aria-busy={cargando ? 'true' : 'false'}
        >
          {productosFiltrados.map((p, idx) => {
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

                  <div className="absolute bottom-14 right-3 size-9 bg-[#137fec] text-white rounded-full flex items-center justify-center shadow-lg">
                    +
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        {productosFiltrados.length === 0 && !cargando ? (
          <div className="mt-8 text-center text-sm text-gray-500">No hay productos para mostrar.</div>
        ) : null}
      </main>

      <div className="fixed bottom-24 right-6 z-40">
        <button
          type="button"
          className="flex items-center justify-center size-14 rounded-2xl bg-[#137fec] text-white shadow-2xl shadow-blue-500/40"
          title="Nuevo"
          aria-label="Nuevo"
          onClick={onReload}
        >
          +
        </button>
      </div>

      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 py-3 pb-8 flex justify-between items-center z-50">
        <button type="button" className="flex flex-col items-center gap-1 text-[#137fec]">
          <div className="h-5 w-5 rounded bg-[#137fec]/15" />
          <span className="text-[10px] font-bold">Catalog</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1 text-gray-400">
          <div className="h-5 w-5 rounded bg-gray-200/70" />
          <span className="text-[10px] font-medium">Stats</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1 text-gray-400">
          <div className="h-5 w-5 rounded bg-gray-200/70" />
          <span className="text-[10px] font-medium">Orders</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1 text-gray-400">
          <div className="h-5 w-5 rounded bg-gray-200/70" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>
    </div>
  )
}

export default CatalogTemplateModern
