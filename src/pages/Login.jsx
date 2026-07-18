import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

export function Login() {
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const { signIn, signUp, signInWithGoogle, resetPasswordForEmail } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  // Vista de "¿Olvidaste tu contraseña?" — se maneja como una tercera card
  // dentro de este mismo componente (igual patrón que registrationSuccess),
  // en vez de una ruta nueva, porque es un paso intermedio del mismo flujo
  // de login, no un destino que alguien navegue directamente.
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/dashboard')
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setRegistrationSuccess(true)
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
  }

  const handleBackToLogin = () => {
    setRegistrationSuccess(false)
    setShowForgotPassword(false)
    setForgotPasswordSent(false)
    setForgotEmail('')
    setEmail('')
    setPassword('')
    setError('')
  }

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Mismo criterio de seguridad que usa Supabase para signup: no revelar si
    // el correo existe. resetPasswordForEmail() ya no distingue el caso "no
    // existe" con un error propio, así que mostramos el mismo mensaje de
    // confirmación pase lo que pase, salvo un fallo real de conexión.
    try {
      await resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    } catch {
      setLoading(false)
      setError('No se pudo conectar con el servidor. Intenta de nuevo.')
      return
    }
    setLoading(false)
    setForgotPasswordSent(true)
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bienvenido a MiKerygma</CardTitle>
          <CardDescription>Tu asistente de IA para la proclamación del Evangelio</CardDescription>
        </CardHeader>
        <CardContent>
          {registrationSuccess ? (
            <Card className="border-none shadow-none">
              <CardContent className="flex flex-col items-center gap-3 text-center px-0 py-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF8F0]">
                  <MailCheck className="h-7 w-7 text-[#B8860B]" />
                </div>
                <h3 className="text-lg font-semibold text-[#4A3728]">¡Registro exitoso!</h3>
                <p className="text-sm text-[#4A3728]">
                  Revisa tu bandeja de entrada (y la carpeta de spam) para confirmar tu correo electrónico.
                </p>
                <p className="text-xs text-[#8B7355]">
                  Si usas Gmail, también puedes registrarte directamente con Google.
                </p>
                <Button className="w-full" onClick={handleBackToLogin}>
                  Volver al inicio de sesión
                </Button>
              </CardContent>
            </Card>
          ) : showForgotPassword ? (
            <Card className="border-none shadow-none">
              <CardContent className="flex flex-col items-center gap-3 px-0 py-2 text-center">
                {forgotPasswordSent ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF8F0]">
                      <MailCheck className="h-7 w-7 text-[#B8860B]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#4A3728]">Revisa tu correo</h3>
                    <p className="text-sm text-[#4A3728]">
                      Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
                      Revisa tu bandeja de entrada (y la carpeta de spam).
                    </p>
                    <Button className="w-full" onClick={handleBackToLogin}>
                      Volver al inicio de sesión
                    </Button>
                  </>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} className="w-full space-y-4 text-left">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-foreground">¿Olvidaste tu contraseña?</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ingresa tu correo y te enviaremos un enlace para restablecerla.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Correo electrónico</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
                    </Button>
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Volver al inicio de sesión
                    </button>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Tabs defaultValue={defaultTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="signup">Registrarse</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Correo electrónico</Label>
                      <Input
                        id="login-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Contraseña</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setError('')
                            setShowForgotPassword(true)
                          }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <PasswordInput
                        id="login-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Ingresando...' : 'Iniciar sesión'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Correo electrónico</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Contraseña</Label>
                      <PasswordInput
                        id="signup-password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-6 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">O CONTINÚA CON</span>
                <Separator className="flex-1" />
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogle}>
                Continuar con Google
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          Al continuar aceptas nuestros términos y política de privacidad.
        </CardFooter>
      </Card>
    </div>
  )
}
