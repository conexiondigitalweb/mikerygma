import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
      Cargando...
    </div>
  )
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [profileComplete, setProfileComplete] = useState(null)

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setProfileComplete(null)

    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfileComplete(Boolean(data?.full_name))
      })

    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profileComplete === null) {
    return <LoadingScreen />
  }

  if (!profileComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
