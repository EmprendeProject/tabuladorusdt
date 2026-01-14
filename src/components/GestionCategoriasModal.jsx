import { useMemo, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'

export default function GestionCategoriasModal({
  open,
  onClose,
  categorias,
  onCreate,
  onDelete,
  guardando,
  eliminandoId,
  notify,
}) {
  const [nombre, setNombre] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const close = () => {
    if (guardando) return
    if (eliminandoId) return
    setNombre('')
    setBusqueda('')
    onClose?.()
  }

  const submit = async () => {
    const clean = String(nombre || '').trim()
    if (!clean) return

    try {
      await onCreate?.(clean)
      if (typeof notify === 'function') {
        notify({ type: 'success', title: 'Categoría creada', message: clean })
      }
      setNombre('')
    } catch (e) {
      if (typeof notify === 'function') {
        notify({
          type: 'error',
          title: 'Error',
          message: e?.message || 'No se pudo crear la categoría',
          durationMs: 7000,
        })
      }
    }
  }

  const categoriasFiltradas = useMemo(() => {
    const list = Array.isArray(categorias) ? categorias : []
    const q = String(busqueda || '').trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => String(c?.nombre || '').toLowerCase().includes(q))
  }, [categorias, busqueda])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
          <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Gestionar categorías</h2>
            <button
              type="button"
              onClick={close}
              disabled={guardando || !!eliminandoId}
              className="p-2 -mr-2 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </header>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nueva categoría</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Damas"
                    className="flex-1 rounded-xl border-gray-200 focus:ring-blue-600 focus:border-blue-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submit()
                      if (e.key === 'Escape') close()
                    }}
                  />
                  <button
                    type="button"
                    onClick={submit}
                    disabled={guardando || !String(nombre || '').trim()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-950 text-white hover:bg-slate-900 disabled:opacity-50"
                    title="Crear"
                  >
                    <Plus size={18} />
                    Crear
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Filtrar categorías…"
                  className="w-full rounded-xl border-gray-200 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="mt-1 rounded-2xl border border-gray-200 overflow-hidden">
                <div className="max-h-72 overflow-auto">
                  {categoriasFiltradas.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No hay categorías.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {categoriasFiltradas.map((c) => {
                        const isDeleting = String(eliminandoId || '') === String(c?.id || '')
                        return (
                          <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</div>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const nombreCat = c?.nombre ? `“${c.nombre}”` : 'esta categoría'
                                const ok = window.confirm(
                                  `¿Eliminar ${nombreCat}? Los productos que ya tengan esa categoría seguirán guardados con el texto, pero ya no aparecerá en la lista.`
                                )
                                if (!ok) return

                                try {
                                  await onDelete?.(c.id)
                                  if (typeof notify === 'function') {
                                    notify({ type: 'success', title: 'Categoría eliminada', message: c.nombre })
                                  }
                                } catch (e) {
                                  if (typeof notify === 'function') {
                                    notify({
                                      type: 'error',
                                      title: 'Error',
                                      message: e?.message || 'No se pudo eliminar la categoría',
                                      durationMs: 7000,
                                    })
                                  }
                                }
                              }}
                              disabled={guardando || !!eliminandoId}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                              {isDeleting ? 'Eliminando…' : 'Eliminar'}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={guardando || !!eliminandoId}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
