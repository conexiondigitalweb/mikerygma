import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// detectSessionInUrl (default: true) es lo que hace que ResetPassword.jsx
// reciba una sesión ya activa cuando el usuario llega desde el enlace de
// recuperación de contraseña del correo — no se pasa explícito porque el
// default de supabase-js v2 ya es `true`.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
