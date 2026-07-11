import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { LIBRARY_STATUSES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GenerationCounter } from '@/components/GenerationCounter'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { DowngradeNotice } from '@/components/DowngradeNotice'

const RECENT_LIMIT = 5

function statusMeta(status) {
  return LIBRARY_STATUSES.find((s) => s.value === status) ?? LIBRARY_STATUSES[0]
}

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generations, setGenerations] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    if (!user) return

    supabase
      .from('profiles')
      .select('full_name, generations_used, generations_limit, plan, downgraded_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })

    supabase
      .from('generations')
      .select('id, title, status, created_at, input_type, input_text, occasion, translation, output_sermon, output_devotional, output_social, output_prayer')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT)
      .then(({ data }) => {
        setGenerations(data ?? [])
        setLoadingHistory(false)
      })
  }, [user])

  const handleViewResult = (generation) => {
    navigate('/result', {
      state: {
        result: {
          id: generation.id,
          created_at: generation.created_at,
          input_type: generation.input_type,
          input_text: generation.input_text,
          occasion: generation.occasion,
          translation: generation.translation,
          sermon: generation.output_sermon,
          devocional: generation.output_devotional,
          redes: generation.output_social,
          oracion_cierre: generation.output_prayer,
        },
      },
    })
  }

  const userPlan = profile?.plan ?? 'free'

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold break-words text-foreground">
        {loading ? 'Bienvenido' : `Bienvenido, ${profile?.full_name?.split(' ')[0] ?? 'de nuevo'}`}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Este es tu panel de MiKerygma. Desde aquí generarás tus sermones, devocionales y contenido.
      </p>

      {!loading && profile?.downgraded_at && (
        <div className="mt-6">
          <DowngradeNotice
            userId={user.id}
            fullName={profile.full_name}
            email={user.email}
            onDismiss={() => setProfile((prev) => ({ ...prev, downgraded_at: null }))}
          />
        </div>
      )}

      {!loading && profile && (
        <div className="mt-6 space-y-3">
          <GenerationCounter used={profile.generations_used} limit={profile.generations_limit} />
          {userPlan === 'free' && (
            <UpgradePrompt
              variant="inline"
              requiredPlan="mensajero"
              message="¿Necesitas más? Plan Mensajero: 15 generaciones/mes + ADN Pastoral + YouTube"
            />
          )}
        </div>
      )}

      <div className="mt-8">
        <Button size="lg" asChild>
          <Link to="/generate">Nueva generación</Link>
        </Button>
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">Últimos 5 mensajes</h2>
          <Link to="/library" className="shrink-0 text-sm font-medium text-primary hover:underline">
            Ver toda mi biblioteca →
          </Link>
        </div>

        {!loadingHistory && generations.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no has generado ningún mensaje. Crea el primero desde "Nueva generación".
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {generations.map((generation) => {
            const status = statusMeta(generation.status)
            return (
              <Card key={generation.id}>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={status.badgeClass} variant="secondary">
                      {status.label}
                    </Badge>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(generation.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-foreground">
                    {generation.title || 'Sin título'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => handleViewResult(generation)}>
                    Ver resultado
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
