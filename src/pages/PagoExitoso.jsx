import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

// A dónde vuelve el navegador tras cerrar el widget de Wompi (ver
// redirectUrl en src/lib/wompi.js / Pricing.jsx). La activación REAL del
// plan ocurre de forma asíncrona en api/wompi/webhook.js — esta pantalla no
// confirma el pago por sí misma, solo refresca el perfil por si el webhook
// ya alcanzó a procesarse para cuando el usuario llega acá.
export function PagoExitoso() {
  const { refreshProfile } = useProfile()
  const [refreshed, setRefreshed] = useState(false)

  useEffect(() => {
    refreshProfile().finally(() => setRefreshed(true))
  }, [refreshProfile])

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">¡Gracias por tu pago!</CardTitle>
          <CardDescription>
            Estamos confirmando tu transacción con Wompi. Tu plan se activa automáticamente en cuanto se confirme —
            normalmente toma solo unos segundos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button className="w-full" asChild>
            <Link to="/dashboard">Ir a mi Dashboard</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            {refreshed
              ? 'Si tu plan todavía aparece como el anterior, espera un momento y recarga el Dashboard.'
              : 'Verificando el estado de tu cuenta...'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default PagoExitoso
