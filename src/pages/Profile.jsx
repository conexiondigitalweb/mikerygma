import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { DENOMINATIONS, TRANSLATIONS, PLANS } from '@/lib/constants'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div className="px-4 py-16 text-center text-muted-foreground">Cargando...</div>
  }

  const denominationLabel = DENOMINATIONS.find((d) => d.value === profile?.denomination)?.label
  const translationLabel = TRANSLATIONS.find((t) => t.value === profile?.preferred_translation)?.label
  const planLabel = PLANS[profile?.plan]?.name ?? profile?.plan

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Mi perfil</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileRow label="Nombre completo" value={profile?.full_name} />
          <ProfileRow label="Rol" value={profile?.role} />
          <ProfileRow label="Denominación" value={denominationLabel} />
          <ProfileRow label="Traducción preferida" value={translationLabel} />
          <ProfileRow label="País" value={profile?.country} />
          <ProfileRow label="Iglesia" value={profile?.church_name || '—'} />
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Plan actual</span>
            <Badge variant="secondary">{planLabel}</Badge>
          </div>
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
