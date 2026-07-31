import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { buildPlanActivationUpdate } from '../../src/lib/billingCycle.js'

const PLAN_GENERATIONS_LIMIT = {
  mensajero: 15,
  proclamador: 40,
}

// Coincide exactamente con buildReference() en create-signature.js:
// mikerygma-<uuid del usuario>-<plan>-<uuid de la transacción>.
const REFERENCE_REGEX =
  /^mikerygma-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(mensajero|proclamador)-[0-9a-f-]+$/i

function parseReference(reference) {
  const match = REFERENCE_REGEX.exec(reference ?? '')
  if (!match) return null
  return { userId: match[1], plan: match[2] }
}

// Resuelve un valor a partir de un path con puntos (ej. "transaction.id")
// dentro del objeto `data` del evento — Wompi indica en
// `event.signature.properties` exactamente qué campos entran en el checksum
// y en qué orden, así que esto no asume una lista fija.
function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

// Checksum de eventos de Wompi: SHA-256 de la concatenación (en el orden
// que indica `signature.properties`) de los valores de esas propiedades
// dentro de `data`, seguido del timestamp del evento y el secreto de
// eventos. Ver: https://docs.wompi.co/docs/colombia/eventos/
function isValidEventSignature(event, eventsKey) {
  const { signature, timestamp, data } = event ?? {}
  if (!signature?.checksum || !signature?.properties || !timestamp || !data) return false

  const concatenated = signature.properties.map((path) => resolvePath(data, path)).join('')
  const expected = createHash('sha256').update(`${concatenated}${timestamp}${eventsKey}`).digest('hex')

  return expected.toLowerCase() === String(signature.checksum).toLowerCase()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const eventsKey = process.env.WOMPI_EVENTS_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!eventsKey || !supabaseUrl || !serviceRoleKey) {
    console.error('wompi/webhook: configuración del servidor incompleta.')
    // Falla nuestra, no de la notificación — igual respondemos 200 para no
    // generar una tormenta de reintentos de Wompi por un problema que un
    // reintento no va a resolver.
    res.status(200).json({ received: true })
    return
  }

  const event = req.body ?? {}

  // Firma inválida: rechazamos rápido con 401 — a diferencia de un fallo
  // interno nuestro, reintentar esto nunca lo va a arreglar, así que no hay
  // razón para fingir un 200.
  if (!isValidEventSignature(event, eventsKey)) {
    console.error('wompi/webhook: firma de evento inválida, se ignora.')
    res.status(401).json({ error: 'Firma inválida.' })
    return
  }

  // A partir de acá, la firma ya es válida — cualquier otro problema
  // (transacción no reconocible, error de base de datos) se registra pero
  // siempre responde 200, según las buenas prácticas de webhooks de Wompi
  // (evitar timeouts/reintentos duplicados por errores que no son de ellos).
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const transaction = event.data?.transaction ?? {}
    const parsedRef = parseReference(transaction.reference)

    const logRow = {
      wompi_transaction_id: transaction.id ?? null,
      reference: transaction.reference ?? null,
      user_id: parsedRef?.userId ?? null,
      plan: parsedRef?.plan ?? null,
      status: transaction.status ?? 'UNKNOWN',
      amount_in_cents: transaction.amount_in_cents ?? null,
      raw_event: event,
    }

    await supabaseAdmin.from('wompi_payment_events').insert(logRow).then(({ error }) => {
      if (error) console.error('wompi/webhook: error registrando el evento de pago:', error)
    })

    if (transaction.status !== 'APPROVED') {
      // DECLINED, ERROR, VOIDED (o cualquier otro estado): ya quedó
      // registrado arriba, no se activa nada.
      res.status(200).json({ received: true })
      return
    }

    if (!parsedRef) {
      console.error('wompi/webhook: transacción APPROVED con referencia no reconocible:', transaction.reference)
      res.status(200).json({ received: true })
      return
    }

    const activatedAt = transaction.finalized_at ? new Date(transaction.finalized_at) : new Date(event.timestamp * 1000)
    const updates = buildPlanActivationUpdate(parsedRef.plan, PLAN_GENERATIONS_LIMIT[parsedRef.plan], activatedAt)

    const { error: updateError } = await supabaseAdmin.from('profiles').update(updates).eq('id', parsedRef.userId)
    if (updateError) {
      console.error('wompi/webhook: error activando el plan tras pago APPROVED:', updateError)
    }
  } catch (err) {
    console.error('wompi/webhook: error inesperado procesando el evento:', err)
  }

  res.status(200).json({ received: true })
}
