import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { canUseFeature } from '@/lib/planHelpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CopyButton } from '@/components/CopyButton'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { SocialCardPreview } from '@/components/SocialCardPreview'
import { extractCardText } from '@/lib/socialCardText'

const WATERMARK = '\n\n— Generado con MiKerygma.com'

function withWatermark(text, hasWatermark) {
  return hasWatermark ? `${text}${WATERMARK}` : text
}

function formatSermonText(sermon) {
  if (!sermon) return ''
  const lines = []
  lines.push(sermon.titulo)
  lines.push(`Pasaje central: ${sermon.pasaje_central}`)
  lines.push('')
  lines.push(sermon.texto_completo_pasaje)
  lines.push('')
  lines.push('INTRODUCCIÓN')
  lines.push(sermon.introduccion?.gancho ?? '')
  lines.push(sermon.introduccion?.contexto ?? '')
  lines.push(`Tesis: ${sermon.introduccion?.tesis ?? ''}`)
  lines.push('')
  ;(sermon.puntos ?? []).forEach((punto) => {
    lines.push(`${punto.numero}. ${punto.titulo}`)
    lines.push(punto.desarrollo)
    if (punto.pasajes_apoyo?.length) lines.push(`Pasajes de apoyo: ${punto.pasajes_apoyo.join(', ')}`)
    lines.push(`Ilustración: ${punto.ilustracion}`)
    lines.push(`Aplicación: ${punto.aplicacion}`)
    lines.push('')
  })
  lines.push('CONCLUSIÓN')
  lines.push(sermon.conclusion?.resumen ?? '')
  lines.push(sermon.conclusion?.llamado_accion ?? '')
  lines.push(`Pasaje de cierre: ${sermon.conclusion?.pasaje_cierre ?? ''}`)
  lines.push('')
  lines.push('ORACIÓN DE CIERRE')
  lines.push(sermon.oracion_cierre ?? '')
  return lines.join('\n')
}

function formatDevocionalText(devocional) {
  if (!devocional) return ''
  return [
    `Versículo clave: ${devocional.versiculo_clave}`,
    '',
    devocional.reflexion,
    '',
    `Aplicación: ${devocional.aplicacion}`,
    '',
    `Oración: ${devocional.oracion}`,
  ].join('\n')
}

const SOCIAL_META = {
  post_instagram: {
    label: 'Instagram',
    badgeClass: 'bg-accent/10 text-accent',
    cardType: 'instagram',
    cardStyle: 'verse',
    platform: 'Instagram',
  },
  post_stories: {
    label: 'Stories / Twitter',
    badgeClass: 'bg-primary/10 text-primary',
    cardType: 'story',
    cardStyle: 'quote',
    platform: 'Stories',
  },
  post_twitter: {
    label: 'Twitter / X',
    badgeClass: 'bg-secondary text-secondary-foreground',
    cardType: 'twitter',
    cardStyle: 'reflection',
    platform: 'Twitter/X',
  },
}

export function Result() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const result = location.state?.result
  const [userPlan, setUserPlan] = useState('free')

  useEffect(() => {
    if (!result) navigate('/dashboard', { replace: true })
  }, [result, navigate])

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.plan) setUserPlan(data.plan)
      })
  }, [user])

  if (!result) return null

  const { sermon, devocional, redes, oracion_cierre } = result
  const hasWatermark = canUseFeature(userPlan, 'watermark')

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 break-words">
          <h1 className="text-2xl font-bold text-foreground">Tu kerygma está listo</h1>
          <p className="text-sm text-muted-foreground">{sermon?.pasaje_central ?? sermon?.titulo}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Volver al Dashboard
          </Button>
          <Button onClick={() => navigate('/generate')}>Nueva generación</Button>
        </div>
      </div>

      <Tabs defaultValue="sermon">
        <TabsList className="grid h-auto! w-full grid-cols-2 gap-1 sm:h-9! sm:grid-cols-4 sm:gap-0">
          <TabsTrigger value="sermon" className="text-xs sm:text-sm">
            Sermón
          </TabsTrigger>
          <TabsTrigger value="devocional" className="text-xs sm:text-sm">
            Devocional
          </TabsTrigger>
          <TabsTrigger value="redes" className="text-xs sm:text-sm">
            <span className="sm:hidden">Redes</span>
            <span className="hidden sm:inline">Redes Sociales</span>
          </TabsTrigger>
          <TabsTrigger value="oracion" className="text-xs sm:text-sm">
            Oración
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 — Sermón */}
        <TabsContent value="sermon" className="space-y-6 break-words">
          <div className="flex justify-end">
            <CopyButton getText={() => withWatermark(formatSermonText(sermon), hasWatermark)} label="Copiar sermón completo" />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-foreground">{sermon?.titulo}</h2>
            <p className="mt-1 text-sm font-medium text-primary">{sermon?.pasaje_central}</p>
            <blockquote className="mt-3 rounded-md border-l-4 border-primary bg-secondary/40 px-4 py-3 text-sm italic text-foreground">
              {sermon?.texto_completo_pasaje}
            </blockquote>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground">Introducción</h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Gancho: </span>
              {sermon?.introduccion?.gancho}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Contexto: </span>
              {sermon?.introduccion?.contexto}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Tesis: </span>
              {sermon?.introduccion?.tesis}
            </p>
          </div>

          <div className="space-y-4">
            {(sermon?.puntos ?? []).map((punto) => (
              <div key={punto.numero} className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-foreground">
                  {punto.numero}. {punto.titulo}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{punto.desarrollo}</p>

                {punto.pasajes_apoyo?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {punto.pasajes_apoyo.map((ref) => (
                      <Badge key={ref} variant="secondary">
                        {ref}
                      </Badge>
                    ))}
                  </div>
                )}

                <Card className="mt-3 bg-secondary/40">
                  <CardContent className="text-sm text-foreground">
                    <span className="font-medium">Ilustración: </span>
                    {punto.ilustracion}
                  </CardContent>
                </Card>

                <p className="mt-3 text-sm text-foreground">
                  <span className="font-medium">Aplicación: </span>
                  {punto.aplicacion}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground">Conclusión</h3>
            <p className="text-sm text-muted-foreground">{sermon?.conclusion?.resumen}</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Llamado a la acción: </span>
              {sermon?.conclusion?.llamado_accion}
            </p>
            <p className="text-sm font-medium text-primary">{sermon?.conclusion?.pasaje_cierre}</p>
          </div>

          <div className="rounded-lg bg-primary/5 p-4">
            <h3 className="font-semibold text-foreground">Oración de cierre</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{sermon?.oracion_cierre}</p>
          </div>
        </TabsContent>

        {/* Tab 2 — Devocional */}
        <TabsContent value="devocional" className="space-y-6 break-words">
          <div className="flex justify-end">
            <CopyButton getText={() => withWatermark(formatDevocionalText(devocional), hasWatermark)} label="Copiar devocional" />
          </div>

          <blockquote className="rounded-md border-l-4 border-primary bg-secondary/40 px-4 py-3 text-lg font-medium italic text-foreground">
            {devocional?.versiculo_clave}
          </blockquote>

          <p className="whitespace-pre-line text-foreground">{devocional?.reflexion}</p>

          <div className="rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground">Aplicación práctica</h3>
            <p className="mt-2 text-sm text-muted-foreground">{devocional?.aplicacion}</p>
          </div>

          <div className="rounded-lg bg-primary/5 p-4">
            <h3 className="font-semibold text-foreground">Oración</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{devocional?.oracion}</p>
          </div>
        </TabsContent>

        {/* Tab 3 — Redes Sociales */}
        <TabsContent value="redes" className="grid gap-4 break-words sm:grid-cols-1">
          {Object.entries(SOCIAL_META).map(([key, meta]) => {
            const post = redes?.[key]
            if (!post) return null
            const { mainText, reference } = extractCardText(post.texto)
            return (
              <Card key={key}>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={meta.badgeClass} variant="secondary">
                      {meta.label}
                    </Badge>
                    <CopyButton
                      getText={() =>
                        withWatermark(`${post.texto}\n\n${(post.hashtags ?? []).join(' ')}`, hasWatermark)
                      }
                      label="Copiar"
                    />
                  </div>

                  <div className="flex justify-center">
                    <SocialCardPreview
                      text={mainText}
                      type={meta.cardType}
                      style={meta.cardStyle}
                      hashtags={post.hashtags ?? []}
                      reference={reference}
                      showWatermark={hasWatermark}
                      filename={`mikerygma-${key}`}
                      platform={meta.platform}
                    />
                  </div>

                  <p className="text-foreground">{post.texto}</p>
                  <p className="text-sm text-primary">{(post.hashtags ?? []).join(' ')}</p>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Tab 4 — Oración */}
        <TabsContent value="oracion" className="space-y-6 break-words">
          <div className="flex justify-end">
            <CopyButton getText={() => withWatermark(oracion_cierre ?? '', hasWatermark)} label="Copiar oración" />
          </div>
          <div className="rounded-lg bg-primary/5 p-4 sm:p-8">
            <p className="whitespace-pre-line text-lg leading-relaxed text-foreground">{oracion_cierre}</p>
          </div>
        </TabsContent>
      </Tabs>

      {userPlan === 'free' && (
        <UpgradePrompt
          variant="banner"
          requiredPlan="mensajero"
          message="Este mensaje fue generado con perfil básico. Con tu ADN Pastoral configurado, sonaría más a ti. Desbloquea con el Plan Mensajero →"
          className="mt-8"
        />
      )}
      {userPlan === 'mensajero' && (
        <UpgradePrompt
          variant="banner"
          requiredPlan="proclamador"
          message="¿Sabías que puedes exportar tus mensajes a PDF? Disponible en el Plan Proclamador →"
          className="mt-8"
        />
      )}
    </div>
  )
}
