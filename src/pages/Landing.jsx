import { Link } from 'react-router-dom'
import {
  BookOpen,
  Lightbulb,
  Handshake,
  Clapperboard,
  ScrollText,
  Share2,
  HeartHandshake,
  Sparkles,
  Fingerprint,
  Languages,
  Church,
  Clock,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLANS } from '@/lib/constants'

const STEPS = [
  {
    title: 'Configura tu ADN pastoral',
    description: 'Define tu estilo, tu audiencia, tu centro teológico y cómo te gusta comunicar. MiKerygma adapta cada generación a tu voz.',
    icon: Fingerprint,
  },
  {
    title: 'Elige tu punto de partida',
    description: 'Un pasaje bíblico, un tema, una situación de tu congregación o una prédica de YouTube. Tú decides desde dónde nace el mensaje.',
    icon: Sparkles,
  },
  {
    title: 'Recibe tu paquete ministerial',
    description: 'Sermón estructurado, devocional, contenido para redes y oración de cierre. Todo con tu tono, tu enfoque y listo para usar.',
    icon: HeartHandshake,
  },
]

const OUTPUTS = [
  { title: 'Sermón estructurado', description: 'Bosquejo predicable con introducción, puntos con ilustraciones culturalmente relevantes, aplicaciones concretas y oración de cierre.', icon: ScrollText },
  { title: 'Devocional pastoral', description: 'Reflexión profunda que parte de la experiencia humana y conecta con la gracia de Dios. Listo para compartir por WhatsApp o redes.', icon: BookOpen },
  { title: 'Contenido para redes', description: '3 posts adaptados a Instagram, Stories y Twitter. Con el mensaje del sermón en formato nativo de cada plataforma.', icon: Share2 },
  { title: 'Oración de cierre', description: 'Oración pastoral con el énfasis teológico de tu tradición, lista para leer en el culto.', icon: HeartHandshake },
]

const START_MODES = [
  { title: 'Desde un pasaje bíblico', description: 'Escribe la referencia y MiKerygma estructura el mensaje desde el texto.', icon: BookOpen },
  { title: 'Desde un tema', description: 'La gracia, el perdón, la ansiedad... tú pones el tema, MiKerygma lo desarrolla.', icon: Lightbulb },
  { title: 'Desde una situación cotidiana', description: 'Un duelo en la iglesia, una crisis familiar, una decisión difícil. Contenido pastoral contextualizado.', icon: Handshake },
  { title: 'Desde una prédica en YouTube', description: 'Transcribe una prédica y transforma ese mensaje en devocional, posts y material reutilizable.', icon: Clapperboard },
]

const PROFILES = [
  'Pastores y predicadores',
  'Líderes de células y grupos pequeños',
  'Maestros de escuela dominical',
  'Líderes juveniles',
  'Creadores de contenido cristiano',
  'Capellanes y consejeros pastorales',
]

const DIFFERENTIATORS = [
  { title: 'Tu ADN pastoral', description: 'No generas contenido genérico. Configuras tu centro teológico, tu estilo de enseñanza, tu nivel de confrontación y tu forma de cerrar. MiKerygma suena a ti.', icon: Fingerprint },
  { title: 'Nativo en español', description: 'Construido desde cero para el ministerio hispano. Soporta RVR1960, NVI, DHH, LBLA, NTV y TLA. Ilustraciones de la vida latinoamericana.', icon: Languages },
  { title: 'Respeta tu tradición', description: 'Pentecostal, bautista, reformada, católica, metodista... cada generación refleja el énfasis teológico de tu denominación.', icon: Church },
  { title: 'Menos tiempo preparando, más tiempo pastoreando', description: 'Lo que te tomaba horas ahora te toma minutos. Dedica el tiempo ahorrado a lo que realmente importa: tu gente.', icon: Clock },
]

const PLAN_ORDER = ['free', 'mensajero', 'proclamador']

export function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary/60 to-background px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <Badge variant="secondary" className="mb-6">
            Tu copiloto ministerial con inteligencia artificial
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Prepara tu mensaje con profundidad, claridad y tu propia voz
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            MiKerygma es un copiloto ministerial que te acompaña desde la idea hasta el mensaje
            completo. No reemplaza tu llamado — potencia tu preparación. Genera sermones,
            devocionales, contenido para redes y oraciones que suenan a ti, no a una máquina.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/login?mode=signup">Empieza gratis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#como-te-acompana">Ver cómo funciona</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Qué es MiKerygma */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-foreground">¿Qué es MiKerygma?</h2>
          <p className="mt-6 text-lg text-muted-foreground">
            No es un generador de texto. Es un asistente que entiende tu perfil pastoral, respeta
            tu tradición bíblica, se adapta a tu audiencia y aprende tu estilo de comunicación.
            Cada mensaje que generas suena más a ti, porque MiKerygma se configura con tu ADN
            ministerial.
          </p>
        </div>
      </section>

      {/* Cómo te acompaña */}
      <section id="como-te-acompana" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-foreground">Cómo te acompaña</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
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

      {/* Tu paquete ministerial completo */}
      <section className="bg-secondary/40 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-foreground">Tu paquete ministerial completo</h2>
          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
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

      {/* 4 formas de empezar */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-foreground">4 formas de empezar</h2>
          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
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

      {/* Pensado para quienes sirven */}
      <section className="bg-secondary/40 px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Pensado para quienes sirven</h2>
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

      {/* Lo que nos hace diferentes */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-foreground">Lo que nos hace diferentes</h2>
          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
            {DIFFERENTIATORS.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <item.icon className="h-8 w-8 text-accent" />
                  <CardTitle className="mt-2">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Credibilidad */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-4 text-center shadow-sm sm:p-8">
          <p className="text-lg text-foreground">
            Un proyecto de La Gracia que Transforma — más de 450 días de devocionales diarios
            compartidos con comunidades cristianas en varios países.
          </p>
          <a
            href="https://www.amazon.com/dp/B0F9DXGB7N"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-semibold text-primary hover:underline"
          >
            Gracia Inmerecida, disponible en Amazon
          </a>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-foreground">Planes</h2>
          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
            {PLAN_ORDER.map((key) => {
              const plan = PLANS[key]
              const highlighted = key === 'mensajero'
              return (
                <Card
                  key={key}
                  className={highlighted ? 'border-primary shadow-lg ring-1 ring-primary' : ''}
                >
                  <CardHeader>
                    {highlighted && <Badge className="mb-2 w-fit">Más popular</Badge>}
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
                    <Button
                      className="mt-6 w-full"
                      variant={highlighted ? 'default' : 'outline'}
                      asChild
                    >
                      <Link to="/login?mode=signup">
                        {key === 'free' ? 'Empieza gratis' : `Elegir ${plan.name}`}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
