import { useEffect, useRef } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { trackPageView } from '@/lib/metaPixel'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomeRoute } from '@/components/HomeRoute'
import { Login } from '@/pages/Login'
import { Onboarding } from '@/pages/Onboarding'
import { Dashboard } from '@/pages/Dashboard'
import { Generate } from '@/pages/Generate'
import { Result } from '@/pages/Result'
import { Library } from '@/pages/Library'
import { Pricing } from '@/pages/Pricing'
import { Profile } from '@/pages/Profile'
import { Terminos } from '@/pages/Terminos'
import { Privacidad } from '@/pages/Privacidad'

// El snippet base en index.html (ver <head>) ya dispara el PageView de la
// carga inicial — sin `skippedFirst`, este efecto dispararía un segundo
// PageView duplicado para esa misma primera carga, porque useEffect también
// corre en el primer render. Solo a partir del segundo cambio de pathname
// (navegación real dentro de la SPA) se dispara trackPageView().
function useMetaPixelPageView() {
  const location = useLocation()
  const skippedFirst = useRef(false)

  useEffect(() => {
    if (!skippedFirst.current) {
      skippedFirst.current = true
      return
    }
    trackPageView()
  }, [location.pathname])
}

function App() {
  useMetaPixelPageView()

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/generate"
          element={
            <ProtectedRoute>
              <Generate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/result"
          element={
            <ProtectedRoute>
              <Result />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <Library />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  )
}

export default App
