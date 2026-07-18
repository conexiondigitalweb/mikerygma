import { createContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })

  const signOut = () => supabase.auth.signOut()

  // Ver Login.jsx ("¿Olvidaste tu contraseña?"): Supabase decide internamente
  // si el correo existe o no y en ambos casos responde sin error (no revela
  // existencia de cuentas) — por eso Login.jsx muestra el mismo mensaje de
  // confirmación sin importar el resultado real de esta llamada.
  const resetPasswordForEmail = (email, options) => supabase.auth.resetPasswordForEmail(email, options)

  // Ver ResetPassword.jsx: se usa sobre la sesión de recuperación que
  // Supabase establece automáticamente cuando el usuario llega desde el
  // enlace del correo (detectSessionInUrl, ver src/lib/supabase.js).
  const updatePassword = (password) => supabase.auth.updateUser({ password })

  const value = { user, loading, signIn, signUp, signInWithGoogle, signOut, resetPasswordForEmail, updatePassword }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
