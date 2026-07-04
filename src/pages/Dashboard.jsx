import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { INPUT_TYPES, OCCASIONS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GenerationCounter } from '@/components/GenerationCounter'

function truncate(text, length = 100) {
  if (!text) return ''
  return text.length > length ? `${text.slice(0, length)}…` : text
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
      .select('full_name, generations_used, generations_limit')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })

    supabase
      .from('generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold text-foreground">
        {loading ? 'Bienvenido' : `Bienvenido, ${profile?.full_name?.split(' ')[0] ?? 'de nuevo'}`}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Este es tu panel de MiKerygma. Desde aquí generarás tus sermones, devocionales y contenido.
      </p>

      {!loading && profile && (
        <div className="mt-6">
          <GenerationCounter used={profile.generations_used} limit={profile.generations_limit} />
        </div>
      )}

      <div className="mt-8">
        <Button size="lg" asChild>
          <Link to="/generate">Nueva generación</Link>
        </Button>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-foreground">Tu historial</h2>

        {!loadingHistory && generations.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no has generado ningún mensaje. Crea el primero desde "Nueva generación".
          </p>
        )}

        <div className="mt-4 space-y-3">
          {generations.map((generation) => {
            const inputType = INPUT_TYPES.find((t) => t.value === generation.input_type)
            const occasion = OCCASIONS.find((o) => o.value === generation.occasion)
            return (
              <Card key={generation.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {inputType?.icon} {inputType?.label ?? generation.input_type}
                      </Badge>
                      {occasion && <Badge variant="outline">{occasion.label}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(generation.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-foreground">
                      {truncate(generation.input_text)}
                    </p>
                  </div>
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
