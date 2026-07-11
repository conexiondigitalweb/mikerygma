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

const PLAN_ORDER = ['free', 'mensajero', 'proclamador']

export function Pricing() {
  const { user } = useAuth()
  const [currentPlan, setCurrentPlan] = useState(null)
  const [fullName, setFullName] = useState(null)

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

  // Sin pasarela de pago automática todavía: "Elegir [plan]" abre WhatsApp
  // con un mensaje pre-llenado en vez de un checkout — ver src/lib/whatsapp.js.
  const buildActivationMessage = (planName) => {
    const id = identityLine({ fullName, email: user?.email })
    return id
      ? `Hola, ${id} y quiero activar el plan ${planName} en MiKerygma.`
      : `Hola, quiero activar el plan ${planName} en MiKerygma.`
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
                    >
                      {`Elegir ${plan.name}`}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
