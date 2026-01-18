import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, DollarSign, Plus, RefreshCw, Trash2, X } from 'lucide-react'

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
  categorias,
  onCreateCategoria,
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
  const [categoria, setCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')

  const [precioUSDT, setPrecioUSDT] = useState('')
  const [profit, setProfit] = useState(40)
  const [isFixedPrice, setIsFixedPrice] = useState(false)

  // Asegura que profit siempre esté entre 0 y 200
  useEffect(() => {
    if (profit < 0) setProfit(0)
    else if (profit > 200) setProfit(200)
  }, [profit])

  const [imagenes, setImagenes] = useState([]) // array de URLs públicas (máx 3)
  const [previewUrls, setPreviewUrls] = useState([]) // object URLs para preview inmediato
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
    if (isFixedPrice) return costoUSDTNum
    return precioRealBCVUsd * (1 + (Number(profit) || 0) / 100)
  }, [precioRealBCVUsd, profit, isFixedPrice, costoUSDTNum])

  useEffect(() => {
    if (!open) return

    // crear un draftId estable por apertura
    const id = -(Date.now())
    setDraftId(id)
    setNombre('')
    setDescripcion('')
    setCategoria('')
    setCreandoCategoria(false)
    setNuevaCategoria('')
    setPrecioUSDT('')
    setProfit(40)
    setIsFixedPrice(false)
    setImagenes([])
    setPreviewUrls([])
    setSubiendo(false)
    setStep(1)
    setGuardando(false)
  }, [open])

  useEffect(() => {
    return () => {
      for (const u of previewUrls) {
        try {
          if (u) URL.revokeObjectURL(u)
        } catch {
          // noop
        }
      }
    }
  }, [previewUrls])

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
    if (imagenes.length >= 3) {
      if (typeof notify === 'function') {
        notify({ type: 'warning', title: 'Límite', message: 'Máximo 3 fotos por producto.' })
      }
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrls((prev) => [...prev, nextPreviewUrl])

    try {
      setSubiendo(true)
      const { publicUrl } = await uploadImage(draftId, file)
      setImagenes((prev) => {
        const next = [...prev, publicUrl].filter(Boolean).slice(0, 3)
        return next
      })
    } catch (e) {
      console.error('Error subiendo imagen:', e)
      // quitar el último preview si falla
      setPreviewUrls((prev) => {
        const next = [...prev]
        const last = next.pop()
        if (last) URL.revokeObjectURL(last)
        return next
      })

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
    } finally {
      setSubiendo(false)
    }
  }

  const handleRemoveImageAt = (idx) => {
    if (subiendo || guardando) return
    setImagenes((prev) => prev.filter((_, i) => i !== idx))
    setPreviewUrls((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      const removed = prev[idx]
      if (removed) {
        try {
          URL.revokeObjectURL(removed)
        } catch {
          // noop
        }
      }
      return next
    })
  }

  const moveImage = (fromIdx, direction) => {
    if (subiendo || guardando) return
    const toIdx = fromIdx + (direction === 'left' ? -1 : 1)
    if (toIdx < 0 || toIdx > 2) return

    setImagenes((prev) => {
      const next = [...prev]
      if (fromIdx >= next.length || toIdx >= next.length) return prev
      ;[next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]]
      return next
    })
    setPreviewUrls((prev) => {
      const next = [...prev]
      if (fromIdx >= next.length || toIdx >= next.length) return prev
      ;[next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]]
      return next
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
        imagenUrl: imagenes?.[0] || '',
        imagenes,
        activo: true,
        precioUSDT: costoUSDTNum,
        profit: isFixedPrice ? 0 : (Number(profit) || 0),
        isFixedPrice,
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
                  <div className="flex items-center gap-2">
                    <select
                      className="flex-1 rounded-xl border-gray-200 bg-white focus:ring-blue-600 focus:border-blue-600"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                    >
                      <option value="">Sin categoría</option>
                      {(categorias || []).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    {typeof onCreateCategoria === 'function' ? (
                      <button
                        type="button"
                        onClick={() => setCreandoCategoria((v) => !v)}
                        className="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                      >
                        Nueva
                      </button>
                    ) : null}
                  </div>

                  {creandoCategoria && typeof onCreateCategoria === 'function' ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={nuevaCategoria}
                        onChange={(e) => setNuevaCategoria(e.target.value)}
                        placeholder="Nombre de categoría"
                        className="flex-1 rounded-xl border-gray-200 bg-white focus:ring-blue-600 focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const clean = String(nuevaCategoria || '').trim()
                          if (!clean) return
                          try {
                            await onCreateCategoria(clean)
                            setCategoria(clean)
                            setNuevaCategoria('')
                            setCreandoCategoria(false)
                          } catch {
                            // errores se notifican desde el dashboard/modal
                          }
                        }}
                        disabled={!String(nuevaCategoria || '').trim()}
                        className="px-3 py-2 rounded-xl text-sm font-semibold bg-slate-950 text-white hover:bg-slate-900 disabled:opacity-50"
                      >
                        Crear
                      </button>
                    </div>
                  ) : null}
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
                  {[0, 1, 2].map((idx) => {
                    const url = imagenes[idx]
                    const preview = previewUrls[idx]
                    const src = url || preview

                    // Slot vacío: lo usamos como botón de subir (solo el primero vacío y si hay cupo)
                    if (!src) {
                      const canUploadHere = idx === imagenes.length && imagenes.length < 3
                      return (
                        <div key={idx} className="aspect-square">
                          {canUploadHere ? (
                            <label className="h-full w-full rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
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
                          ) : (
                            <div className="h-full w-full rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-xs">
                              Vacío
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                        <img alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" src={src} />

                        <div className="absolute top-1 left-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 'left')}
                            disabled={idx === 0 || subiendo || guardando}
                            className="rounded-full bg-white/90 text-gray-800 shadow p-1 disabled:opacity-40"
                            title="Mover a la izquierda"
                            aria-label="Mover a la izquierda"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 'right')}
                            disabled={idx === imagenes.length - 1 || subiendo || guardando}
                            className="rounded-full bg-white/90 text-gray-800 shadow p-1 disabled:opacity-40"
                            title="Mover a la derecha"
                            aria-label="Mover a la derecha"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveImageAt(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-lg"
                          aria-label={`Quitar foto ${idx + 1}`}
                          title="Quitar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                  <span>Formatos: JPG/PNG</span>
                  <span>•</span>
                  <span>Máx 5MB</span>
                  <span>•</span>
                  <span>Máx 3 fotos</span>
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
                <div className="flex p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsFixedPrice(false)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      !isFixedPrice ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Variable (Calculadora)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFixedPrice(true)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      isFixedPrice ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Fijo
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">
                      {isFixedPrice ? 'Precio de Venta (USD)' : 'Costo (USDT)'}
                    </label>
                    <p className="text-[10px] text-gray-400">
                      {isFixedPrice ? 'Monto final que verá el cliente' : 'Precio de compra base'}
                    </p>
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

                {!isFixedPrice && (
                  <>
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
                        <label className="text-sm font-medium text-gray-600">Margen de Ganancia (0–200%)</label>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                          {Math.round(profit)}%
                        </span>
                      </div>

                      <input
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        max={200}
                        min={0}
                        type="range"
                        value={profit}
                        onChange={(e) => setProfit(clamp(Number(e.target.value) || 0, 0, 200))}
                      />
                    </div>
                  </>
                )}

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
