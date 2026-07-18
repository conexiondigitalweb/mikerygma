import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { buildWhatsAppLink, identityLine } from '@/lib/whatsapp'
import { trackLead } from '@/lib/metaPixel'

// Se muestra cuando profiles.downgraded_at no es null — el sistema bajó
// automáticamente al usuario a plan free porque su plan pago venció sin
// renovación (ver resolveGenerationsCycle en src/lib/billingCycle.js).
// "Descartar" limpia downgraded_at a null; no hay email todavía (Resend
// pendiente de depuración SMTP, ver CLAUDE.md), así que este banner es hoy
// la única notificación — el usuario la ve la próxima vez que entra.
//
// "Renovar plan" abre WhatsApp en vez de /pricing: no hay pasarela de pago
// automática todavía, así que la renovación se coordina manualmente. NOTA:
// el downgrade sobreescribe profiles.plan a 'free' sin dejar registro de
// cuál era el plan pago anterior (ni billingCycle.js ni ninguna otra tabla
// lo guardan), así que el mensaje no puede nombrar el plan específico.
export function DowngradeNotice({ userId, fullName, email, onDismiss }) {
  const handleDismiss = async () => {
    await supabase.from('profiles').update({ downgraded_at: null }).eq('id', userId)
    onDismiss?.()
  }

  const id = identityLine({ fullName, email })
  const renewalMessage = id
    ? `Hola, ${id}. Mi plan venció y quiero renovarlo en MiKerygma.`
    : 'Hola, mi plan venció y quiero renovarlo en MiKerygma.'

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <span>
          Tu plan pago venció y tu cuenta pasó al Plan Gratis (3 generaciones/mes). Perdiste el acceso a tu Biblioteca
          completa, ADN Pastoral y demás beneficios de tu plan anterior.
        </span>
      </p>
      <div className="flex shrink-0 gap-2 sm:ml-4">
        <Button size="sm" variant="outline" onClick={handleDismiss}>
          Entendido
        </Button>
        <Button size="sm" asChild>
          <a href={buildWhatsAppLink(renewalMessage)} target="_blank" rel="noopener noreferrer" onClick={trackLead}>
            Renovar plan
          </a>
        </Button>
      </div>
    </div>
  )
}

export default DowngradeNotice
