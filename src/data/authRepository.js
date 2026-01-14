import { supabase } from '../lib/supabase'

export const authRepository = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data?.session || null
  },

  onAuthStateChange(onChange) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (typeof onChange === 'function') onChange(session)
    })

    return () => {
      data?.subscription?.unsubscribe()
    }
  },

  async signInWithPassword({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}
