import { createHash, randomUUID } from 'node:crypto'

// Montos en centavos COP — independientes de PLANS[key].price en
// src/lib/constants.js (que muestra el precio en USD para el flujo de
// WhatsApp existente, sin tocar). Wompi cobra en COP, así que estos son los
// valores reales que se firman y se cobran.
const PLAN_AMOUNTS_COP_CENTS = {
  mensajero: 2990000, // $29.900 COP
  proclamador: 6290000, // $62.900 COP
}

const PLAN_GENERATIONS_LIMIT = {
  mensajero: 15,
  proclamador: 40,
}

// La referencia codifica userId + plan + un identificador único, para que
// api/wompi/webhook.js pueda recuperar a quién y qué plan activar a partir
// ÚNICAMENTE de la referencia que Wompi devuelve en el evento — sin
// necesitar una tabla de "pagos pendientes" para este paso.
function buildReference(userId, plan) {
  return `mikerygma-${userId}-${plan}-${randomUUID()}`
}

// Firma de integridad exigida por Wompi para abrir el widget: SHA-256 de
// referencia + monto en centavos + moneda + secreto de integridad,
// concatenados tal cual, sin separadores. Ver:
// https://docs.wompi.co/docs/colombia/widget-checkout-web/#firma-de-integridad
function buildIntegritySignature({ reference, amountInCents, currency, integrityKey }) {
  const raw = `${reference}${amountInCents}${currency}${integrityKey}`
  return createHash('sha256').update(raw).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { plan, userId } = req.body ?? {}

  if (!plan || !userId || !PLAN_AMOUNTS_COP_CENTS[plan]) {
    res.status(400).json({ error: 'Faltan campos requeridos: plan (mensajero/proclamador) y userId.' })
    return
  }

  const publicKey = process.env.WOMPI_PUBLIC_KEY
  const integrityKey = process.env.WOMPI_INTEGRITY_KEY

  if (!publicKey || !integrityKey) {
    res.status(500).json({ error: 'Configuración de Wompi incompleta en el servidor.' })
    return
  }

  const amountInCents = PLAN_AMOUNTS_COP_CENTS[plan]
  const currency = 'COP'
  const reference = buildReference(userId, plan)
  const signature = buildIntegritySignature({ reference, amountInCents, currency, integrityKey })

  // publicKey SÍ es seguro exponer al frontend (es la llave pública del
  // widget de Wompi) — WOMPI_INTEGRITY_KEY y WOMPI_PRIVATE_KEY nunca salen
  // de este endpoint.
  res.status(200).json({
    reference,
    amountInCents,
    currency,
    signature,
    publicKey,
    generationsLimit: PLAN_GENERATIONS_LIMIT[plan],
  })
}
