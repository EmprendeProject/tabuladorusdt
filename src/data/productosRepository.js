import { supabase } from '../lib/supabase'
import { productoFromDb, productoToInsertDb, productoToUpdateDb } from '../lib/productos'

export const PRODUCTOS_EVENT = {
  INSERT: 'insert',
  UPDATE: 'update',
  DELETE: 'delete',
}

const mapRows = (rows) => (rows || []).map(productoFromDb).filter(Boolean)

const isMissingColumn = (error, columnName) => {
  const message = (error?.message || '').toLowerCase()
  const col = String(columnName).toLowerCase()
  // PostgREST puede reportar de varias formas:
  // - "column ... does not exist"
  // - "Could not find the 'x' column ... in the schema cache"
  return (
    message.includes(col) &&
    (message.includes('does not exist') ||
      message.includes("could not find") ||
      message.includes('schema cache') ||
      message.includes('column') && message.includes('not found'))
  )
}

export const productosRepository = {
  async listAll(ownerId) {
    let allData = []
    let from = 0
    const step = 1000
    let hasMore = true

    while (hasMore) {
      const to = from + step - 1
      let q = supabase
        .from('productos')
        .select('*')
        .range(from, to)

      if (ownerId) q = q.eq('owner_id', ownerId)

      const { data, error } = await q
        .order('destacado', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        allData = [...allData, ...data]
        if (data.length < step) {
          hasMore = false
        } else {
          from += step
        }
      } else {
        hasMore = false
      }
    }

    return mapRows(allData)
  },

  async listPublic(ownerId) {
    const runQuery = async (fields, from, to, filterActivo) => {
      let q = supabase.from('productos').select(fields.join(','))
      if (filterActivo) q = q.eq('activo', true)
      if (ownerId) q = q.eq('owner_id', ownerId)
      return q
        .order('destacado', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)
    }

    // Estrategia: Obtener TODO paginando, intentando con el set completo de columnas.
    // Si falla por falta de columnas, degradamos el set ideal y reintentamos DESDE CERO
    // (o podríamos manejarlo por página, pero es más riesgo de inconsistencia).
    // Para simplificar: determinamos columnas seguras primero (o asumimos que funciona)
    // PERO dada la lógica de compatibilidad, mejor encapsulamos el fetch de UNA página con retry
    // y lo llamamos en bucle.

    let allData = []
    let from = 0
    const step = 1000
    let hasMore = true

    // Definición inicial de fields
    let fields = ['id', 'owner_id', 'nombre', 'descripcion', 'precio_usdt', 'profit', 'categoria', 'imagen_url', 'imagenes_urls', 'activo', 'is_fixed_price', 'destacado']
    let filterActivo = true

    // Función auxiliar para traer una página con "retry" si faltan columnas
    const fetchPage = async (currentFrom, currentTo) => {
      // Loop infinito interno para retries de columnas
      while (true) {
        const { data, error } = await runQuery(fields, currentFrom, currentTo, filterActivo)
        if (!error) return data

        // Manejo de errores de columnas faltantes
        if (isMissingColumn(error, 'profit')) {
          fields = fields.filter((f) => f !== 'profit')
          continue
        }
        if (isMissingColumn(error, 'imagenes_urls')) {
          fields = fields.filter((f) => f !== 'imagenes_urls')
          continue
        }
        if (isMissingColumn(error, 'owner_id')) {
          fields = fields.filter((f) => f !== 'owner_id')
          continue
        }
        if (isMissingColumn(error, 'descripcion')) {
          fields = fields.filter((f) => f !== 'descripcion')
          continue
        }
        if (isMissingColumn(error, 'categoria')) {
          fields = fields.filter((f) => f !== 'categoria')
          continue
        }
        if (isMissingColumn(error, 'activo')) {
          // Si falla activo, quitamos filtro y campo
          fields = fields.filter((f) => f !== 'activo')
          filterActivo = false // Importante: quitar el filtro tb
          continue
        }
        if (isMissingColumn(error, 'destacado')) {
          fields = fields.filter((f) => f !== 'destacado')
          continue
        }

        // Si es otro error, lanzamos
        throw error
      }
    }

    while (hasMore) {
      const to = from + step - 1
      const data = await fetchPage(from, to)

      if (data && data.length > 0) {
        allData = [...allData, ...data]
        if (data.length < step) {
          hasMore = false
        } else {
          from += step
        }
      } else {
        hasMore = false
      }
    }

    return mapRows(allData)
  },

  async create(producto) {
    const payload = productoToInsertDb(producto)

    // Si no vino owner_id explícito, intentamos inferirlo de la sesión.
    if (!payload.owner_id) {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id
      if (uid) payload.owner_id = uid
    }

    const { data, error } = await supabase
      .from('productos')
      .insert([payload])
      .select('*')
      .maybeSingle()

    if (!error) return productoFromDb(data)

    // Compatibilidad hacia atrás: si aún no existe `owner_id`, reintentar sin ese campo.
    if (payload?.owner_id !== undefined && isMissingColumn(error, 'owner_id')) {
      const { owner_id: _ownerId, ...payload2 } = payload
      const { data: data2, error: error2 } = await supabase
        .from('productos')
        .insert([payload2])
        .select('*')
        .maybeSingle()
      if (error2) throw error2
      return productoFromDb(data2)
    }

    // Compatibilidad hacia atrás: si aún no existe `activo`, reintentar sin ese campo.
    if (payload?.activo !== undefined && isMissingColumn(error, 'activo')) {
      const { activo: _activo, ...payload2 } = payload
      const { data: data2, error: error2 } = await supabase
        .from('productos')
        .insert([payload2])
        .select('*')
        .maybeSingle()
      if (error2) throw error2
      return productoFromDb(data2)
    }

    // Compatibilidad hacia atrás: si aún no existe `categoria`, reintentar sin ese campo.
    if (payload?.categoria !== undefined && isMissingColumn(error, 'categoria')) {
      const { categoria: _categoria, ...payload2 } = payload
      const { data: data2, error: error2 } = await supabase
        .from('productos')
        .insert([payload2])
        .select('*')
        .maybeSingle()
      if (error2) throw error2
      return productoFromDb(data2)
    }

    // Compatibilidad hacia atrás: si aún no existe `imagenes_urls`, reintentar sin ese campo.
    if (payload?.imagenes_urls !== undefined && isMissingColumn(error, 'imagenes_urls')) {
      const { imagenes_urls: _imagenes, ...payload2 } = payload
      const { data: data2, error: error2 } = await supabase
        .from('productos')
        .insert([payload2])
        .select('*')
        .maybeSingle()
      if (error2) throw error2
      return productoFromDb(data2)
    }

    // Compatibilidad hacia atrás: si aún no existe `is_fixed_price`, reintentar sin ese campo.
    if (payload?.is_fixed_price !== undefined && isMissingColumn(error, 'is_fixed_price')) {
      const { is_fixed_price: _ifp, ...payload2 } = payload
      const { data: data2, error: error2 } = await supabase
        .from('productos')
        .insert([payload2])
        .select('*')
        .maybeSingle()
      if (error2) throw error2
      return productoFromDb(data2)
    }

    // Compatibilidad hacia atrás: si aún no existe `destacado`, reintentar sin ese campo.
    if (payload?.destacado !== undefined && isMissingColumn(error, 'destacado')) {
      const { destacado: _destacado, ...payload2 } = payload
      const { data: data2, error: error2 } = await supabase
        .from('productos')
        .insert([payload2])
        .select('*')
        .maybeSingle()
      if (error2) throw error2
      return productoFromDb(data2)
    }

    throw error
  },

  async update(id, cambios) {
    const cambiosBD = productoToUpdateDb(cambios)

    const { error } = await supabase
      .from('productos')
      .update(cambiosBD)
      .eq('id', id)

    if (!error) return { ignoredFields: [] }

    // Compatibilidad hacia atrás: si aún no existe `activo`, reintentar sin ese campo.
    if (cambiosBD?.activo !== undefined && isMissingColumn(error, 'activo')) {
      const { activo: _activo, ...cambiosBD2 } = cambiosBD
      const { error: error2 } = await supabase
        .from('productos')
        .update(cambiosBD2)
        .eq('id', id)
      if (error2) throw error2
      return { ignoredFields: ['activo'] }
    }

    // Compatibilidad hacia atrás: si aún no existe `categoria`, reintentar sin ese campo.
    if (cambiosBD?.categoria !== undefined && isMissingColumn(error, 'categoria')) {
      const { categoria: _categoria, ...cambiosBD2 } = cambiosBD
      const { error: error2 } = await supabase
        .from('productos')
        .update(cambiosBD2)
        .eq('id', id)
      if (error2) throw error2
      return { ignoredFields: ['categoria'] }
    }

    // Compatibilidad hacia atrás: si aún no existe `imagenes_urls`, reintentar sin ese campo.
    if (cambiosBD?.imagenes_urls !== undefined && isMissingColumn(error, 'imagenes_urls')) {
      const { imagenes_urls: _imagenes, ...cambiosBD2 } = cambiosBD
      const { error: error2 } = await supabase
        .from('productos')
        .update(cambiosBD2)
        .eq('id', id)
      if (error2) throw error2
      return { ignoredFields: ['imagenes_urls'] }
    }

    // Compatibilidad hacia atrás: si aún no existe `is_fixed_price`, reintentar sin ese campo.
    if (cambiosBD?.is_fixed_price !== undefined && isMissingColumn(error, 'is_fixed_price')) {
      const { is_fixed_price: _ifp, ...cambiosBD2 } = cambiosBD
      const { error: error2 } = await supabase
        .from('productos')
        .update(cambiosBD2)
        .eq('id', id)
      if (error2) throw error2
      return { ignoredFields: ['is_fixed_price'] }
    }

    // Compatibilidad hacia atrás: si aún no existe `destacado`, reintentar sin ese campo.
    if (cambiosBD?.destacado !== undefined && isMissingColumn(error, 'destacado')) {
      const { destacado: _destacado, ...cambiosBD2 } = cambiosBD
      const { error: error2 } = await supabase
        .from('productos')
        .update(cambiosBD2)
        .eq('id', id)
      if (error2) throw error2
      return { ignoredFields: ['destacado'] }
    }

    throw error
  },

  async remove(id) {
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) throw error
  },

  subscribe(onEvent) {
    const channel = supabase
      .channel('productos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, (payload) => {
        if (typeof onEvent !== 'function') return

        if (payload.eventType === 'INSERT') {
          const producto = productoFromDb(payload.new)
          if (!producto) return
          onEvent({ type: PRODUCTOS_EVENT.INSERT, producto })
          return
        }

        if (payload.eventType === 'UPDATE') {
          const producto = productoFromDb(payload.new)
          if (!producto) return
          onEvent({ type: PRODUCTOS_EVENT.UPDATE, producto })
          return
        }

        if (payload.eventType === 'DELETE') {
          const id = payload?.old?.id
          if (!id) return
          onEvent({ type: PRODUCTOS_EVENT.DELETE, id })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}
