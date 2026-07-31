import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLANS } from '@/lib/constants'
import { getUpgradePlan } from '@/lib/planHelpers'
import { buildWhatsAppLink, identityLine } from '@/lib/whatsapp'
import { trackLead, trackViewContent } from '@/lib/metaPixel'
import { logEvent } from '@/lib/events'
import { openWompiCheckout } from '@/lib/wompi'

const PLAN_ORDER = ['free', 'mensajero', 'proclamador']

export function Pricing() {
  const { user } = useAuth()
  const [currentPlan, setCurrentPlan] = useState(null)
  const [fullName, setFullName] = useState(null)
  // Plan cuyo pago con Wompi está en curso (deshabilita solo ESE botón,
  // no toda la página) — null si ninguno.
  const [payingPlan, setPayingPlan] = useState(null)
  const [wompiError, setWompiError] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('plan, full_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.plan) setCurrentPlan(data.plan)
        if (data?.full_name) setFullName(data.full_name)
      })
  }, [user])

  // Se dispara una sola vez al montar (visita a /pricing), no en cada
  // re-render provocado por la carga del perfil.
  useEffect(() => {
    trackViewContent()
    logEvent('vio_pricing')
  }, [])

  // WhatsApp queda como respaldo secundario (link discreto debajo del botón
  // principal) — ver src/lib/whatsapp.js.
  const buildActivationMessage = (planName) => {
    const id = identityLine({ fullName, email: user?.email })
    return id
      ? `Hola, ${id} y quiero activar el plan ${planName} en MiKerygma.`
      : `Hola, quiero activar el plan ${planName} en MiKerygma.`
  }

  // Wompi es ahora el camino PRINCIPAL de pago (antes era un botón aparte,
  // secundario a WhatsApp). Requiere sesión activa: el backend necesita
  // userId para armar la referencia que luego el webhook usa para saber a
  // quién activarle el plan (ver api/wompi/create-signature.js y
  // api/wompi/webhook.js) — por eso el botón principal es un link a
  // /login?mode=signup cuando no hay sesión, igual que "Empieza gratis".
  const handleWompiPay = async (planKey, planName) => {
    if (!user) return
    setWompiError('')
    setPayingPlan(planKey)

    try {
      const response = await fetch('/api/wompi/create-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey, userId: user.id }),
      })
      const data = await response.json()

      if (!response.ok) {
        setWompiError(data.error ?? 'No se pudo iniciar el pago con Wompi.')
        return
      }

      logEvent('click_wompi_pago', { source: 'pricing', plan: planKey })

      // El widget se abre embebido sobre esta misma página (no navega a
      // otro sitio) — redirectUrl es solo a dónde vuelve el navegador
      // DESPUÉS de que el modal se cierra.
      await openWompiCheckout({
        publicKey: data.publicKey,
        amountInCents: data.amountInCents,
        reference: data.reference,
        signature: data.signature,
        redirectUrl: `${window.location.origin}/pago-exitoso`,
      })
    } catch (err) {
      console.error(`Error iniciando pago con Wompi (${planName}):`, err)
      setWompiError('No se pudo conectar con Wompi. Intenta de nuevo o usa el link de WhatsApp de abajo.')
    } finally {
      setPayingPlan(null)
    }
  }

  const recommendedPlan = currentPlan ? getUpgradePlan(currentPlan) : 'mensajero'

  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h1 className="text-center text-3xl font-bold text-foreground">Planes</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
        Elige el plan que se ajuste al ritmo de tu ministerio. Puedes cambiar de plan en cualquier momento.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key]
          const isCurrent = currentPlan === key
          const isRecommended = !isCurrent && key === recommendedPlan

          return (
            <Card
              key={key}
              className={isCurrent ? 'border-primary/40' : isRecommended ? 'border-primary shadow-lg ring-1 ring-primary' : ''}
            >
              <CardHeader>
                {isCurrent && <Badge variant="secondary" className="mb-2 w-fit">Tu plan actual</Badge>}
                {isRecommended && <Badge className="mb-2 w-fit">Más popular</Badge>}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.tagline}</CardDescription>
                <p className="text-3xl font-bold text-foreground">
                  ${plan.price}
                  {plan.price > 0 && <span className="text-base font-normal text-muted-foreground">/mes</span>}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.display_features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button className="mt-6 w-full" variant="outline" disabled>
                    Tu plan actual
                  </Button>
                ) : key === 'free' ? (
                  <Button className="mt-6 w-full" variant={isRecommended ? 'default' : 'outline'} asChild>
                    <Link to="/login?mode=signup">Empieza gratis</Link>
                  </Button>
                ) : !user ? (
                  <Button className="mt-6 w-full" variant={isRecommended ? 'default' : 'outline'} asChild>
                    <Link to="/login?mode=signup">{`Elegir ${plan.name}`}</Link>
                  </Button>
                ) : (
                  <Button
                    className="mt-6 w-full"
                    variant={isRecommended ? 'default' : 'outline'}
                    disabled={payingPlan === key}
                    onClick={() => handleWompiPay(key, plan.name)}
                  >
                    {payingPlan === key ? 'Abriendo Wompi...' : `Elegir ${plan.name}`}
                  </Button>
                )}
                {!isCurrent && key !== 'free' && (
                  <p className="mt-2 text-center text-xs">
                    <a
                      href={buildWhatsAppLink(buildActivationMessage(plan.name))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      onClick={() => {
                        trackLead()
                        logEvent('click_whatsapp_pago', { source: 'pricing', plan: key })
                      }}
                    >
                      ¿Prefieres pagar por WhatsApp?
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {wompiError && (
        <p className="mx-auto mt-4 max-w-md text-center text-sm text-destructive">{wompiError}</p>
      )}
    </div>
  )
}
