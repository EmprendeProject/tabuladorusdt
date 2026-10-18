import { useRef, useState } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'

// Carga diferida: fflate y la lógica de respaldo solo se descargan cuando se usa esta función.
const loadBackup = () => import('../usecases/productosBackupUsecases')

// Sección compacta para descargar/cargar todos los productos (CSV + imágenes en un .zip).
const RespaldoProductos = ({ ownerId }) => {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(null) // 'export' | 'import' | null
  const [progress, setProgress] = useState('')
  const [message, setMessage] = useState(null) // { type: 'ok' | 'error', text, details: string[] }

  const onProgress = ({ label, done, total }) => {
    setProgress(total ? `${label} ${done}/${total}` : label)
  }

  const handleExport = async () => {
    setMessage(null)
    setBusy('export')
    setProgress('Preparando archivo…')
    try {
      const { exportarProductos, downloadBlob } = await loadBackup()
      const { blob, filename, total, imageFailures } = await exportarProductos({ ownerId, onProgress })
      downloadBlob(blob, filename)
      setMessage({
        type: 'ok',
        text: `Descargaste ${total} producto${total === 1 ? '' : 's'}.`,
        details: imageFailures ? [`${imageFailures} imagen(es) no se pudieron descargar.`] : [],
      })
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'No se pudo descargar tus productos.', details: [] })
    } finally {
      setBusy(null)
      setProgress('')
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setMessage(null)
    setBusy('import')
    setProgress('Revisando archivo…')
    try {
      const { analizarImportacion, ejecutarImportacion } = await loadBackup()
      const plan = await analizarImportacion({ file, ownerId })

      if (plan.items.length === 0) {
        setMessage({ type: 'error', text: 'No hay productos válidos para cargar.', details: plan.errors })
        return
      }

      const ok = window.confirm(
        `Se crearán ${plan.crear} producto(s) nuevo(s) y se actualizarán ${plan.actualizar} existente(s) (se identifican por nombre).` +
          (plan.errors.length ? `\n${plan.errors.length} fila(s) con errores se omitirán.` : '') +
          '\n\n¿Continuar?'
      )
      if (!ok) return

      const res = await ejecutarImportacion({ plan, ownerId, onProgress })
      setMessage({
        type: res.errors.length && !res.creados && !res.actualizados ? 'error' : 'ok',
        text: `Listo: ${res.creados} creado(s), ${res.actualizados} actualizado(s)${res.errors.length ? `, ${res.errors.length} con error` : ''}.`,
        details: [...res.errors, ...res.warnings],
      })
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'No se pudo cargar el archivo.', details: [] })
    } finally {
      setBusy(null)
      setProgress('')
    }
  }

  const handleTemplate = async () => {
    const { generarPlantilla, downloadBlob } = await loadBackup()
    const { blob, filename } = generarPlantilla()
    downloadBlob(blob, filename)
  }

  const btn =
    'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none'

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Tus productos</label>
      <p className="mt-0.5 text-xs text-gray-500">
        Descarga todo tu catálogo (con precios e imágenes) o cárgalo en bloque desde un archivo.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleExport} disabled={Boolean(busy)} className={btn}>
          {busy === 'export' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Descargar
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)} className={btn}>
          {busy === 'import' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Cargar
        </button>
        <button
          type="button"
          onClick={handleTemplate}
          disabled={Boolean(busy)}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline disabled:opacity-50"
        >
          Plantilla
        </button>
        <input ref={fileRef} type="file" accept=".zip,.csv" className="sr-only" onChange={handleFile} />
      </div>

      {progress ? <p className="mt-2 text-xs text-gray-500">{progress}</p> : null}

      {message ? (
        <div
          className={`mt-2 rounded-xl border px-3 py-2 text-xs ${
            message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <div className="font-medium">{message.text}</div>
          {message.details?.length ? (
            <details className="mt-1">
              <summary className="cursor-pointer">Ver detalles ({message.details.length})</summary>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto">
                {message.details.slice(0, 50).map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default RespaldoProductos
