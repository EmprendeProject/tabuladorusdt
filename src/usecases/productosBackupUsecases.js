import { strFromU8, strToU8, unzip, zip } from 'fflate'
import { productosRepository, PRODUCTOS_CHANGED_EVENT } from '../data/productosRepository'
import { categoriasRepository } from '../data/categoriasRepository'
import {
  deleteStorageObject,
  getProductImagesBucketName,
  getStorageObjectFromPublicUrl,
  uploadProductImage,
} from '../lib/storage'
import { boolToCell, formatDecimal, parseBool, parseCsv, parseDecimal, toCsv } from '../lib/productosCsv'


const MAX_FILE_BYTES = 150 * 1024 * 1024
const MAX_ROWS = 5000
const MAX_IMAGES = 3

const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim())

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const lastSegment = (pathLike) => {
  const clean = String(pathLike || '').split('?')[0].split('#')[0]
  const seg = clean.split('/').filter(Boolean).pop() || ''
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

const getExt = (name) => {
  const m = String(name || '').match(/\.([a-zA-Z0-9]+)$/)
  return m ? m[1].toLowerCase() : ''
}

const zipAsync = (files) =>
  new Promise((resolve, reject) => {
    zip(files, (err, data) => (err ? reject(err) : resolve(data)))
  })

const unzipAsync = (bytes) =>
  new Promise((resolve, reject) => {
    unzip(bytes, (err, data) => (err ? reject(err) : resolve(data)))
  })

const emit = (onProgress, payload) => {
  if (typeof onProgress === 'function') onProgress(payload)
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const todayStamp = () => new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// EXPORTAR
// ---------------------------------------------------------------------------

export const exportarProductos = async ({ ownerId, tiendaId, onProgress } = {}) => {
  const productos = await productosRepository.listAll(ownerId, { tiendaId })
  if (productos.length === 0) throw new Error('Aún no tienes productos para descargar.')

  const files = {}
  const usedNames = new Set()
  const rows = []
  let imageFailures = 0

  for (let i = 0; i < productos.length; i += 1) {
    const p = productos[i]
    emit(onProgress, { label: 'Preparando archivo…', done: i, total: productos.length })

    const urls = (Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes : p.imagenUrl ? [p.imagenUrl] : [])
      .filter(Boolean)
      .slice(0, MAX_IMAGES)

    const cells = await Promise.all(
      urls.map(async (url, idx) => {
        // Nombre estable: el archivo en Storage (uuid.webp). Al re-importar permite reconocer
        // imágenes que ya existen y evitar subirlas de nuevo.
        const obj = getStorageObjectFromPublicUrl(url)
        const ext = getExt(lastSegment(obj?.path || url)) || 'webp'
        let name = obj ? lastSegment(obj.path) : `producto-${i + 1}-${idx + 1}.${ext}`
        if (!obj && usedNames.has(name)) name = `producto-${i + 1}-${idx + 1}-${Date.now()}.${ext}`

        if (!usedNames.has(name)) {
          try {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const bytes = new Uint8Array(await res.arrayBuffer())
            files[`imagenes/${name}`] = [bytes, { level: 0 }]
            usedNames.add(name)
          } catch {
            imageFailures += 1
            return ''
          }
        }
        return name
      })
    )

    rows.push({
      nombre: p.nombre,
      descripcion: p.descripcion,
      categoria: p.categoria,
      precio_usdt: formatDecimal(p.precioUSDT),
      profit_porcentaje: formatDecimal(p.profit),
      precio_fijo: boolToCell(p.isFixedPrice),
      visible: boolToCell(p.activo !== false),
      destacado: boolToCell(p.destacado),
      imagen_1: cells[0] || '',
      imagen_2: cells[1] || '',
      imagen_3: cells[2] || '',
    })
  }

  files['productos.csv'] = strToU8(toCsv(rows))
  emit(onProgress, { label: 'Comprimiendo…', done: productos.length, total: productos.length })

  const zipped = await zipAsync(files)
  return {
    blob: new Blob([zipped], { type: 'application/zip' }),
    filename: `cataly-productos-${todayStamp()}.zip`,
    total: productos.length,
    imageFailures,
  }
}

export const generarPlantilla = () => {
  const csv = toCsv([
    {
      nombre: 'Camisa Oxford',
      descripcion: 'Camisa de algodón manga larga',
      categoria: 'Ropa',
      precio_usdt: '12,50',
      profit_porcentaje: '30',
      precio_fijo: 'no',
      visible: 'si',
      destacado: 'no',
      imagen_1: 'camisa.jpg',
      imagen_2: '',
      imagen_3: '',
    },
  ])
  return { blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename: 'cataly-plantilla-productos.csv' }
}

// ---------------------------------------------------------------------------
// IMPORTAR
// ---------------------------------------------------------------------------

const readPackage = async (file) => {
  if (!file) throw new Error('Selecciona un archivo.')
  if (file.size > MAX_FILE_BYTES) throw new Error('El archivo es muy pesado (máx. 150 MB).')

  const ext = getExt(file.name)
  if (ext === 'csv') {
    return { csvText: await file.text(), images: new Map() }
  }
  if (ext !== 'zip') throw new Error('Formato no válido. Sube el .zip que descargaste (o un .csv).')

  let entries
  try {
    entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new Error('No se pudo leer el .zip. Verifica que no esté dañado.')
  }

  const names = Object.keys(entries).filter((n) => !n.endsWith('/') && !n.includes('__MACOSX'))
  const csvName = names.find((n) => lastSegment(n).toLowerCase() === 'productos.csv') || names.find((n) => getExt(n) === 'csv')
  if (!csvName) throw new Error('El .zip no contiene el archivo productos.csv.')

  const images = new Map()
  for (const n of names) {
    const base = lastSegment(n)
    if (MIME_BY_EXT[getExt(base)]) images.set(base.toLowerCase(), { name: base, bytes: entries[n] })
  }

  return { csvText: strFromU8(entries[csvName]), images }
}

// Lee el archivo y calcula qué se va a crear/actualizar SIN modificar nada.
export const analizarImportacion = async ({ file, ownerId, tiendaId }) => {
  const { csvText, images } = await readPackage(file)
  const rawRows = parseCsv(csvText)

  if (rawRows.length === 0) throw new Error('El archivo no tiene productos.')
  if (rawRows.length > MAX_ROWS) throw new Error(`Demasiados productos (máx. ${MAX_ROWS} por carga).`)
  if (!('nombre' in rawRows[0])) throw new Error('Falta la columna "nombre". Usa el archivo que descargaste o la plantilla.')

  const existentes = await productosRepository.listAll(ownerId, { tiendaId })
  const byName = new Map()
  const knownImages = new Map() // nombre de archivo en Storage -> URL pública
  for (const p of existentes) {
    const key = normalizeName(p.nombre)
    if (key && !byName.has(key)) byName.set(key, p)
    for (const url of p.imagenes || []) {
      const obj = getStorageObjectFromPublicUrl(url)
      if (obj) knownImages.set(lastSegment(obj.path).toLowerCase(), url)
    }
  }

  const items = []
  const errors = []
  const warnings = []
  const seen = new Set()

  rawRows.forEach((raw, idx) => {
    const line = idx + 2 // +1 por cabecera, +1 por base 1
    const nombre = String(raw.nombre || '').trim()
    if (!nombre) {
      errors.push(`Fila ${line}: falta el nombre.`)
      return
    }

    const key = normalizeName(nombre)
    if (seen.has(key)) {
      errors.push(`Fila ${line} (${nombre}): nombre repetido en el archivo.`)
      return
    }
    seen.add(key)

    const existente = byName.get(key) || null

    const precioRaw = String(raw.precio_usdt ?? '').trim()
    const precio = parseDecimal(precioRaw)
    if (precioRaw && precio === null) {
      errors.push(`Fila ${line} (${nombre}): precio inválido "${precioRaw}".`)
      return
    }
    if (!existente && precio === null) {
      errors.push(`Fila ${line} (${nombre}): falta el precio.`)
      return
    }
    if (precio !== null && precio < 0) {
      errors.push(`Fila ${line} (${nombre}): el precio no puede ser negativo.`)
      return
    }

    const profitRaw = String(raw.profit_porcentaje ?? raw.profit ?? '').trim()
    const profit = parseDecimal(profitRaw)
    if (profitRaw && profit === null) {
      errors.push(`Fila ${line} (${nombre}): profit inválido "${profitRaw}".`)
      return
    }

    const imageRefs = [raw.imagen_1, raw.imagen_2, raw.imagen_3]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .slice(0, MAX_IMAGES)

    const imagenes = []
    for (const ref of imageRefs) {
      if (isHttpUrl(ref)) {
        imagenes.push({ kind: 'url', url: ref })
        continue
      }
      const base = lastSegment(ref).toLowerCase()
      if (knownImages.has(base)) {
        imagenes.push({ kind: 'url', url: knownImages.get(base) })
      } else if (images.has(base)) {
        imagenes.push({ kind: 'file', ...images.get(base) })
      } else {
        warnings.push(`Fila ${line} (${nombre}): no se encontró la imagen "${ref}".`)
      }
    }

    const fields = {
      nombre,
      descripcion: String(raw.descripcion || '').trim(),
      categoria: String(raw.categoria || '').trim(),
    }
    if (precio !== null) fields.precioUSDT = precio
    else if (!existente) fields.precioUSDT = 0
    if (profit !== null) fields.profit = profit
    else if (!existente) fields.profit = 0

    const fijo = parseBool(raw.precio_fijo, existente ? undefined : false)
    if (fijo !== undefined) fields.isFixedPrice = fijo
    const visible = parseBool(raw.visible, existente ? undefined : true)
    if (visible !== undefined) fields.activo = visible
    const destacado = parseBool(raw.destacado, existente ? undefined : false)
    if (destacado !== undefined) fields.destacado = destacado

    items.push({
      line,
      accion: existente ? 'actualizar' : 'crear',
      existente,
      fields,
      // Solo tocamos las imágenes si el archivo trae alguna referencia.
      imagenes: imageRefs.length ? imagenes : null,
    })
  })

  return {
    items,
    errors,
    warnings,
    crear: items.filter((i) => i.accion === 'crear').length,
    actualizar: items.filter((i) => i.accion === 'actualizar').length,
  }
}

const bytesToFile = ({ name, bytes }) => {
  const type = MIME_BY_EXT[getExt(name)] || 'application/octet-stream'
  return new File([bytes], name, { type })
}

export const ejecutarImportacion = async ({ plan, ownerId, tiendaId, onProgress }) => {
  const result = { creados: 0, actualizados: 0, errors: [...plan.errors], warnings: [...plan.warnings] }
  const bucket = getProductImagesBucketName()
  const allowedPrefix = ownerId ? `productos/${String(ownerId)}/` : null
  const categoriasUsadas = new Set()

  for (let i = 0; i < plan.items.length; i += 1) {
    const item = plan.items[i]
    emit(onProgress, { label: 'Importando productos…', done: i, total: plan.items.length })

    try {
      let imagenesFinal
      if (item.imagenes) {
        const storageId = item.existente ? String(item.existente.id) : `import-${Date.now()}-${i}`
        const resolved = await Promise.all(
          item.imagenes.map(async (img) => {
            if (img.kind === 'url') return img.url
            try {
              const { publicUrl } = await uploadProductImage({ file: bytesToFile(img), productId: storageId, ownerId })
              return publicUrl
            } catch (e) {
              result.warnings.push(`Fila ${item.line} (${item.fields.nombre}): no se pudo subir "${img.name}" (${e?.message || 'error'}).`)
              return null
            }
          })
        )
        imagenesFinal = resolved.filter(Boolean)
      }

      if (item.accion === 'crear') {
        await productosRepository.create({
          ...item.fields,
          ...(ownerId ? { ownerId } : {}),
          ...(tiendaId ? { tiendaId } : {}),
          imagenes: imagenesFinal || [],
        })
        result.creados += 1
      } else {
        await productosRepository.update(item.existente.id, {
          ...item.fields,
          ...(imagenesFinal !== undefined ? { imagenes: imagenesFinal } : {}),
        })
        result.actualizados += 1

        // Limpieza de imágenes que ya no se usan (solo dentro de la carpeta del usuario).
        if (imagenesFinal !== undefined && allowedPrefix) {
          const keep = new Set(imagenesFinal)
          for (const url of item.existente.imagenes || []) {
            if (!url || keep.has(url)) continue
            const meta = getStorageObjectFromPublicUrl(url)
            if (!meta || meta.bucket !== bucket || !String(meta.path || '').startsWith(allowedPrefix)) continue
            deleteStorageObject(meta).catch(() => {})
          }
        }
      }

      if (item.fields.categoria) categoriasUsadas.add(item.fields.categoria)
    } catch (e) {
      result.errors.push(`Fila ${item.line} (${item.fields.nombre}): ${e?.message || 'no se pudo guardar'}.`)
    }
  }

  // Crear las categorías nuevas para que aparezcan en el selector del formulario.
  try {
    const actuales = await categoriasRepository.listAll({ tiendaId })
    const existentes = new Set(actuales.map((c) => normalizeName(c.nombre)))
    for (const nombre of categoriasUsadas) {
      if (existentes.has(normalizeName(nombre))) continue
      try {
        await categoriasRepository.create({ nombre, tiendaId })
        existentes.add(normalizeName(nombre))
      } catch {
        // No es crítico: el producto ya quedó guardado con su categoría.
      }
    }
  } catch {
    // Idem.
  }

  emit(onProgress, { label: 'Listo', done: plan.items.length, total: plan.items.length })
  globalThis.dispatchEvent?.(new Event(PRODUCTOS_CHANGED_EVENT))
  return result
}
