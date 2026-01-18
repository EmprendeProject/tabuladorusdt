import { productosRepository } from '../data/productosRepository'

export const guardarCambiosProductos = async ({ productos, idsParaGuardar }) => {
  const nuevosIdsMap = {}

  for (const id of idsParaGuardar) {
    const producto = productos.find((p) => p.id === id)
    if (!producto) continue

    if (id < 0) {
      const creado = await productosRepository.create(producto)
      if (creado?.id != null) nuevosIdsMap[id] = creado.id
      continue
    }

    const res = await productosRepository.update(id, {
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      imagenes: Array.isArray(producto.imagenes) ? producto.imagenes : (producto.imagenUrl ? [producto.imagenUrl] : []),
      precioUSDT: producto.precioUSDT,
      profit: producto.profit,
      activo: producto.activo,
      isFixedPrice: producto.isFixedPrice,
    })

    if (res?.ignoredFields?.includes('categoria')) {
      throw new Error('La columna "categoria" no existe en la base de datos.')
    }
  }

  return nuevosIdsMap
}

export const eliminarProducto = async (id) => {
  await productosRepository.remove(id)
}

export const setProductoActivo = async ({ id, activo }) => {
  if (!id || id < 0) return
  const res = await productosRepository.update(id, { activo })
  if (res?.ignoredFields?.includes('activo')) {
    throw new Error('La columna "activo" no existe en la base de datos.')
  }
}
