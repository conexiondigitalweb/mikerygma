import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { LIBRARY_STATUSES, ADN_PASTORAL_FIELDS, PLANS } from '@/lib/constants'
import { isAdnPastoralEmpty } from '@/lib/planHelpers'
import { daysUntilCycleEnd } from '@/lib/billingCycle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GenerationCounter } from '@/components/GenerationCounter'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { DowngradeNotice } from '@/components/DowngradeNotice'
import { RenewalReminder } from '@/components/RenewalReminder'
import { AdnPastoralPrompt } from '@/components/AdnPastoralPrompt'

const RECENT_LIMIT = 5

// Ventana del aviso previo de vencimiento (ver RenewalReminder.jsx): a
// partir de cuántos días o menos restantes en el ciclo empieza a mostrarse.
const RENEWAL_REMINDER_WINDOW_DAYS = 5

// Ambos se posponen solo para el login/sesión actual (ver
// AdnPastoralPrompt.jsx / RenewalReminder.jsx) — sessionStorage se limpia
// solo al cerrar la pestaña/navegador, así que vuelven a aparecer en la
// siguiente sesión sin necesitar una columna en DB.
const ADN_PROMPT_DISMISS_KEY = 'mikerygma_adn_prompt_dismissed'
const RENEWAL_REMINDER_DISMISS_KEY = 'mikerygma_renewal_reminder_dismissed'

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
  const [adnPromptDismissed, setAdnPromptDismissed] = useState(
    () => sessionStorage.getItem(ADN_PROMPT_DISMISS_KEY) === 'true'
  )
  const [renewalReminderDismissed, setRenewalReminderDismissed] = useState(
    () => sessionStorage.getItem(RENEWAL_REMINDER_DISMISS_KEY) === 'true'
  )

  useEffect(() => {
    if (!user) return

    supabase
      .from('profiles')
      .select(`full_name, generations_used, generations_limit, plan, plan_started_at, downgraded_at, ${ADN_PASTORAL_FIELDS.join(', ')}`)
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })

    supabase
      .from('generations')
      .select('id, title, status, created_at, input_type, input_text, occasion, translation, output_sermon, output_devotional, output_social, output_prayer, output_lexicon_notes, passage_paraphrased')
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
          notas_lexicas: generation.output_lexicon_notes,
          passage_paraphrased: generation.passage_paraphrased,
        },
      },
    })
  }

  const userPlan = profile?.plan ?? 'free'
  const isPaidPlan = userPlan === 'mensajero' || userPlan === 'proclamador'
  const isDowngraded = !loading && Boolean(profile?.downgraded_at)

  const daysLeftInCycle = isPaidPlan && profile?.plan_started_at ? daysUntilCycleEnd(profile) : null
  const showRenewalReminder =
    !loading &&
    !isDowngraded &&
    isPaidPlan &&
    !renewalReminderDismissed &&
    daysLeftInCycle !== null &&
    daysLeftInCycle >= 0 &&
    daysLeftInCycle <= RENEWAL_REMINDER_WINDOW_DAYS

  const showAdnPrompt =
    !loading && !isDowngraded && !showRenewalReminder && isPaidPlan && !adnPromptDismissed && isAdnPastoralEmpty(profile)

  const handleDismissAdnPrompt = () => {
    sessionStorage.setItem(ADN_PROMPT_DISMISS_KEY, 'true')
    setAdnPromptDismissed(true)
  }

  const handleDismissRenewalReminder = () => {
    sessionStorage.setItem(RENEWAL_REMINDER_DISMISS_KEY, 'true')
    setRenewalReminderDismissed(true)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold break-words text-foreground">
        {loading ? 'Bienvenido' : `Bienvenido, ${profile?.full_name?.split(' ')[0] ?? 'de nuevo'}`}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Este es tu panel de MiKerygma. Desde aquí generarás tus sermones, devocionales y contenido.
      </p>

      {isDowngraded && (
        <div className="mt-6">
          <DowngradeNotice
            userId={user.id}
            fullName={profile.full_name}
            email={user.email}
            onDismiss={() => setProfile((prev) => ({ ...prev, downgraded_at: null }))}
          />
        </div>
      )}

      {showRenewalReminder && (
        <div className="mt-6">
          <RenewalReminder
            planLabel={PLANS[userPlan]?.name ?? userPlan}
            daysLeft={daysLeftInCycle}
            fullName={profile.full_name}
            email={user.email}
            onDismiss={handleDismissRenewalReminder}
          />
        </div>
      )}

      {showAdnPrompt && (
        <div className="mt-6">
          <AdnPastoralPrompt onDismiss={handleDismissAdnPrompt} />
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
