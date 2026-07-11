// Formato wa.me: solo dígitos, sin "+" ni espacios.
const WHATSAPP_NUMBER = '573184351614' // +57 318 435 1614

export function buildWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

// Frase de identificación para que el mensaje llegue con nombre/correo listos
// para ubicar al usuario de inmediato (ej. "soy Ana Pérez (ana@correo.com)").
// null si no hay sesión — el mensaje queda genérico, sin datos personales.
export function identityLine({ fullName, email } = {}) {
  if (!email) return null
  return fullName ? `soy ${fullName} (${email})` : `mi correo es ${email}`
}
