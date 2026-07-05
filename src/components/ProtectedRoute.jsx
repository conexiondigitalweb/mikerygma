import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
      Cargando...
    </div>
  )
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const { hasProfile } = useProfile()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (hasProfile === null) {
    return <LoadingScreen />
  }

  if (!hasProfile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
