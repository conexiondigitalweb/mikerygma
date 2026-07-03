import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CopyButton } from '@/components/CopyButton'

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
  post_instagram: { label: 'Instagram', badgeClass: 'bg-accent/10 text-accent' },
  post_stories: { label: 'Stories / Twitter', badgeClass: 'bg-primary/10 text-primary' },
  post_twitter: { label: 'Twitter / X', badgeClass: 'bg-secondary text-secondary-foreground' },
}

export function Result() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.result

  useEffect(() => {
    if (!result) navigate('/dashboard', { replace: true })
  }, [result, navigate])

  if (!result) return null

  const { sermon, devocional, redes, oracion_cierre } = result

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sermon">Sermón</TabsTrigger>
          <TabsTrigger value="devocional">Devocional</TabsTrigger>
          <TabsTrigger value="redes">Redes Sociales</TabsTrigger>
          <TabsTrigger value="oracion">Oración</TabsTrigger>
        </TabsList>

        {/* Tab 1 — Sermón */}
        <TabsContent value="sermon" className="space-y-6">
          <div className="flex justify-end">
            <CopyButton getText={() => formatSermonText(sermon)} label="Copiar sermón completo" />
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
        <TabsContent value="devocional" className="space-y-6">
          <div className="flex justify-end">
            <CopyButton getText={() => formatDevocionalText(devocional)} label="Copiar devocional" />
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
        <TabsContent value="redes" className="grid gap-4 sm:grid-cols-1">
          {Object.entries(SOCIAL_META).map(([key, meta]) => {
            const post = redes?.[key]
            if (!post) return null
            return (
              <Card key={key}>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={meta.badgeClass} variant="secondary">
                      {meta.label}
                    </Badge>
                    <CopyButton getText={() => `${post.texto}\n\n${(post.hashtags ?? []).join(' ')}`} label="Copiar" />
                  </div>
                  <p className="text-foreground">{post.texto}</p>
                  <p className="text-sm text-primary">{(post.hashtags ?? []).join(' ')}</p>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Tab 4 — Oración */}
        <TabsContent value="oracion" className="space-y-6">
          <div className="flex justify-end">
            <CopyButton getText={() => oracion_cierre ?? ''} label="Copiar oración" />
          </div>
          <div className="rounded-lg bg-primary/5 p-8">
            <p className="whitespace-pre-line text-lg leading-relaxed text-foreground">{oracion_cierre}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
