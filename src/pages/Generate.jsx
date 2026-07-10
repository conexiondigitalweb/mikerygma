import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { INPUT_TYPES, TRANSLATIONS, OCCASIONS, DURATIONS, LOADING_MESSAGES } from '@/lib/constants'
import { canUseFeature } from '@/lib/planHelpers'
import { parseReference } from '@/lib/scriptureParser'
import { cleanJsonResponse, repairTruncatedJson } from '@/lib/jsonRepair'
import { STREAM_ERROR_MARKER } from '@/lib/streamMarkers'
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
const PREVIEW_STORAGE_KEY = 'mikerygma_preview_state'

function readStoredPreview() {
  try {
    const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function savePreviewState(state) {
  try {
    sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // sessionStorage no disponible (modo privado, cuota excedida, etc.) — no es crítico
  }
}

function clearPreviewState() {
  try {
    sessionStorage.removeItem(PREVIEW_STORAGE_KEY)
  } catch {
    // no-op
  }
}

const GENERATING_STORAGE_KEY = 'mikerygma_generating'

function setGeneratingFlag() {
  try {
    sessionStorage.setItem(GENERATING_STORAGE_KEY, 'true')
  } catch {
    // no-op
  }
}

function clearGeneratingFlag() {
  try {
    sessionStorage.removeItem(GENERATING_STORAGE_KEY)
  } catch {
    // no-op
  }
}

// Se lee y limpia una sola vez al montar: si el valor era "true", una generación
// quedó en curso cuando el usuario se fue (remount por foco, cierre de pestaña, etc.)
// — no se puede saber si terminó, así que solo se avisa y se manda a la biblioteca.
function consumeGeneratingFlag() {
  try {
    const wasGenerating = sessionStorage.getItem(GENERATING_STORAGE_KEY) === 'true'
    if (wasGenerating) sessionStorage.removeItem(GENERATING_STORAGE_KEY)
    return wasGenerating
  } catch {
    return false
  }
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MODE_FEATURE_KEYS = {
  pasaje: 'mode_pasaje',
  tema: 'mode_tema',
  situacion: 'mode_situacion',
  youtube: 'mode_youtube',
}

function friendlyStreamError(reason) {
  const normalized = (reason || '').toLowerCase()
  if (normalized.includes('content filtering') || normalized.includes('blocked')) {
    return 'El servicio de IA interrumpió la generación por sus filtros de contenido. Esto puede pasar con ciertos pasajes bíblicos. Intenta con instrucciones adicionales como "enfócate en la gracia y la restauración" o prueba con un enfoque diferente.'
  }
  return reason || 'La IA interrumpió la generación a mitad de camino. Intenta de nuevo.'
}

export function Generate() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Se lee una sola vez por montaje: si Supabase Auth remonta este componente al
  // recuperar el foco de la pestaña, esto recupera el preview en curso.
  const [restoredPreview] = useState(() => readStoredPreview())
  const [showGenerationRecoveryNotice] = useState(() => consumeGeneratingFlag())

  const [mode, setMode] = useState(() => restoredPreview?.inputType ?? null)
  const [inputText, setInputText] = useState(() => restoredPreview?.inputText ?? '')
  const [translation, setTranslation] = useState(() => restoredPreview?.translation ?? 'RVR1960')
  const [occasion, setOccasion] = useState(() => restoredPreview?.occasion ?? 'culto_dominical')
  const [duration, setDuration] = useState(() => restoredPreview?.duration ?? 'regular')
  const [customInstructions, setCustomInstructions] = useState(() => restoredPreview?.customInstructions ?? '')

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState('')
  const [transcriptWordCount, setTranscriptWordCount] = useState(0)

  const [generating, setGenerating] = useState(false)
  const [streamedChars, setStreamedChars] = useState(0)
  const [error, setError] = useState('')
  const [messageIndex, setMessageIndex] = useState(0)
  const [lockedModalFeature, setLockedModalFeature] = useState(null)

  const [previewStep, setPreviewStep] = useState(() => Boolean(restoredPreview))
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [preview, setPreview] = useState(() => restoredPreview?.previewData ?? null)
  const [editedTitulo, setEditedTitulo] = useState(() => restoredPreview?.previewData?.titulo_propuesto ?? '')
  const [editedTesis, setEditedTesis] = useState(() => restoredPreview?.previewData?.tesis ?? '')
  const [editedPuntos, setEditedPuntos] = useState(() => {
    const puntos = restoredPreview?.previewData?.puntos_sugeridos
    return Array.isArray(puntos) ? puntos : []
  })
  const [scriptureWarning, setScriptureWarning] = useState(null)

  // Evita invocaciones concurrentes de handleGenerate (doble clic, etc.): sin esto,
  // dos streams simultáneos escriben sobre el mismo setStreamedChars y el que responde
  // más lento pisa el progreso del otro, y si cualquiera falla se corta la generación
  // "buena" que seguía en curso.
  const generatingRef = useRef(false)
  const requestIdRef = useRef(0)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    return () => abortControllerRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('preferred_translation, denomination, generations_used, generations_limit, plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        if (!restoredPreview && data?.preferred_translation) setTranslation(data.preferred_translation)
        setLoadingProfile(false)
      })
  }, [user, restoredPreview])

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
    setScriptureWarning(null)
    clearPreviewState()
  }

  const checkScriptureReuse = async (pasajeCentral) => {
    if (!pasajeCentral) {
      setScriptureWarning(null)
      return
    }

    const parsedRef = parseReference(pasajeCentral)
    const base = supabase
      .from('scripture_usage')
      .select('created_at, generations(title, created_at)')
      .eq('user_id', user.id)
      .eq('usage_type', 'central')
      .eq('book', parsedRef.book)
    const filtered = parsedRef.chapter === null ? base.is('chapter', null) : base.eq('chapter', parsedRef.chapter)

    const { data } = await filtered.order('created_at', { ascending: false }).limit(1)
    const match = data?.[0]

    setScriptureWarning(
      match?.generations
        ? { date: match.generations.created_at, title: match.generations.title || 'un mensaje anterior' }
        : null
    )
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
    setScriptureWarning(null)

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
      savePreviewState({
        previewData: data,
        inputType: mode,
        inputText: inputText.trim(),
        occasion,
        translation,
        duration,
        customInstructions: customInstructions.trim(),
      })
      checkScriptureReuse(data.pasaje_central)
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
    // Guarda de reentrancia síncrona: sin esto, un doble clic (u otro disparo
    // duplicado) antes de que React desmonte el botón lanza dos streams a la vez.
    if (generatingRef.current) return
    generatingRef.current = true
    const requestId = ++requestIdRef.current
    const isStale = () => requestIdRef.current !== requestId

    const controller = new AbortController()
    abortControllerRef.current = controller

    clearPreviewState()
    setGeneratingFlag()
    setError('')
    setGenerating(true)
    setMessageIndex(0)
    setStreamedChars(0)

    const previewContext = usePreviewContext && preview
      ? {
          titulo: editedTitulo.trim(),
          tesis: editedTesis.trim(),
          puntos: editedPuntos.map((p) => p.trim()).filter(Boolean),
        }
      : undefined

    const fail = (message) => {
      if (isStale()) return
      clearGeneratingFlag()
      setError(message)
      setGenerating(false)
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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

      if (isStale()) return

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        fail(data.error ?? 'Ocurrió un error al generar tu contenido.')
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let rawText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (isStale()) return
        if (done) break
        rawText += decoder.decode(value, { stream: true })
        setStreamedChars((prev) => Math.max(prev, rawText.length))
      }

      const markerIndex = rawText.indexOf(STREAM_ERROR_MARKER)
      if (markerIndex !== -1) {
        const reason = rawText.slice(markerIndex + STREAM_ERROR_MARKER.length).trim()
        fail(friendlyStreamError(reason))
        return
      }

      const cleanedText = cleanJsonResponse(rawText)
      let parsed
      try {
        parsed = JSON.parse(cleanedText)
      } catch (parseErr) {
        const repaired = repairTruncatedJson(cleanedText)
        if (!repaired) {
          fail('No se pudo interpretar la respuesta de la IA. Intenta de nuevo.')
          return
        }
        parsed = repaired
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (isStale()) return

      const saveResponse = await fetch('/api/save-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          user_id: user.id,
          input_type: mode,
          input_text: inputText.trim(),
          occasion,
          translation,
          custom_instructions: customInstructions.trim(),
          model_used: 'claude-sonnet-4-6',
          sermon: parsed.sermon,
          devocional: parsed.devocional,
          redes: parsed.redes,
          oracion_cierre: parsed.oracion_cierre,
        }),
      })

      const saveData = await saveResponse.json()

      if (isStale()) return

      if (!saveResponse.ok) {
        fail(saveData.error ?? 'El contenido se generó pero no se pudo guardar. Intenta de nuevo.')
        return
      }

      setProfile((prev) => (prev ? { ...prev, generations_used: prev.generations_used + 1 } : prev))
      clearGeneratingFlag()
      navigate('/result', {
        state: {
          result: {
            id: saveData.id,
            created_at: saveData.created_at,
            input_type: mode,
            input_text: inputText.trim(),
            occasion,
            translation,
            sermon: parsed.sermon,
            devocional: parsed.devocional,
            redes: parsed.redes,
            oracion_cierre: parsed.oracion_cierre,
          },
        },
      })
    } catch (err) {
      if (err?.name === 'AbortError' || isStale()) return
      fail('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      if (!isStale()) generatingRef.current = false
    }
  }

  if (generating) {
    return <GeneratingOverlay messageIndex={messageIndex} streamedChars={streamedChars} />
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

      {showGenerationRecoveryNotice && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          Tu última generación puede estar lista. Revisa tu{' '}
          <Link to="/library" className="font-medium text-primary underline underline-offset-2">
            Biblioteca
          </Link>
          .
        </div>
      )}

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
          {error && (
            <div className="space-y-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p>{error}</p>
            </div>
          )}
          {previewLoading ? (
            <PreviewLoading />
          ) : previewStep && preview ? (
            <>
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
              {scriptureWarning && (
                <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                  <p>
                    📖 Ya usaste este pasaje el {formatDate(scriptureWarning.date)} en "{scriptureWarning.title}".
                    ¿Deseas continuar o elegir otro enfoque?
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleGenerate(true)}>
                      Continuar de todos modos
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={fetchPreview}>
                      Proponer otro enfoque
                    </Button>
                  </div>
                </div>
              )}
            </>
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

      <div className="flex flex-wrap items-start gap-2">
        <Label className="mr-1">Intención pastoral</Label>
        {preview.intencion_pastoral && (
          <div className="inline-flex max-w-full items-center justify-center gap-1 rounded-full border border-transparent bg-[#D4A24E] px-2 py-0.5 text-xs font-medium whitespace-normal break-words text-[#3A2E22]">
            {preview.intencion_pastoral}
          </div>
        )}
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
          Volver al formulario
        </button>
      </div>
    </div>
  )
}

function GeneratingOverlay({ messageIndex, streamedChars }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background px-4 text-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      <p key={messageIndex} className="animate-in fade-in duration-500 text-xl font-medium text-foreground">
        {streamedChars > 0 ? 'Recibiendo tu kerygma...' : LOADING_MESSAGES[messageIndex]}
      </p>
      {streamedChars > 0 && (
        <p className="text-sm text-muted-foreground">{streamedChars} caracteres recibidos</p>
      )}
      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  )
}
