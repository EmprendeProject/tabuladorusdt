import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { categoriasRepository } from '../../data/categoriasRepository'

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
          ? 'flex flex-col items-center justify-center border-b-2 border-[#111318] pb-[10px] pt-4 whitespace-nowrap'
          : 'flex flex-col items-center justify-center border-b-2 border-transparent text-[#636c88] pb-[10px] pt-4 whitespace-nowrap'
      }
    >
      <p className="text-sm font-medium tracking-widest uppercase">{children}</p>
    </button>
  )
}

const CatalogTemplateBoutique = ({
  productosFiltrados,
  query,
  setQuery,
  cargando,
  error,
  brandName = 'Boutique',
}) => {
  const [categorias, setCategorias] = useState([])
  const [cargandoCategorias, setCargandoCategorias] = useState(true)
  const [categoriasError, setCategoriasError] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('')
  const [busquedaVisible, setBusquedaVisible] = useState(false)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      setCategoriasError('')
      setCargandoCategorias(true)
      try {
        const rows = await categoriasRepository.listAll()
        if (mounted) setCategorias(Array.isArray(rows) ? rows : [])
      } catch (e) {
        if (mounted) {
          setCategorias([])
          setCategoriasError(e?.message || 'No se pudieron cargar las categorías')
        }
      } finally {
        if (mounted) setCargandoCategorias(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!busquedaVisible) return
    const t = window.setTimeout(() => {
      const el = document.getElementById('catalog-boutique-search')
      el?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [busquedaVisible])

  const productosFiltradosMaison = useMemo(() => {
    const list = Array.isArray(productosFiltrados) ? productosFiltrados : []
    if (!categoriaActiva) return list
    return list.filter((p) => (p?.categoria || '').trim() === categoriaActiva)
  }, [productosFiltrados, categoriaActiva])

  return (
    <div className="bg-[#fdfcfb] text-[#111318] min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-[#fdfcfb]">
        <header className="sticky top-0 z-50 flex items-center bg-[#fdfcfb]/90 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100">
          <div className="size-12 shrink-0" aria-hidden="true" />

          <h1 className="text-[#111318] text-2xl italic leading-tight tracking-tight flex-1 text-center font-[Newsreader,serif]">
            {brandName}
          </h1>

          <div className="flex w-12 items-center justify-end">
            <button
              type="button"
              className="flex cursor-pointer items-center justify-center overflow-hidden rounded h-12 bg-transparent text-[#111318]"
              title="Buscar"
              aria-label="Buscar"
              onClick={() => {
                setBusquedaVisible((v) => !v)
              }}
            >
              <Search size={22} />
            </button>
          </div>
        </header>

        <nav className="pb-1 bg-[#fdfcfb]">
          <div className="flex border-b border-[#dcdee5] px-4 gap-8 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <Tab active={!categoriaActiva} onClick={() => setCategoriaActiva('')}>Todo</Tab>
            {cargandoCategorias ? (
              <div className="flex items-center text-xs text-[#636c88] py-4">Cargando categorías…</div>
            ) : null}
            {categorias.map((c) => (
              <Tab
                key={c.id}
                active={categoriaActiva === c.nombre}
                onClick={() => setCategoriaActiva(c.nombre)}
              >
                {c.nombre}
              </Tab>
            ))}
          </div>
        </nav>

        <main className="flex flex-col gap-6 py-5">
          <div className="px-4">
            {busquedaVisible ? (
              <div className="flex items-center gap-2">
                <input
                  id="catalog-boutique-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setBusquedaVisible(false)
                  }}
                  placeholder="Buscar producto…"
                  className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() => setBusquedaVisible(false)}
                  className="shrink-0 text-xs text-[#1745cf] font-bold uppercase tracking-[0.2em]"
                  aria-label="Cerrar búsqueda"
                  title="Cerrar"
                >
                  Cerrar
                </button>
              </div>
            ) : null}

          </div>

          {error ? <div className="mx-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div> : null}
          {categoriasError ? (
            <div className="mx-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
              {categoriasError}
            </div>
          ) : null}

          <div className="flex flex-col gap-8 pb-6">
            {productosFiltradosMaison.map((p) => (
              <div key={p.id} className="px-4">
                <div className="flex flex-col items-stretch justify-start rounded-lg overflow-hidden">
                  {p.imagenUrl ? (
                    <div className="w-full aspect-[4/5] overflow-hidden rounded-lg shadow-sm bg-gray-100">
                      <img
                        src={p.imagenUrl}
                        alt={p.nombre || 'Imagen del producto'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/5] rounded-lg shadow-sm bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                      Sin foto
                    </div>
                  )}

                  <div className="flex w-full flex-col items-start justify-center gap-2 py-5 px-1">
                    <div className="flex justify-between w-full items-baseline gap-4">
                      <p className="text-[#111318] text-2xl font-medium tracking-tight font-[Newsreader,serif] truncate">
                        {p.nombre || 'Sin nombre'}
                      </p>
                      <p className="text-[#111318] text-lg italic font-[Newsreader,serif] shrink-0">
                        ${formatearNumero(p.precioSugeridoUsd ?? p.precioUSDT, 2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {productosFiltradosMaison.length === 0 && !cargando ? (
              <div className="px-4 text-center text-sm text-[#636c88]">No hay productos para mostrar.</div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}

export default CatalogTemplateBoutique
