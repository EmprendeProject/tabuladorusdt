import { supabase } from '../lib/supabase'

const normalizeTelefono = (telefono) => {
  return String(telefono || '').replace(/\D/g, '')
}

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

  async upsertMine({ nombreCompleto, telefono, direccion, mapsUrl }) {
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
      telefono: normalizeTelefono(telefono),
      direccion: direccion ? String(direccion).trim() : null,
    }

    const { data, error } = await supabase
      .from('perfiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('user_id,email,nombre_completo,telefono,direccion')
      .maybeSingle()

    if (error) throw error

    // Intentar sincronizar un teléfono de contacto público para el catálogo.
    // Esto requiere que exista una tabla pública (recomendada) llamada `catalog_contactos`.
    // Si no existe (o no hay políticas), no bloqueamos el flujo.
    try {
      await supabase
        .from('catalog_contactos')
        .upsert(
          {
            owner_id: user.id,
            telefono: normalizeTelefono(telefono),
            direccion: direccion ? String(direccion).trim() : null,
            maps_url: mapsUrl ? String(mapsUrl).trim() : null,
          },
          { onConflict: 'owner_id' },
        )
    } catch {
      // noop
    }

    return {
      userId: data.user_id,
      email: data.email,
      nombreCompleto: data.nombre_completo,
      telefono: data.telefono,
      direccion: data.direccion,
    }
  },

  async getPublicContactByUserId(userId) {
    const id = String(userId || '').trim()
    if (!id) return null

    // 1) Preferido: tabla pública de contactos para el catálogo.
    try {
      const { data, error } = await supabase
        .from('catalog_contactos')
        .select('owner_id,telefono,direccion,maps_url')
        .eq('owner_id', id)
        .maybeSingle()

      if (!error && data) {
        return {
          ownerId: data.owner_id,
          telefono: data.telefono,
          direccion: data.direccion,
          mapsUrl: data.maps_url,
        }
      }
    } catch {
      // noop
    }

    // 2) Fallback: leer desde perfiles (solo funcionará si tus policies permiten lectura pública).
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('user_id,telefono,direccion')
        .eq('user_id', id)
        .maybeSingle()

      if (error) return null
      if (!data) return null
      return { ownerId: data.user_id, telefono: data.telefono, direccion: data.direccion }
    } catch {
      return null
    }
  },

  async getMyCatalogContact() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('catalog_contactos')
        .select('owner_id,telefono,direccion,maps_url')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (error) return null
      if (!data) return null
      return {
        ownerId: data.owner_id,
        telefono: data.telefono,
        direccion: data.direccion,
        mapsUrl: data.maps_url,
      }
    } catch {
      return null
    }
  },
}
