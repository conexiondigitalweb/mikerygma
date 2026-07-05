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
  const [hasProfile, setHasProfile] = useState(null)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setHasProfile(null)
      return
    }
    setHasProfile(await fetchHasProfile(user.id))
  }, [user])

  useEffect(() => {
    if (!user) {
      setHasProfile(null)
      return
    }

    let cancelled = false
    setHasProfile(null)

    fetchHasProfile(user.id).then((result) => {
      if (!cancelled) setHasProfile(result)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  const value = { hasProfile, refreshProfile }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
