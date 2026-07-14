import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildWhatsAppLink, identityLine } from '@/lib/whatsapp'

// Aviso PREVIO de vencimiento (ver Dashboard.jsx): se muestra 5 días o menos
// antes de que termine el ciclo vigente de un plan pago, para que el usuario
// pueda renovar a tiempo en vez de enterarse recién con DowngradeNotice,
// que solo aparece DESPUÉS de que ya perdió el acceso.
//
// Distinto de DowngradeNotice en mensaje y tono (aviso, no advertencia de
// algo ya perdido) y en el mensaje de WhatsApp (renovación anticipada, no
// reactivación de un plan ya caído). "Entendido" solo descarta por la sesión
// actual vía sessionStorage (ver Dashboard.jsx) — no hay forma de descartarlo
// para siempre, porque el usuario podría olvidarlo y perder el acceso sin
// más avisos hasta el día del vencimiento.
export function RenewalReminder({ planLabel, daysLeft, fullName, email, onDismiss }) {
  const id = identityLine({ fullName, email })
  const dayWord = daysLeft === 1 ? 'día' : 'días'
  const renewalMessage = id
    ? `Hola, ${id}. Mi plan ${planLabel} vence en ${daysLeft} ${dayWord} y quiero renovarlo para no perder el acceso.`
    : `Hola, mi plan ${planLabel} vence en ${daysLeft} ${dayWord} y quiero renovarlo para no perder el acceso.`

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Tu plan {planLabel} vence en <strong>{daysLeft} {dayWord}</strong>. Renueva (paga la siguiente mensualidad)
          para seguir disfrutando de tus beneficios sin interrupciones.
        </span>
      </p>
      <div className="flex shrink-0 gap-2 sm:ml-4">
        <Button size="sm" variant="outline" onClick={onDismiss}>
          Entendido
        </Button>
        <Button size="sm" asChild>
          <a href={buildWhatsAppLink(renewalMessage)} target="_blank" rel="noopener noreferrer">
            Renovar ahora
          </a>
        </Button>
      </div>
    </div>
  )
}

export default RenewalReminder
