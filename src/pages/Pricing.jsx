import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLANS } from '@/lib/constants'

const PLAN_ORDER = [
  { key: 'free', highlighted: false, cta: 'Empieza gratis' },
  { key: 'mensajero', highlighted: true, cta: 'Elegir Mensajero' },
  { key: 'proclamador', highlighted: false, cta: 'Elegir Proclamador' },
]

export function Pricing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h1 className="text-center text-3xl font-bold text-foreground">Planes</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
        Elige el plan que se ajuste al ritmo de tu ministerio. Puedes cambiar de plan en cualquier momento.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {PLAN_ORDER.map(({ key, highlighted, cta }) => {
          const plan = PLANS[key]
          const isUnlimited = plan.generations === -1
          return (
            <Card key={key} className={highlighted ? 'border-primary shadow-lg ring-1 ring-primary' : ''}>
              <CardHeader>
                {highlighted && <Badge className="mb-2 w-fit">Más popular</Badge>}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-3xl font-bold text-foreground">
                  ${plan.price}
                  {plan.price > 0 && <span className="text-base font-normal text-muted-foreground">/mes</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isUnlimited ? 'Generaciones ilimitadas' : `${plan.generations} generaciones al mes`}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant={highlighted ? 'default' : 'outline'} asChild>
                  <Link to="/login?mode=signup">{cta}</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
