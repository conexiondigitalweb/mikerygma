import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { ROLES, DENOMINATIONS, TRANSLATIONS, PLANS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('pastor')
  const [denomination, setDenomination] = useState('')
  const [translation, setTranslation] = useState('RVR1960')
  const [country, setCountry] = useState('')
  const [churchName, setChurchName] = useState('')

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
    setTranslation(profile?.preferred_translation ?? 'RVR1960')
    setCountry(profile?.country ?? '')
    setChurchName(profile?.church_name ?? '')
    setError('')
    setEditing(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const updates = {
      id: user.id,
      full_name: fullName,
      role,
      denomination,
      preferred_translation: translation,
      country,
      church_name: churchName || null,
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

  const denominationLabel = DENOMINATIONS.find((d) => d.value === profile?.denomination)?.label
  const roleLabel = ROLES.find((r) => r.value === profile?.role)?.label
  const translationLabel = TRANSLATIONS.find((t) => t.value === profile?.preferred_translation)?.label
  const planLabel = PLANS[profile?.plan]?.name ?? profile?.plan

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Mi perfil</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
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

              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona tu rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Denominación</Label>
                <Select value={denomination} onValueChange={setDenomination}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona tu denominación" />
                  </SelectTrigger>
                  <SelectContent>
                    {DENOMINATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Traducción bíblica preferida</Label>
                <Select value={translation} onValueChange={setTranslation}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una traducción" />
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
              <ProfileRow label="Denominación" value={denominationLabel} />
              <ProfileRow label="Traducción preferida" value={translationLabel} />
              <ProfileRow label="País" value={profile?.country} />
              <ProfileRow label="Iglesia" value={profile?.church_name || '—'} />
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Plan actual</span>
                <Badge variant="secondary">{planLabel}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground">{value || '—'}</span>
    </div>
  )
}
