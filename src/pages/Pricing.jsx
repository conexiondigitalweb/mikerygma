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

  // Sin pasarela de pago automática todavía: "Elegir [plan]" abre WhatsApp
  // con un mensaje pre-llenado en vez de un checkout — ver src/lib/whatsapp.js.
  const buildActivationMessage = (planName) => {
    const id = identityLine({ fullName, email: user?.email })
    return id
      ? `Hola, ${id} y quiero activar el plan ${planName} en MiKerygma.`
      : `Hola, quiero activar el plan ${planName} en MiKerygma.`
  }

  // Pago automático con Wompi, EN PARALELO al link de WhatsApp existente
  // (respaldo mientras se prueba) — no reemplaza nada de la activación
  // manual. Requiere sesión activa: el backend necesita userId para armar
  // la referencia que luego el webhook usa para saber a quién activarle el
  // plan (ver api/wompi/create-signature.js y api/wompi/webhook.js).
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
      setWompiError('No se pudo conectar con Wompi. Intenta de nuevo o usa el botón de WhatsApp.')
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
                ) : (
                  <Button className="mt-6 w-full" variant={isRecommended ? 'default' : 'outline'} asChild>
                    <a
                      href={buildWhatsAppLink(buildActivationMessage(plan.name))}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        trackLead()
                        logEvent('click_whatsapp_pago', { source: 'pricing', plan: key })
                      }}
                    >
                      {`Elegir ${plan.name}`}
                    </a>
                  </Button>
                )}
                {!isCurrent && key !== 'free' && user && (
                  <Button
                    className="mt-2 w-full"
                    variant="outline"
                    disabled={payingPlan === key}
                    onClick={() => handleWompiPay(key, plan.name)}
                  >
                    {payingPlan === key ? 'Abriendo Wompi...' : 'Pagar con Wompi'}
                  </Button>
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
