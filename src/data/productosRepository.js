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
  async listAll() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return mapRows(data)
  },

  async listPublic() {
    const baseQuery = (select, filterActivo) => {
      let q = supabase.from('productos').select(select)
      if (filterActivo) q = q.eq('activo', true)
      return q.order('created_at', { ascending: false })
    }

    const run = async (fields, filterActivo) => {
      const select = fields.join(',')
      return baseQuery(select, filterActivo)
    }

    // Intentamos con el set más completo, con fallbacks si faltan columnas.
    let fields = ['id', 'nombre', 'precio_usdt', 'profit', 'categoria', 'imagen_url', 'activo']

    // 1) Con filtro activo
    let { data, error } = await run(fields, true)
    if (!error) return mapRows(data)

    // Si faltan columnas opcionales, reintentamos con una versión reducida.
    if (isMissingColumn(error, 'profit')) {
      fields = fields.filter((f) => f !== 'profit')
      ;({ data, error } = await run(fields, true))
      if (!error) return mapRows(data)
    }

    if (isMissingColumn(error, 'categoria')) {
      fields = fields.filter((f) => f !== 'categoria')
      ;({ data, error } = await run(fields, true))
      if (!error) return mapRows(data)
    }

    // 2) Backward compatible: si aún no existe `activo`, devolvemos todos (sin filtro)
    if (isMissingColumn(error, 'activo')) {
      fields = fields.filter((f) => f !== 'activo')
      ;({ data, error } = await run(fields, false))
      if (!error) return mapRows(data)

      // Si faltan opcionales en este camino, reintentamos también.
      if (isMissingColumn(error, 'profit')) {
        fields = fields.filter((f) => f !== 'profit')
        ;({ data, error } = await run(fields, false))
        if (!error) return mapRows(data)
      }

      if (isMissingColumn(error, 'categoria')) {
        fields = fields.filter((f) => f !== 'categoria')
        ;({ data, error } = await run(fields, false))
        if (!error) return mapRows(data)
      }
    }

    throw error
  },

  async create(producto) {
    const payload = productoToInsertDb(producto)

    const { data, error } = await supabase
      .from('productos')
      .insert([payload])
      .select('*')
      .maybeSingle()

    if (!error) return productoFromDb(data)

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
