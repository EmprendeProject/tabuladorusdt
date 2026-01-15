import { supabase } from '../lib/supabase'

const mapRows = (rows) => (rows || []).filter(Boolean)

const toFriendlyCategoriasError = (error) => {
  const msg = String(error?.message || '')
  const code = String(error?.code || '')

  // Errores típicos cuando RLS/GRANTs no permiten insertar/leer.
  const looksLikeRls = msg.toLowerCase().includes('row-level security')
  const looksLikePermission = msg.toLowerCase().includes('permission denied') || code === '42501'

  // Si el repo intenta usar owner_id pero la tabla aún no fue migrada.
  const looksLikeMissingColumn = code === '42703' || msg.toLowerCase().includes('column')

  if (looksLikeMissingColumn || looksLikeRls || looksLikePermission) {
    return new Error(
      'No se pudo crear la categoría por permisos/políticas (RLS) en Supabase. ' +
        'Solución: migra la tabla `categorias` a multiusuario (owner_id + policies) ejecutando el bloque CATEGORIAS del archivo `SUPABASE_MULTIUSER_AUTH.sql`.'
    )
  }

  return error
}

export const categoriasRepository = {
  async listAll() {
    const { data, error } = await supabase
      .from('categorias')
      .select('id,nombre,created_at')
      .order('nombre', { ascending: true })

    if (error) throw toFriendlyCategoriasError(error)
    return mapRows(data)
  },

  async create({ nombre }) {
    const clean = String(nombre || '').trim()
    if (!clean) throw new Error('El nombre de la categoría es requerido')

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    const userId = userData?.user?.id
    if (!userId) throw new Error('No hay sesión activa. Inicia sesión para crear categorías.')

    // En esquema multiusuario, `owner_id` es requerido por RLS.
    // Si tu tabla antigua no tiene owner_id, esto disparará un error claro.
    const { data, error } = await supabase
      .from('categorias')
      .insert([{ owner_id: userId, nombre: clean }])
      .select('id,nombre,created_at')
      .maybeSingle()

    if (error) throw toFriendlyCategoriasError(error)
    return data
  },

  async remove({ id }) {
    const cleanId = String(id || '').trim()
    if (!cleanId) throw new Error('El id de la categoría es requerido')

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', cleanId)

    if (error) throw toFriendlyCategoriasError(error)
    return { id: cleanId }
  },
}
