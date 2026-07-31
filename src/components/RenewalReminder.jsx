import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildWhatsAppLink, identityLine } from '@/lib/whatsapp'
import { trackLead } from '@/lib/metaPixel'
import { logEvent } from '@/lib/events'
import { openWompiCheckout } from '@/lib/wompi'

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
//
// A diferencia de DowngradeNotice, acá SÍ se sabe qué plan renovar — el
// usuario todavía no ha bajado a free, `plan` es su plan vigente — así que
// "Renovar ahora" puede abrir el widget de Wompi directamente, con
// WhatsApp como link secundario de respaldo.
export function RenewalReminder({ userId, plan, planLabel, daysLeft, fullName, email, onDismiss }) {
  const [paying, setPaying] = useState(false)
  const [wompiError, setWompiError] = useState('')

  const id = identityLine({ fullName, email })
  const dayWord = daysLeft === 1 ? 'día' : 'días'
  const renewalMessage = id
    ? `Hola, ${id}. Mi plan ${planLabel} vence en ${daysLeft} ${dayWord} y quiero renovarlo para no perder el acceso.`
    : `Hola, mi plan ${planLabel} vence en ${daysLeft} ${dayWord} y quiero renovarlo para no perder el acceso.`

  const handleWompiPay = async () => {
    setWompiError('')
    setPaying(true)
    try {
      const response = await fetch('/api/wompi/create-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId }),
      })
      const data = await response.json()

      if (!response.ok) {
        setWompiError(data.error ?? 'No se pudo iniciar el pago con Wompi.')
        return
      }

      logEvent('click_wompi_pago', { source: 'renewal_reminder', plan })

      await openWompiCheckout({
        publicKey: data.publicKey,
        amountInCents: data.amountInCents,
        reference: data.reference,
        signature: data.signature,
        redirectUrl: `${window.location.origin}/pago-exitoso`,
      })
    } catch (err) {
      console.error('Error iniciando pago con Wompi (renovación):', err)
      setWompiError('No se pudo conectar con Wompi. Intenta de nuevo o usa el link de WhatsApp de abajo.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Tu plan {planLabel} vence en <strong>{daysLeft} {dayWord}</strong>. Renueva (paga la siguiente mensualidad)
          para seguir disfrutando de tus beneficios sin interrupciones.
        </span>
      </p>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:ml-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDismiss}>
            Entendido
          </Button>
          <Button size="sm" disabled={paying} onClick={handleWompiPay}>
            {paying ? 'Abriendo Wompi...' : 'Renovar ahora'}
          </Button>
        </div>
        <a
          href={buildWhatsAppLink(renewalMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-900/70 underline underline-offset-2 hover:text-amber-900 dark:text-amber-200/70 dark:hover:text-amber-200"
          onClick={() => {
            trackLead()
            logEvent('click_whatsapp_pago', { source: 'renewal_reminder' })
          }}
        >
          ¿Prefieres pagar por WhatsApp?
        </a>
        {wompiError && <p className="text-xs text-destructive">{wompiError}</p>}
      </div>
    </div>
  )
}

export default RenewalReminder
