import { Link } from 'react-router-dom'
import { BookOpen, Lightbulb, Handshake, ScrollText, Share2, HeartHandshake, Sparkles, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const STEPS = [
  {
    title: 'Elige tu fuente',
    description: 'Un pasaje bíblico, un tema o una situación cotidiana de tu congregación.',
    icon: BookOpen,
  },
  {
    title: 'Personaliza',
    description: 'Selecciona traducción, tipo de ocasión y duración de tu mensaje.',
    icon: Sparkles,
  },
  {
    title: 'Recibe tu paquete completo',
    description: 'Sermón, devocional, contenido para redes y oración de cierre, listos en minutos.',
    icon: HeartHandshake,
  },
]

const OUTPUTS = [
  { title: 'Sermón estructurado', description: 'Bosquejo predicable con introducción, puntos, ilustraciones y aplicación.', icon: ScrollText },
  { title: 'Devocional', description: 'Listo para compartir por WhatsApp con tu congregación.', icon: BookOpen },
  { title: 'Contenido para redes', description: '3 posts nativos para Instagram, Facebook y Twitter/X.', icon: Share2 },
  { title: 'Oración de cierre', description: 'Oración pastoral lista para leer en el culto.', icon: HeartHandshake },
]

const START_MODES = [
  { title: 'Pasaje bíblico', description: 'Ej: Juan 3:16-21, Salmo 23, Romanos 8:28-39', icon: BookOpen },
  { title: 'Tema', description: 'Ej: La gracia de Dios, El perdón, La fe en tiempos difíciles', icon: Lightbulb },
  { title: 'Situación cotidiana', description: 'Ej: Un joven de la iglesia perdió a su madre', icon: Handshake },
]

const PROFILES = [
  'Pastores que preparan varios mensajes por semana',
  'Líderes de célula o grupos pequeños',
  'Maestros de escuela dominical',
  'Creadores de contenido cristiano',
]

const PLANS = [
  {
    name: 'Gratis',
    price: '$0',
    period: '',
    features: ['5 generaciones al mes', 'Todas las funciones', 'Marca de agua en outputs'],
    cta: 'Empieza gratis',
    highlighted: false,
  },
  {
    name: 'Mensajero',
    price: '$9',
    period: '/mes',
    features: ['50 generaciones al mes', 'Sin marca de agua', 'Historial completo', 'Soporte por email'],
    cta: 'Elegir Mensajero',
    highlighted: true,
  },
  {
    name: 'Proclamador',
    price: '$19',
    period: '/mes',
    features: ['Generaciones ilimitadas', 'Outputs en PDF descargable', 'Acceso anticipado a nuevas funciones'],
    cta: 'Elegir Proclamador',
    highlighted: false,
  },
]

export function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary/60 to-background px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <Badge variant="secondary" className="mb-6">
            Tu asistente de IA para la proclamación del Evangelio
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Prepara tu sermón en minutos, no en horas
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            IA diseñada exclusivamente para pastores y líderes cristianos hispanohablantes. Genera
            sermones, devocionales, contenido para redes y reflexiones a partir de un pasaje bíblico,
            un tema o una situación cotidiana. No reemplaza al predicador — le devuelve horas para pastorear.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/login?mode=signup">Empieza gratis — 5 generaciones sin costo</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">Ver planes</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-foreground">Cómo funciona</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon className="h-7 w-7" />
                </div>
                <p className="mt-4 text-sm font-medium text-primary">Paso {i + 1}</p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Qué genera MiKerygma */}
      <section className="bg-secondary/40 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-foreground">Qué genera MiKerygma</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {OUTPUTS.map((output) => (
              <Card key={output.title}>
                <CardHeader>
                  <output.icon className="h-8 w-8 text-accent" />
                  <CardTitle className="mt-2">{output.title}</CardTitle>
                  <CardDescription>{output.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3 formas de empezar */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-foreground">3 formas de empezar</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {START_MODES.map((mode) => (
              <Card key={mode.title} className="border-primary/20">
                <CardHeader>
                  <mode.icon className="h-8 w-8 text-primary" />
                  <CardTitle className="mt-2">{mode.title}</CardTitle>
                  <CardDescription>{mode.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pensado para ti */}
      <section className="bg-secondary/40 px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Pensado para ti</h2>
          <ul className="mt-8 space-y-4 text-left">
            {PROFILES.map((profile) => (
              <li key={profile} className="flex items-start gap-3 text-lg text-foreground">
                <Check className="mt-1 h-5 w-5 shrink-0 text-primary" />
                {profile}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Credibilidad */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-lg text-foreground">
            Construido por un autor cristiano con más de un año produciendo devocionales diarios.
          </p>
          <p className="mt-2 font-semibold text-primary">La Gracia que Transforma</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-foreground">Planes</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlighted ? 'border-primary shadow-lg ring-1 ring-primary' : ''}
              >
                <CardHeader>
                  {plan.highlighted && <Badge className="mb-2 w-fit">Más popular</Badge>}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-3xl font-bold text-foreground">
                    {plan.price}
                    <span className="text-base font-normal text-muted-foreground">{plan.period}</span>
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
                  <Button
                    className="mt-6 w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    asChild
                  >
                    <Link to="/login?mode=signup">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
