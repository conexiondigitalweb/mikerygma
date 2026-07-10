import { createContext, useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export const ProfileContext = createContext(null)

async function fetchHasProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()
  return Boolean(data?.full_name)
}

export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [hasProfile, setHasProfile] = useState(null)

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setHasProfile(null)
      return
    }
    setHasProfile(await fetchHasProfile(userId))
  }, [userId])

  // Depende de userId (string estable), no de `user` (objeto). Supabase emite un
  // nuevo objeto `user` en cada onAuthStateChange — incluyendo el refresh de token
  // silencioso que dispara al recuperar el foco de la pestaña — aunque sea el mismo
  // usuario. Si esto dependiera de `user`, cada refresh resetearía hasProfile a null
  // y ProtectedRoute desmontaría la página protegida (p. ej. Generate.jsx a mitad
  // de una generación) solo por volver a la pestaña.
  useEffect(() => {
    if (!userId) {
      setHasProfile(null)
      return
    }

    let cancelled = false
    setHasProfile(null)

    fetchHasProfile(userId).then((result) => {
      if (!cancelled) setHasProfile(result)
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  const value = { hasProfile, refreshProfile }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
