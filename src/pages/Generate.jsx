import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { INPUT_TYPES, TRANSLATIONS, OCCASIONS, DURATIONS, LOADING_MESSAGES } from '@/lib/constants'
import { canUseFeature } from '@/lib/planHelpers'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { GenerationCounter } from '@/components/GenerationCounter'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { cn } from '@/lib/utils'

const CUSTOM_INSTRUCTIONS_MAX = 500

const MODE_FEATURE_KEYS = {
  pasaje: 'mode_pasaje',
  tema: 'mode_tema',
  situacion: 'mode_situacion',
  youtube: 'mode_youtube',
}

export function Generate() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [mode, setMode] = useState(null)
  const [inputText, setInputText] = useState('')
  const [translation, setTranslation] = useState('RVR1960')
  const [occasion, setOccasion] = useState('culto_dominical')
  const [duration, setDuration] = useState('regular')
  const [customInstructions, setCustomInstructions] = useState('')

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState('')
  const [transcriptWordCount, setTranscriptWordCount] = useState(0)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [messageIndex, setMessageIndex] = useState(0)
  const [lockedModalFeature, setLockedModalFeature] = useState(null)

  const [previewStep, setPreviewStep] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [preview, setPreview] = useState(null)
  const [editedTitulo, setEditedTitulo] = useState('')
  const [editedTesis, setEditedTesis] = useState('')
  const [editedPuntos, setEditedPuntos] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('preferred_translation, denomination, generations_used, generations_limit, plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        if (data?.preferred_translation) setTranslation(data.preferred_translation)
        setLoadingProfile(false)
      })
  }, [user])

  useEffect(() => {
    if (!generating) return
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [generating])

  const userPlan = profile?.plan ?? 'free'
  const canEditPreview = canUseFeature(userPlan, 'edit_preview')

  const hasGenerationsLeft =
    !profile || profile.generations_limit === -1 || profile.generations_used < profile.generations_limit

  const selectMode = (type) => {
    if (!canUseFeature(userPlan, MODE_FEATURE_KEYS[type.value])) {
      setLockedModalFeature(`Modo ${type.label}`)
      return
    }
    setMode(type.value)
    setInputText('')
    setYoutubeUrl('')
    setTranscribeError('')
    setTranscriptWordCount(0)
    resetPreviewState()
  }

  const canUseCustomInstructions = canUseFeature(userPlan, 'custom_instructions')

  const resetPreviewState = () => {
    setPreviewStep(false)
    setPreviewLoading(false)
    setPreviewError('')
    setPreview(null)
    setEditedTitulo('')
    setEditedTesis('')
    setEditedPuntos([])
  }

  const handleTranscribe = async () => {
    if (!youtubeUrl.trim()) return

    setTranscribeError('')
    setTranscribing(true)
    setInputText('')
    setTranscriptWordCount(0)

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setTranscribeError(data.error ?? 'No se pudo transcribir el video.')
        setTranscribing(false)
        return
      }

      setInputText(data.transcript)
      setTranscriptWordCount(data.word_count)
      setTranscribing(false)
    } catch (err) {
      setTranscribeError('No se pudo conectar con el servidor. Intenta de nuevo.')
      setTranscribing(false)
    }
  }

  const fetchPreview = async () => {
    if (!mode || !inputText.trim()) return

    setPreviewError('')
    setPreviewLoading(true)

    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_type: mode,
          input_text: inputText.trim(),
          occasion,
          translation,
          duration,
          custom_instructions: customInstructions.trim(),
          user_id: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPreviewError(data.error ?? 'No se pudo proponer un enfoque para tu mensaje.')
        setPreviewLoading(false)
        return
      }

      setPreview(data)
      setEditedTitulo(data.titulo_propuesto ?? '')
      setEditedTesis(data.tesis ?? '')
      setEditedPuntos(Array.isArray(data.puntos_sugeridos) ? data.puntos_sugeridos : [])
      setPreviewStep(true)
      setPreviewLoading(false)
    } catch (err) {
      setPreviewError('No se pudo conectar con el servidor. Intenta de nuevo.')
      setPreviewLoading(false)
    }
  }

  const handlePreviewSubmit = (e) => {
    e.preventDefault()
    fetchPreview()
  }

  const handleGenerate = async (usePreviewContext) => {
    setError('')
    setGenerating(true)
    setMessageIndex(0)

    const previewContext = usePreviewContext && preview
      ? {
          titulo: editedTitulo.trim(),
          tesis: editedTesis.trim(),
          puntos: editedPuntos.map((p) => p.trim()).filter(Boolean),
        }
      : undefined

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_type: mode,
          input_text: inputText.trim(),
          occasion,
          translation,
          denomination: profile?.denomination,
          duration,
          custom_instructions: customInstructions.trim(),
          user_id: user.id,
          ...(previewContext ? { preview_context: previewContext } : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Ocurrió un error al generar tu contenido.')
        setGenerating(false)
        return
      }

      navigate('/result', { state: { result: data } })
    } catch (err) {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.')
      setGenerating(false)
    }
  }

  if (generating) {
    return <GeneratingOverlay messageIndex={messageIndex} />
  }

  const isYoutube = mode === 'youtube'
  const hasTranscript = isYoutube && inputText.trim().length > 0
  const showRestOfForm = mode && (!isYoutube || hasTranscript)
  const transcriptPreview = hasTranscript
    ? inputText.trim().split(/\s+/).slice(0, 200).join(' ')
    : ''

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-foreground">Nueva generación</h1>
      <p className="mt-2 text-muted-foreground">
        Elige de dónde quieres partir para preparar tu mensaje.
      </p>

      {!loadingProfile && profile && (
        <div className="mt-4">
          <GenerationCounter used={profile.generations_used} limit={profile.generations_limit} />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {INPUT_TYPES.map((type) => {
          const locked = !canUseFeature(userPlan, MODE_FEATURE_KEYS[type.value])
          return (
            <Card
              key={type.value}
              onClick={() => selectMode(type)}
              className={cn(
                'cursor-pointer transition-all hover:border-primary hover:shadow-md',
                mode === type.value && 'border-primary ring-1 ring-primary shadow-md',
                locked && 'opacity-60 grayscale hover:shadow-none'
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl sm:text-3xl">{type.icon}</span>
                  {locked && (
                    <Badge variant="secondary" className="gap-1 whitespace-nowrap">
                      <Lock className="h-3 w-3" />
                      Plan Mensajero
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-2 text-sm sm:text-base">{type.label}</CardTitle>
                <CardDescription className="text-[11px] sm:text-xs">{type.placeholder}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <UpgradePrompt
        variant="modal"
        feature={lockedModalFeature ?? ''}
        requiredPlan="mensajero"
        open={!!lockedModalFeature}
        onOpenChange={(open) => !open && setLockedModalFeature(null)}
      />

      {mode && (
        <div className="mt-8 space-y-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          {previewLoading ? (
            <PreviewLoading />
          ) : previewStep && preview ? (
            <PreviewCard
              preview={preview}
              editable={canEditPreview}
              editedTitulo={editedTitulo}
              setEditedTitulo={setEditedTitulo}
              editedTesis={editedTesis}
              setEditedTesis={setEditedTesis}
              editedPuntos={editedPuntos}
              setEditedPuntos={setEditedPuntos}
              onConfirm={() => handleGenerate(true)}
              onRegenerate={fetchPreview}
              onBack={resetPreviewState}
            />
          ) : (
            <>
              {isYoutube ? (
                <div className="space-y-3">
                  <Label htmlFor="youtube-url">
                    {INPUT_TYPES.find((t) => t.value === mode)?.label}
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="youtube-url"
                      type="url"
                      placeholder={INPUT_TYPES.find((t) => t.value === mode)?.placeholder}
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      disabled={transcribing}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTranscribe}
                      disabled={!youtubeUrl.trim() || transcribing}
                    >
                      Transcribir
                    </Button>
                  </div>

                  {transcribing && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-secondary border-t-primary" />
                      Transcribiendo la prédica...
                    </div>
                  )}

                  {transcribeError && <p className="text-sm break-words text-destructive">{transcribeError}</p>}

                  {hasTranscript && (
                    <div className="space-y-2 rounded-md bg-secondary/40 p-4">
                      <Badge variant="secondary">Transcripción completa: {transcriptWordCount} palabras</Badge>
                      <p className="text-sm break-words text-muted-foreground">{transcriptPreview}…</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="input-text">
                    {INPUT_TYPES.find((t) => t.value === mode)?.label}
                  </Label>
                  <Textarea
                    id="input-text"
                    required
                    rows={4}
                    placeholder={INPUT_TYPES.find((t) => t.value === mode)?.placeholder}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>
              )}

              {showRestOfForm && (
                <form onSubmit={handlePreviewSubmit} className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Traducción bíblica</Label>
                      <Select value={translation} onValueChange={setTranslation}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSLATIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Ocasión</Label>
                      <Select value={occasion} onValueChange={setOccasion}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OCCASIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duración</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="custom-instructions">Instrucciones adicionales (opcional)</Label>
                      <span className="text-xs text-muted-foreground">
                        {customInstructions.length}/{CUSTOM_INSTRUCTIONS_MAX}
                      </span>
                    </div>
                    <Textarea
                      id="custom-instructions"
                      rows={3}
                      maxLength={CUSTOM_INSTRUCTIONS_MAX}
                      disabled={!canUseCustomInstructions}
                      placeholder={
                        canUseCustomInstructions
                          ? 'Ej: Enfócate en los jóvenes / Incluye referencias a la crisis económica / Quiero un tono más profético / Mi congregación está en proceso de duelo / Hazlo más reflexivo y menos didáctico'
                          : 'Personaliza cada generación — Plan Mensajero'
                      }
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                    />
                    {!canUseCustomInstructions && (
                      <UpgradePrompt variant="inline" requiredPlan="mensajero" />
                    )}
                  </div>

                  {!hasGenerationsLeft && (
                    <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      Has alcanzado el límite de generaciones de tu plan. Actualiza tu plan para continuar.
                    </p>
                  )}

                  {previewError && (
                    <div className="space-y-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <p>{previewError}</p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={fetchPreview}
                          className="font-medium underline underline-offset-2"
                        >
                          Reintentar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerate(false)}
                          className="font-medium underline underline-offset-2"
                        >
                          Generar sin preview
                        </button>
                      </div>
                    </div>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" size="lg" className="w-full" disabled={!hasGenerationsLeft || !inputText.trim()}>
                    Ver enfoque propuesto
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PreviewLoading() {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
      <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-secondary border-t-primary" />
      Analizando tu mensaje...
    </div>
  )
}

function PreviewCard({
  preview,
  editable,
  editedTitulo,
  setEditedTitulo,
  editedTesis,
  setEditedTesis,
  editedPuntos,
  setEditedPuntos,
  onConfirm,
  onRegenerate,
  onBack,
}) {
  const updatePunto = (index, value) => {
    setEditedPuntos((prev) => prev.map((p, i) => (i === index ? value : p)))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Enfoque propuesto</p>
        {editable ? (
          <Input
            value={editedTitulo}
            onChange={(e) => setEditedTitulo(e.target.value)}
            className="text-lg font-semibold"
          />
        ) : (
          <p className="text-lg font-semibold text-foreground">{preview.titulo_propuesto}</p>
        )}
      </div>

      {!editable && (
        <UpgradePrompt variant="inline" requiredPlan="mensajero" message="Edita el enfoque con el Plan Mensajero" />
      )}

      <div className="space-y-2">
        <Label>Tesis</Label>
        {editable ? (
          <Textarea rows={2} value={editedTesis} onChange={(e) => setEditedTesis(e.target.value)} />
        ) : (
          <p className="text-sm text-foreground">{preview.tesis}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tensión humana</Label>
        <p className="text-sm text-muted-foreground">{preview.tension_humana}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label className="mr-1">Intención pastoral</Label>
        {preview.intencion_pastoral && <Badge>{preview.intencion_pastoral}</Badge>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Pasaje central</Label>
          <p className="text-sm text-foreground">{preview.pasaje_central}</p>
        </div>

        <div className="space-y-2">
          <Label>Pasajes de apoyo</Label>
          <div className="flex flex-wrap gap-2">
            {(preview.pasajes_apoyo ?? []).map((ref) => (
              <Badge key={ref} variant="secondary">{ref}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Puntos sugeridos</Label>
        {editable ? (
          <div className="space-y-2">
            {editedPuntos.map((punto, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-sm text-muted-foreground">{index + 1}.</span>
                <Input value={punto} onChange={(e) => updatePunto(index, e.target.value)} />
              </div>
            ))}
          </div>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
            {(preview.puntos_sugeridos ?? []).map((punto, index) => (
              <li key={index}>{punto}</li>
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-2">
        <Label>Audiencia</Label>
        <p className="text-sm text-muted-foreground">{preview.audiencia_sugerida}</p>
      </div>

      <div className="space-y-3 pt-2">
        <Button type="button" size="lg" className="w-full" onClick={onConfirm}>
          Generar mi kerygma con este enfoque
        </Button>
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={onRegenerate}>
          Proponer otro enfoque
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Volver al input
        </button>
      </div>
    </div>
  )
}

function GeneratingOverlay({ messageIndex }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background px-4 text-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      <p key={messageIndex} className="animate-in fade-in duration-500 text-xl font-medium text-foreground">
        {LOADING_MESSAGES[messageIndex]}
      </p>
      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  )
}
