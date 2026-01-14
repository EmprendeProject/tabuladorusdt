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
  return message.includes('does not exist') && message.includes(String(columnName).toLowerCase())
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
    const { data, error } = await supabase
      .from('productos')
      .select('id,nombre,precio_usdt,imagen_url,activo')
      .eq('activo', true)
      .order('created_at', { ascending: false })

    if (!error) return mapRows(data)

    // Backward compatible: si aún no existe la columna `activo`, devolvemos todos.
    if (isMissingColumn(error, 'activo')) {
      const { data: data2, error: error2 } = await supabase
        .from('productos')
        .select('id,nombre,precio_usdt,imagen_url')
        .order('created_at', { ascending: false })
      if (error2) throw error2
      return mapRows(data2)
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

    // Para `categoria`, preferimos fallar con un mensaje claro (para que el usuario ejecute la migración).
    if (payload?.categoria !== undefined && isMissingColumn(error, 'categoria')) {
      throw new Error('La columna "categoria" no existe en la base de datos.')
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

    // Para `categoria`, preferimos fallar con un mensaje claro (para que el usuario ejecute la migración).
    if (cambiosBD?.categoria !== undefined && isMissingColumn(error, 'categoria')) {
      throw new Error('La columna "categoria" no existe en la base de datos.')
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
