import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const MIN_PASSWORD_LENGTH = 6

// Ruta pública /reset-password (ver App.jsx) a la que redirige el enlace del
// correo "Restablecer contraseña" de Supabase. Al llegar desde ese enlace,
// supabase-js ya deja una sesión de recuperación activa automáticamente
// (detectSessionInUrl, ver src/lib/supabase.js) — por eso esta página no
// pide la contraseña actual, solo la nueva. Si no hay sesión (enlace
// inválido/expirado, o alguien navega acá directo), se muestra un aviso en
// vez del formulario.
export function ResetPassword() {
  const { user, loading: authLoading, updatePassword } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: updateError } = await updatePassword(password)
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    // updateUser() conserva la sesión de recuperación como una sesión normal
    // ya autenticada (confirmado: Supabase no la invalida al cambiar la
    // contraseña) — llevar al usuario directo al Dashboard es mejor
    // experiencia que pedirle loguearse de nuevo con la contraseña que
    // acaba de escribir.
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Cargando...</div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enlace inválido o expirado</CardTitle>
            <CardDescription>
              Este enlace de restablecimiento de contraseña ya no es válido. Solicita uno nuevo desde la pantalla de
              inicio de sesión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Volver al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Establece tu nueva contraseña</CardTitle>
          <CardDescription>Elige una contraseña segura para tu cuenta de MiKerygma.</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-sm text-foreground">Contraseña actualizada. Te estamos llevando a tu panel...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <PasswordInput
                  id="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirma tu nueva contraseña</Label>
                <PasswordInput
                  id="confirm-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPassword
