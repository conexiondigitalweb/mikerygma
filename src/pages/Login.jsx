import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

export function Login() {
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

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
    setEmail('')
    setPassword('')
    setError('')
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
                      <Label htmlFor="login-password">Contraseña</Label>
                      <Input
                        id="login-password"
                        type="password"
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
                      <Input
                        id="signup-password"
                        type="password"
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
