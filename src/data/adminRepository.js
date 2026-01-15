import { supabase } from '../lib/supabase'

export const adminRepository = {
  async isSuperadmin() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) return false

    const { data, error } = await supabase
      .from('app_admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    // Si falla por RLS/tabla inexistente/proyecto equivocado, necesitamos ver el error.
    if (error) throw error

    return data?.role === 'superadmin'
  },
}
