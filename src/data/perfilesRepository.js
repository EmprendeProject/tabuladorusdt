import { supabase } from '../lib/supabase'

export const perfilesRepository = {
  async getMine() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) return null

    const { data, error } = await supabase
      .from('perfiles')
      .select('user_id,email,nombre_completo,telefono,direccion')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      userId: data.user_id,
      email: data.email,
      nombreCompleto: data.nombre_completo,
      telefono: data.telefono,
      direccion: data.direccion,
    }
  },

  async upsertMine({ nombreCompleto, telefono, direccion }) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) throw new Error('No hay sesión activa.')

    const payload = {
      user_id: user.id,
      email: String(user.email || '').trim(),
      nombre_completo: String(nombreCompleto || '').trim(),
      telefono: String(telefono || '').trim(),
      direccion: direccion ? String(direccion).trim() : null,
    }

    const { data, error } = await supabase
      .from('perfiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('user_id,email,nombre_completo,telefono,direccion')
      .maybeSingle()

    if (error) throw error

    return {
      userId: data.user_id,
      email: data.email,
      nombreCompleto: data.nombre_completo,
      telefono: data.telefono,
      direccion: data.direccion,
    }
  },
}
