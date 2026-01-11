import { createClient } from '@supabase/supabase-js'

// Obtener las variables de entorno
// En producción, estas deben estar en un archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Crear el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
