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

    await productosRepository.update(id, {
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      imagenUrl: producto.imagenUrl,
      precioUSDT: producto.precioUSDT,
      profit: producto.profit,
      activo: producto.activo,
    })
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
