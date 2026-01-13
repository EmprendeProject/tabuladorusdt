import { RefreshCw, Search, Package } from 'lucide-react'

const formatearNumero = (value, digits = 2) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const CatalogTemplateSimple = ({
  productos,
  productosFiltrados,
  query,
  setQuery,
  cargando,
  error,
  onReload,
}) => {
  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-blue-600" /> Catálogo de Productos
          </h1>

          <div className="flex gap-2">
            <button
              onClick={onReload}
              disabled={cargando}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm disabled:opacity-50"
              title="Actualizar productos"
            >
              <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <label className="text-sm font-medium text-gray-700">Buscar</label>
            <div className="mt-2 relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej: papa chip..."
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Mostrando {productosFiltrados.length} de {productos.length} productos
            </p>
          </div>
        </div>

        {error ? <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div> : null}

        {cargando ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-600">
            <RefreshCw className="animate-spin mx-auto mb-3" size={32} />
            Cargando catálogo…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productosFiltrados.map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {p.imagenUrl ? (
                  <img
                    src={p.imagenUrl}
                    alt={p.nombre || 'Imagen del producto'}
                    className="w-full h-44 object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-44 bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                    Sin foto
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{p.nombre || 'Sin nombre'}</h3>
                  <p className="mt-2 text-xl font-extrabold text-gray-900">${formatearNumero(p.precioUSDT, 2)}</p>
                </div>
              </div>
            ))}

            {productosFiltrados.length === 0 ? (
              <div className="sm:col-span-2 lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-600">
                No hay productos que coincidan con la búsqueda.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default CatalogTemplateSimple
