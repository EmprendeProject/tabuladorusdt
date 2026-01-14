import { supabase } from '../lib/supabase'

const mapRows = (rows) => (rows || []).filter(Boolean)

export const categoriasRepository = {
  async listAll() {
    const { data, error } = await supabase
      .from('categorias')
      .select('id,nombre,created_at')
      .order('nombre', { ascending: true })

    if (error) throw error
    return mapRows(data)
  },

  async create({ nombre }) {
    const clean = String(nombre || '').trim()
    if (!clean) throw new Error('El nombre de la categoría es requerido')

    const { data, error } = await supabase
      .from('categorias')
      .insert([{ nombre: clean }])
      .select('id,nombre,created_at')
      .maybeSingle()

    if (error) throw error
    return data
  },

  async remove({ id }) {
    const cleanId = String(id || '').trim()
    if (!cleanId) throw new Error('El id de la categoría es requerido')

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', cleanId)

    if (error) throw error
    return { id: cleanId }
  },
}
