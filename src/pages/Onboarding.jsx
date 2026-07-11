import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { DENOMINATIONS, TRANSLATIONS, ROLES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

export function Onboarding() {
  const { user } = useAuth()
  const { refreshProfile } = useProfile()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('pastor')
  const [denomination, setDenomination] = useState('')
  const [denominationOther, setDenominationOther] = useState('')
  const [translation, setTranslation] = useState('RVR1960')
  const [country, setCountry] = useState('')
  const [churchName, setChurchName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      email: user.email,
      role,
      denomination,
      denomination_other: denomination === 'otro' ? denominationOther.trim() || null : null,
      preferred_translation: translation,
      country,
      church_name: churchName || null,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    await refreshProfile()
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl">¡Perfil creado!</CardTitle>
            <CardDescription>
              Para que tus generaciones suenen más a ti, configura tu ADN pastoral en tu perfil.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full" asChild>
              <Link to="/profile">Configurar mi ADN pastoral</Link>
            </Button>
            <Button className="w-full" variant="outline" onClick={() => navigate('/dashboard')}>
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Cuéntanos sobre ti</CardTitle>
          <CardDescription>
            Esto nos ayuda a personalizar tus generaciones desde el primer mensaje.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar y continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
