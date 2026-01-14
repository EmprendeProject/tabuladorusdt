import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export default function NuevaCategoriaModal({ open, onClose, onCreate, notify }) {
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setNombre('')
    setGuardando(false)
  }, [open])

  if (!open) return null

  const close = () => {
    if (guardando) return
    onClose?.()
  }

  const submit = async () => {
    const clean = String(nombre || '').trim()
    if (!clean) return

    setGuardando(true)
    try {
      const created = await onCreate?.(clean)
      if (typeof notify === 'function') {
        notify({ type: 'success', title: 'Categoría creada', message: clean })
      }
      onClose?.()
      return created
    } catch (e) {
      if (typeof notify === 'function') {
        notify({ type: 'error', title: 'Error', message: e?.message || 'No se pudo crear la categoría', durationMs: 7000 })
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
          <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Nueva categoría</h2>
            <button
              type="button"
              onClick={close}
              disabled={guardando}
              className="p-2 -mr-2 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </header>

          <div className="p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Damas"
              className="w-full rounded-xl border-gray-200 focus:ring-blue-600 focus:border-blue-600"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={guardando}
                className="px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={guardando || !String(nombre || '').trim()}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-slate-950 text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {guardando ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
