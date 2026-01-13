export const productoFromDb = (row) => {
  if (!row) return null;

  const precioUSDT =
    row.precioUSDT !== undefined
      ? row.precioUSDT
      : row.precio_usdt !== undefined
        ? row.precio_usdt
        : 0;

  return {
    id: row.id,
    nombre: row.nombre ?? '',
    descripcion: row.descripcion ?? '',
    imagenUrl: row.imagenUrl ?? row.imagen_url ?? '',
    precioUSDT: typeof precioUSDT === 'string' ? parseFloat(precioUSDT) || 0 : Number(precioUSDT) || 0,
    profit: typeof row.profit === 'string' ? parseFloat(row.profit) || 0 : Number(row.profit) || 0,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
};

export const productoToInsertDb = (producto) => {
  return {
    nombre: producto?.nombre ?? '',
    descripcion: (producto?.descripcion ?? '') || null,
    imagen_url: (producto?.imagenUrl ?? '') || null,
    precio_usdt: Number(producto?.precioUSDT) || 0,
    profit: Number(producto?.profit) || 0,
  };
};

export const productoToUpdateDb = (cambios) => {
  const cambiosDb = {};

  if (cambios?.nombre !== undefined) cambiosDb.nombre = cambios.nombre;
  if (cambios?.descripcion !== undefined) cambiosDb.descripcion = cambios.descripcion || null;
  if (cambios?.imagenUrl !== undefined) cambiosDb.imagen_url = cambios.imagenUrl || null;
  if (cambios?.precioUSDT !== undefined) cambiosDb.precio_usdt = Number(cambios.precioUSDT) || 0;
  if (cambios?.profit !== undefined) cambiosDb.profit = Number(cambios.profit) || 0;

  return cambiosDb;
};
