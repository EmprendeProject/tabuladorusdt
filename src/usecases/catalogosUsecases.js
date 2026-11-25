import { productosRepository, PRODUCTOS_CHANGED_EVENT } from '../data/productosRepository'
import { categoriasRepository } from '../data/categoriasRepository'
import { catalogSettingsRepository } from '../data/catalogSettingsRepository'
import { tiendasRepository } from '../data/tiendasRepository'
import {
  copyProductImage,
  deleteStorageObject,
  getProductImagesBucketName,
  getStorageObjectFromPublicUrl,
} from '../lib/storage'

const emit = (onProgress, payload) => {
  if (typeof onProgress === 'function') onProgress(payload)
}

const normalizeName = (value) => String(value || '').trim().toLowerCase()

// Crea en el catálogo destino las categorías que usan los productos y aún no existen.
const asegurarCategorias = async ({ productos, toTiendaId }) => {
  const usadas = new Map()
  for (const p of productos) {
    const nombre = String(p?.categoria || '').trim()
    if (nombre) usadas.set(normalizeName(nombre), nombre)
  }
  if (!usadas.size) return

  const actuales = await categoriasRepository.listAll({ tiendaId: toTiendaId })
  const existentes = new Set(actuales.map((c) => normalizeName(c.nombre)))
  for (const [key, nombre] of usadas) {
    if (existentes.has(key)) continue
    try {
      await categoriasRepository.create({ nombre, tiendaId: toTiendaId })
    } catch {
      // No es crítico: el producto igual guarda su categoría como texto.
    }
  }
}

/**
 * Copia productos (con fotos propias) de un catálogo a otro.
 * - productIds: si se omite, copia todos los del catálogo origen.
 * - copiarApariencia: además copia tema, logo, color y preferencia de precio Bs.
 */
export const copiarProductosEntreCatalogos = async ({
  ownerId,
  fromTiendaId,
  toTiendaId,
  productIds,
  copiarApariencia = false,
  onProgress,
} = {}) => {
  if (!ownerId) throw new Error('No hay sesión activa.')
  if (!fromTiendaId || !toTiendaId) throw new Error('Selecciona el catálogo origen y destino.')
  if (fromTiendaId === toTiendaId) throw new Error('El catálogo origen y destino deben ser distintos.')

  const result = { copiados: 0, errors: [], warnings: [] }

  emit(onProgress, { label: 'Leyendo productos…', done: 0, total: 0 })
  const origen = await productosRepository.listAll(ownerId, { tiendaId: fromTiendaId })
  const ids = Array.isArray(productIds) ? new Set(productIds) : null
  const seleccion = ids ? origen.filter((p) => ids.has(p.id)) : origen

  for (let i = 0; i < seleccion.length; i += 1) {
    const p = seleccion[i]
    emit(onProgress, { label: 'Copiando productos…', done: i, total: seleccion.length })

    const productKey = `copia-${Date.now()}-${i}`
    const imagenes = []
    for (const url of p.imagenes || []) {
      try {
        const { publicUrl } = await copyProductImage({ publicUrl: url, ownerId, productKey })
        imagenes.push(publicUrl)
      } catch (e) {
        result.warnings.push(`"${p.nombre}": no se pudo copiar una foto (${e?.message || 'error'}).`)
      }
    }

    try {
      await productosRepository.create({
        nombre: p.nombre,
        descripcion: p.descripcion,
        categoria: p.categoria,
        precioUSDT: p.precioUSDT,
        profit: p.profit,
        isFixedPrice: p.isFixedPrice,
        activo: p.activo,
        destacado: p.destacado,
        imagenes,
        ownerId,
        tiendaId: toTiendaId,
      })
      result.copiados += 1
    } catch (e) {
      result.errors.push(`"${p.nombre}": ${e?.message || 'no se pudo copiar'}.`)
    }
  }

  emit(onProgress, { label: 'Creando categorías…', done: seleccion.length, total: seleccion.length })
  await asegurarCategorias({ productos: seleccion, toTiendaId }).catch(() => {})

  if (copiarApariencia) {
    try {
      await catalogSettingsRepository.copySettings({ fromTiendaId, toTiendaId, ownerId })
    } catch (e) {
      result.warnings.push(`No se pudo copiar la apariencia (${e?.message || 'error'}).`)
    }
  }

  emit(onProgress, { label: 'Listo', done: seleccion.length, total: seleccion.length })
  globalThis.dispatchEvent?.(new Event(PRODUCTOS_CHANGED_EVENT))
  return result
}

/** Mueve productos a otro catálogo (salen del origen; las fotos no se duplican). */
export const moverProductosEntreCatalogos = async ({ ownerId, fromTiendaId, toTiendaId, productIds } = {}) => {
  if (!ownerId) throw new Error('No hay sesión activa.')
  if (!fromTiendaId || !toTiendaId) throw new Error('Selecciona el catálogo origen y destino.')
  if (fromTiendaId === toTiendaId) throw new Error('El catálogo origen y destino deben ser distintos.')

  const origen = await productosRepository.listAll(ownerId, { tiendaId: fromTiendaId })
  const ids = Array.isArray(productIds) ? new Set(productIds) : null
  const seleccion = ids ? origen.filter((p) => ids.has(p.id)) : origen

  const movidos = await productosRepository.moveToTienda(seleccion.map((p) => p.id), toTiendaId)
  await asegurarCategorias({ productos: seleccion, toTiendaId }).catch(() => {})

  globalThis.dispatchEvent?.(new Event(PRODUCTOS_CHANGED_EVENT))
  return { movidos }
}

/** Borra un catálogo extra junto con las fotos de sus productos. */
export const eliminarCatalogo = async ({ ownerId, tiendaId } = {}) => {
  if (!ownerId || !tiendaId) throw new Error('Catálogo inválido.')

  const productos = await productosRepository.listAll(ownerId, { tiendaId })
  const bucket = getProductImagesBucketName()
  const allowedPrefix = `productos/${String(ownerId)}/`

  for (const p of productos) {
    for (const url of p.imagenes || []) {
      const meta = getStorageObjectFromPublicUrl(url)
      if (!meta || meta.bucket !== bucket || !String(meta.path || '').startsWith(allowedPrefix)) continue
      await deleteStorageObject(meta).catch(() => {})
    }
  }

  // Productos, categorías y ajustes se borran en cascada en la BD.
  await tiendasRepository.removeById(tiendaId)
  globalThis.dispatchEvent?.(new Event(PRODUCTOS_CHANGED_EVENT))
}
