import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  ROLES,
  DENOMINATIONS,
  TRANSLATIONS,
  PLANS,
  PASTORAL_TONES,
  TARGET_AUDIENCES,
  THEOLOGICAL_CENTERS,
  TEACHING_STYLES,
  CONFRONTATION_LEVELS,
  APPLICATION_TYPES,
  PASTORAL_CLOSINGS,
} from '@/lib/constants'
import { canUseFeature } from '@/lib/planHelpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { cn } from '@/lib/utils'

const PASTORAL_INSTRUCTIONS_MAX = 1000
const PHRASES_TO_AVOID_MAX = 500

export function Profile() {
  const { user } = useAuth()
  const location = useLocation()
  const adnSectionRef = useRef(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('pastor')
  const [denomination, setDenomination] = useState('')
  const [denominationOther, setDenominationOther] = useState('')
  const [translation, setTranslation] = useState('RVR1960')
  const [country, setCountry] = useState('')
  const [churchName, setChurchName] = useState('')
  const [theologicalCenter, setTheologicalCenter] = useState('')
  const [teachingStyle, setTeachingStyle] = useState('')
  const [pastoralTone, setPastoralTone] = useState('')
  const [confrontationLevel, setConfrontationLevel] = useState('')
  const [applicationType, setApplicationType] = useState('')
  const [pastoralClosing, setPastoralClosing] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [phrasesToAvoid, setPhrasesToAvoid] = useState('')
  const [pastoralInstructions, setPastoralInstructions] = useState('')

  useEffect(() => {
    if (!user) return

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [user])

  const startEditing = () => {
    setFullName(profile?.full_name ?? '')
    setRole(profile?.role ?? 'pastor')
    setDenomination(profile?.denomination ?? '')
    setDenominationOther(profile?.denomination_other ?? '')
    setTranslation(profile?.preferred_translation ?? 'RVR1960')
    setCountry(profile?.country ?? '')
    setChurchName(profile?.church_name ?? '')
    setTheologicalCenter(profile?.theological_center ?? '')
    setTeachingStyle(profile?.teaching_style ?? '')
    setPastoralTone(profile?.pastoral_tone ?? '')
    setConfrontationLevel(profile?.confrontation_level ?? '')
    setApplicationType(profile?.application_type ?? '')
    setPastoralClosing(profile?.pastoral_closing ?? '')
    setTargetAudience(profile?.target_audience ?? '')
    setPhrasesToAvoid(profile?.phrases_to_avoid ?? '')
    setPastoralInstructions(profile?.pastoral_instructions ?? '')
    setError('')
    setEditing(true)
  }

  // Entrada directa desde AdnPastoralPrompt.jsx (Dashboard): el link a
  // /profile#adn-pastoral debe abrir el formulario de edición ya en modo
  // edición y llevar el scroll a esa sección específica, no solo a la página.
  useEffect(() => {
    if (!loading && profile && location.hash === '#adn-pastoral') {
      startEditing()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile])

  useEffect(() => {
    if (editing && location.hash === '#adn-pastoral') {
      adnSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editing, location.hash])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const updates = {
      id: user.id,
      full_name: fullName,
      role,
      denomination,
      denomination_other: denomination === 'otro' ? denominationOther.trim() || null : null,
      preferred_translation: translation,
      country,
      church_name: churchName || null,
      theological_center: theologicalCenter || null,
      teaching_style: teachingStyle || null,
      pastoral_tone: pastoralTone || null,
      confrontation_level: confrontationLevel || null,
      application_type: applicationType || null,
      pastoral_closing: pastoralClosing || null,
      target_audience: targetAudience || null,
      phrases_to_avoid: phrasesToAvoid || null,
      pastoral_instructions: pastoralInstructions || null,
    }

    const { error } = await supabase.from('profiles').upsert(updates)

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    setProfile((prev) => ({ ...prev, ...updates }))
    setEditing(false)
  }

  if (loading) {
    return <div className="px-4 py-16 text-center text-muted-foreground">Cargando...</div>
  }

  const userPlan = profile?.plan ?? 'free'
  const hasFullAdn = canUseFeature(userPlan, 'full_adn_pastoral')

  const denominationLabel =
    profile?.denomination === 'otro' && profile?.denomination_other
      ? profile.denomination_other
      : DENOMINATIONS.find((d) => d.value === profile?.denomination)?.label
  const roleLabel = ROLES.find((r) => r.value === profile?.role)?.label
  const translationLabel = TRANSLATIONS.find((t) => t.value === profile?.preferred_translation)?.label
  const planLabel = PLANS[profile?.plan]?.name ?? profile?.plan
  const theologicalCenterLabel = THEOLOGICAL_CENTERS.find((t) => t.value === profile?.theological_center)?.label
  const teachingStyleLabel = TEACHING_STYLES.find((t) => t.value === profile?.teaching_style)?.label
  const pastoralToneLabel = PASTORAL_TONES.find((t) => t.value === profile?.pastoral_tone)?.label
  const confrontationLevelLabel = CONFRONTATION_LEVELS.find((c) => c.value === profile?.confrontation_level)?.label
  const applicationTypeLabel = APPLICATION_TYPES.find((a) => a.value === profile?.application_type)?.label
  const pastoralClosingLabel = PASTORAL_CLOSINGS.find((c) => c.value === profile?.pastoral_closing)?.label
  const targetAudienceLabel = TARGET_AUDIENCES.find((a) => a.value === profile?.target_audience)?.label

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 break-words">
            <CardTitle className="text-2xl">Mi perfil</CardTitle>
            <CardDescription className="break-words">{user?.email}</CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" className="shrink-0" onClick={startEditing}>
              Editar perfil
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Nombre completo</Label>
                <Input
                  id="full-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <LabeledSelect label="Rol" placeholder="Selecciona tu rol" value={role} onValueChange={setRole} options={ROLES} />

              <LabeledSelect
                label="Traducción bíblica preferida"
                placeholder="Selecciona una traducción"
                value={translation}
                onValueChange={setTranslation}
                options={TRANSLATIONS}
              />

              <LabeledSelect
                label="Denominación"
                placeholder="Selecciona tu denominación"
                value={denomination}
                onValueChange={setDenomination}
                options={DENOMINATIONS}
              />

              {denomination === 'otro' && (
                <div className="space-y-2">
                  <Label htmlFor="denomination-other">¿Cuál es tu denominación? (opcional)</Label>
                  <Input
                    id="denomination-other"
                    placeholder="Escribe el nombre de tu denominación o movimiento"
                    value={denominationOther}
                    onChange={(e) => setDenominationOther(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="church-name">Nombre de tu iglesia (opcional)</Label>
                <Input
                  id="church-name"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                />
              </div>

              <Separator />

              <div ref={adnSectionRef}>
                <GroupHeader
                  title="Tu identidad ministerial"
                  description="Define qué verdad bíblica suele ser el eje de tu ministerio y cómo enseñas."
                />
              </div>

              <LockableGroup
                locked={!hasFullAdn}
                message="Configura tu ADN pastoral para que cada mensaje suene a ti. Disponible en el Plan Mensajero."
              >
                <LabeledSelect
                  label="Centro teológico"
                  placeholder="Selecciona tu centro teológico"
                  value={theologicalCenter}
                  onValueChange={setTheologicalCenter}
                  options={THEOLOGICAL_CENTERS}
                />
                <LabeledSelect
                  label="Estilo de enseñanza"
                  placeholder="Selecciona tu estilo de enseñanza"
                  value={teachingStyle}
                  onValueChange={setTeachingStyle}
                  options={TEACHING_STYLES}
                />
              </LockableGroup>

              <Separator />

              <GroupHeader
                title="Tu forma de comunicar"
                description="Configura cómo te comunicas con tu congregación. Esto afecta el tono, las aplicaciones y los cierres de cada generación."
              />

              <LockableGroup
                locked={!hasFullAdn}
                message="Configura tu ADN pastoral para que cada mensaje suene a ti. Disponible en el Plan Mensajero."
              >
                <LabeledSelect
                  label="Tono preferido"
                  placeholder="Selecciona tu tono preferido"
                  value={pastoralTone}
                  onValueChange={setPastoralTone}
                  options={PASTORAL_TONES}
                />
                <LabeledSelect
                  label="Nivel de confrontación"
                  placeholder="Selecciona tu nivel de confrontación"
                  value={confrontationLevel}
                  onValueChange={setConfrontationLevel}
                  options={CONFRONTATION_LEVELS}
                />
                <LabeledSelect
                  label="Tipo de aplicación preferida"
                  placeholder="Selecciona el tipo de aplicación"
                  value={applicationType}
                  onValueChange={setApplicationType}
                  options={APPLICATION_TYPES}
                />
                <LabeledSelect
                  label="Forma de cierre"
                  placeholder="Selecciona cómo sueles cerrar"
                  value={pastoralClosing}
                  onValueChange={setPastoralClosing}
                  options={PASTORAL_CLOSINGS}
                />
              </LockableGroup>

              <Separator />

              <GroupHeader
                title="Personalización avanzada"
                description="Entre más específico seas, más personalizado será tu contenido. Estas preferencias se aplican automáticamente a cada generación."
              />

              <LockableGroup
                locked={!hasFullAdn}
                message="Configura tu ADN pastoral para que cada mensaje suene a ti. Disponible en el Plan Mensajero."
              >
                <LabeledSelect
                  label="Audiencia principal"
                  placeholder="Selecciona tu audiencia principal"
                  value={targetAudience}
                  onValueChange={setTargetAudience}
                  options={TARGET_AUDIENCES}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="phrases-to-avoid">Frases o enfoques que prefieres evitar</Label>
                    <span className="text-xs text-muted-foreground">
                      {phrasesToAvoid.length}/{PHRASES_TO_AVOID_MAX}
                    </span>
                  </div>
                  <Textarea
                    id="phrases-to-avoid"
                    rows={3}
                    maxLength={PHRASES_TO_AVOID_MAX}
                    placeholder="Ej: Evito frases como 'Dios tiene un plan perfecto para ti' sin contexto. No uso lenguaje que culpabilice a quienes sufren."
                    value={phrasesToAvoid}
                    onChange={(e) => setPhrasesToAvoid(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pastoral-instructions">
                    Describe tu estilo y las características de tu congregación. Entre más específico seas, más
                    personalizado será tu mensaje.
                  </Label>
                  <Textarea
                    id="pastoral-instructions"
                    rows={4}
                    maxLength={PASTORAL_INSTRUCTIONS_MAX}
                    placeholder="Ej: Mi estilo es conversacional, uso muchas preguntas retóricas. Mi congregación es de clase trabajadora en una ciudad pequeña de Colombia. Prefiero ilustraciones de la vida cotidiana y del campo. Siempre incluyo un momento de oración guiada."
                    value={pastoralInstructions}
                    onChange={(e) => setPastoralInstructions(e.target.value)}
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {pastoralInstructions.length}/{PASTORAL_INSTRUCTIONS_MAX}
                  </p>
                </div>
              </LockableGroup>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <ProfileRow label="Nombre completo" value={profile?.full_name} />
              <ProfileRow label="Rol" value={roleLabel} />
              <ProfileRow label="Traducción preferida" value={translationLabel} />
              <ProfileRow label="Denominación" value={denominationLabel} />
              <ProfileRow label="País" value={profile?.country} />
              <ProfileRow label="Iglesia" value={profile?.church_name || '—'} />
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Plan actual</span>
                <Badge variant="secondary">{planLabel}</Badge>
              </div>

              <Separator />

              <GroupHeader
                title="Tu identidad ministerial"
                description="Define qué verdad bíblica suele ser el eje de tu ministerio y cómo enseñas."
              />
              <LockableGroup
                locked={!hasFullAdn}
                message="Configura tu ADN pastoral para que cada mensaje suene a ti. Disponible en el Plan Mensajero."
              >
                <ProfileRow label="Centro teológico" value={theologicalCenterLabel} />
                <ProfileRow label="Estilo de enseñanza" value={teachingStyleLabel} />
              </LockableGroup>

              <Separator />

              <GroupHeader
                title="Tu forma de comunicar"
                description="Configura cómo te comunicas con tu congregación. Esto afecta el tono, las aplicaciones y los cierres de cada generación."
              />
              <LockableGroup
                locked={!hasFullAdn}
                message="Configura tu ADN pastoral para que cada mensaje suene a ti. Disponible en el Plan Mensajero."
              >
                <ProfileRow label="Tono preferido" value={pastoralToneLabel} />
                <ProfileRow label="Nivel de confrontación" value={confrontationLevelLabel} />
                <ProfileRow label="Tipo de aplicación preferida" value={applicationTypeLabel} />
                <ProfileRow label="Forma de cierre" value={pastoralClosingLabel} />
              </LockableGroup>

              <Separator />

              <GroupHeader
                title="Personalización avanzada"
                description="Entre más específico seas, más personalizado será tu contenido. Estas preferencias se aplican automáticamente a cada generación."
              />
              <LockableGroup
                locked={!hasFullAdn}
                message="Configura tu ADN pastoral para que cada mensaje suene a ti. Disponible en el Plan Mensajero."
              >
                <ProfileRow label="Audiencia principal" value={targetAudienceLabel} />
                <div className="break-words">
                  <span className="text-sm font-medium text-foreground">Frases o enfoques a evitar</span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile?.phrases_to_avoid || '—'}
                  </p>
                </div>
                <div className="break-words">
                  <span className="text-sm font-medium text-foreground">Instrucciones permanentes</span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile?.pastoral_instructions || '—'}
                  </p>
                </div>
              </LockableGroup>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function GroupHeader({ title, description }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function LockableGroup({ locked, message, children }) {
  return (
    <div className="relative">
      <div className={cn('space-y-4', locked && 'pointer-events-none opacity-50 select-none')}>
        {children}
      </div>
      {locked && <UpgradePrompt variant="overlay" message={message} requiredPlan="mensajero" />}
    </div>
  )
}

function LabeledSelect({ label, placeholder, value, onValueChange, options }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="shrink-0 text-sm font-medium text-foreground">{label}</span>
      <span className="break-words text-sm text-muted-foreground sm:text-right">{value || '—'}</span>
    </div>
  )
}
