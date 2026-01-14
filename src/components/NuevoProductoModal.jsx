import { useEffect, useMemo, useState } from 'react'
import { DollarSign, Plus, RefreshCw, Trash2, X } from 'lucide-react'

const formatMoney = (value) => {
  const num = Number(value) || 0
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export default function NuevoProductoModal({
  open,
  onClose,
  onCreate,
  notify,
  tasaBCV,
  tasaUSDT,
  cargandoBCV,
  cargandoUSDT,
  refrescarBCV,
  refrescarUSDT,
  uploadImage,
}) {
  const [draftId, setDraftId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('Damas')

  const [precioUSDT, setPrecioUSDT] = useState('')
  const [profit, setProfit] = useState(40)

  const [imagenUrl, setImagenUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const [step, setStep] = useState(1)
  const [guardando, setGuardando] = useState(false)

  const tasaBCVNum = useMemo(() => parseFloat(tasaBCV) || 0, [tasaBCV])
  const tasaUSDTNum = useMemo(() => parseFloat(tasaUSDT) || 0, [tasaUSDT])
  const costoUSDTNum = useMemo(() => parseFloat(precioUSDT) || 0, [precioUSDT])

  const costoBsAprox = useMemo(() => {
    if (!tasaBCVNum) return 0
    return costoUSDTNum * tasaBCVNum
  }, [costoUSDTNum, tasaBCVNum])

  const precioRealBCVUsd = useMemo(() => {
    if (!tasaBCVNum) return 0
    return (costoUSDTNum * (tasaUSDTNum || 0)) / tasaBCVNum
  }, [costoUSDTNum, tasaBCVNum, tasaUSDTNum])

  const precioVentaUsd = useMemo(() => {
    return precioRealBCVUsd * (1 + (Number(profit) || 0) / 100)
  }, [precioRealBCVUsd, profit])

  useEffect(() => {
    if (!open) return

    // crear un draftId estable por apertura
    const id = -(Date.now())
    setDraftId(id)
    setNombre('')
    setDescripcion('')
    setCategoria('Damas')
    setPrecioUSDT('')
    setProfit(40)
    setImagenUrl('')
    setPreviewUrl('')
    setSubiendo(false)
    setStep(1)
    setGuardando(false)
  }, [open])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (!open) return null

  const canGoNext = () => {
    if (step === 1) return (nombre || '').trim().length > 0
    return true
  }

  const handleClose = () => {
    if (guardando || subiendo) return
    onClose?.()
  }

  const handleFileSelected = async (file) => {
    if (!file || !draftId) return

    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextPreviewUrl
    })

    try {
      setSubiendo(true)
      const { publicUrl } = await uploadImage(draftId, file)
      setImagenUrl(publicUrl)
    } catch (e) {
      console.error('Error subiendo imagen:', e)
      if (typeof notify === 'function') {
        notify({
          type: 'error',
          title: 'Error',
          message: 'No se pudo subir la imagen: ' + (e?.message || 'Desconocido'),
          durationMs: 6000,
        })
      } else {
        alert('No se pudo subir la imagen: ' + (e?.message || 'Desconocido'))
      }
      setImagenUrl('')
    } finally {
      setSubiendo(false)
    }
  }

  const handleRemoveImage = () => {
    if (subiendo || guardando) return
    setImagenUrl('')
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }

  const handleSave = async () => {
    if (!draftId) return
    if (!(nombre || '').trim()) {
      setStep(1)
      return
    }

    setGuardando(true)
    try {
      await onCreate({
        id: draftId,
        nombre: nombre.trim(),
        descripcion,
        categoria,
        imagenUrl,
        activo: true,
        precioUSDT: costoUSDTNum,
        profit: Number(profit) || 0,
      })
      if (typeof notify === 'function') {
        notify({ type: 'success', title: 'Creado', message: 'Producto guardado.' })
      }
      onClose?.()
    } catch (e) {
      console.error('Error creando producto:', e)
      if (typeof notify === 'function') {
        notify({
          type: 'error',
          title: 'Error',
          message: 'No se pudo guardar el producto: ' + (e?.message || 'Desconocido'),
          durationMs: 7000,
        })
      } else {
        alert('No se pudo guardar el producto: ' + (e?.message || 'Desconocido'))
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className="absolute inset-x-0 top-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full h-full md:h-auto md:max-h-[85vh] md:max-w-md bg-gray-50 md:rounded-2xl overflow-hidden md:border md:border-gray-200 md:shadow-2xl flex flex-col min-h-0">
          <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              disabled={guardando || subiendo}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Nuevo Producto</h1>
            <div className="w-10" />
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] max-w-md mx-auto w-full p-4 space-y-6 pb-[calc(10rem+env(safe-area-inset-bottom))]">
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <h2 className="font-bold text-gray-700">Información Básica</h2>
              </div>

              <div className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Nombre del Producto</label>
                  <input
                    className="w-full rounded-xl border-gray-200 bg-white focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Ej. Jeans Brillo"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Descripción</label>
                  <textarea
                    className="w-full rounded-xl border-gray-200 bg-white focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Detalles del producto…"
                    rows={3}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Categoría</label>
                  <select
                    className="w-full rounded-xl border-gray-200 bg-white focus:ring-blue-600 focus:border-blue-600"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    <option>Damas</option>
                    <option>Caballeros</option>
                    <option>Accesorios</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <h2 className="font-bold text-gray-700">Multimedia</h2>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    {previewUrl || imagenUrl ? (
                      <img
                        alt="Vista previa"
                        className="w-full h-full object-cover"
                        src={previewUrl || imagenUrl}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        Sin imagen
                      </div>
                    )}

                    {previewUrl || imagenUrl ? (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-lg"
                        aria-label="Quitar imagen"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>

                  <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={subiendo || guardando}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelected(file)
                        e.target.value = ''
                      }}
                    />
                    <Plus size={18} />
                    <span className="text-[10px] mt-1 font-medium">Subir</span>
                    {subiendo ? (
                      <span className="mt-1 text-[10px] text-blue-600 animate-pulse">Subiendo…</span>
                    ) : null}
                  </label>
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                  <span>Formatos: JPG/PNG</span>
                  <span>•</span>
                  <span>Máx 5MB</span>
                </div>
              </div>
            </section>

            <section className="space-y-4 pb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <h2 className="font-bold text-gray-700">Precios y Ganancia</h2>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Costo (USDT)</label>
                    <p className="text-[10px] text-gray-400">Precio de compra base</p>
                  </div>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      className="w-full pl-7 pr-3 py-2 rounded-xl border-gray-200 bg-white text-right font-semibold"
                      inputMode="decimal"
                      type="text"
                      value={precioUSDT}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || /^\d*\.?\d*$/.test(value)) setPrecioUSDT(value)
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <DollarSign size={14} className="text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium truncate">
                      Tasa BCV hoy: {tasaBCVNum ? formatMoney(tasaBCVNum) : '—'} Bs.
                    </span>
                    {cargandoBCV ? <span className="text-[10px] text-blue-600 animate-pulse">Cargando…</span> : null}
                  </div>
                  <span className="text-xs font-bold text-blue-700">Bs. {formatMoney(costoBsAprox)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        refrescarBCV?.()
                        refrescarUSDT?.()
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <RefreshCw size={16} className={(cargandoBCV || cargandoUSDT) ? 'animate-spin' : ''} />
                      Actualizar tasas
                    </button>
                  </div>
                  <div className="text-[11px] text-gray-500 text-right">
                    USDT: {tasaUSDTNum ? formatMoney(tasaUSDTNum) : '—'} Bs.
                    {cargandoUSDT ? <span className="ml-1 text-[10px] text-gray-400 animate-pulse">Cargando…</span> : null}
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-600">Margen de Ganancia (%)</label>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                      {Math.round(profit)}%
                    </span>
                  </div>

                  <input
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    max={100}
                    min={0}
                    type="range"
                    value={profit}
                    onChange={(e) => setProfit(clamp(Number(e.target.value) || 0, 0, 100))}
                  />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  <span className="text-base font-bold text-gray-800">Precio de Venta:</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-500">${formatMoney(precioVentaUsd)}</div>
                    <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Monto final sugerido</div>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <div className="sticky bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/90 backdrop-blur border-t border-gray-200 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={guardando || subiendo}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              {guardando ? 'Guardando…' : 'Guardar Producto'}
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={guardando || subiendo}
              className="w-full py-3 text-gray-500 font-medium text-sm hover:text-gray-700 disabled:opacity-50"
            >
              Descartar Cambios
            </button>

            <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
              <span>Paso {step}/3</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep((s) => clamp(s - 1, 1, 3))}
                  className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                  disabled={step === 1 || guardando || subiendo}
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setStep((s) => clamp(s + 1, 1, 3))}
                  className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                  disabled={step === 3 || !canGoNext() || guardando || subiendo}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
