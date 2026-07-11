import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Landing } from '@/pages/Landing'

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
      Cargando...
    </div>
  )
}

export function HomeRoute() {
  const { user, loading } = useAuth()
  const { hasProfile } = useProfile()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Landing />
  }

  if (hasProfile === null) {
    return <LoadingScreen />
  }

  if (!hasProfile) {
    return <Navigate to="/onboarding" replace />
  }

  return <Navigate to="/dashboard" replace />
}
