// Wrapper centralizado sobre window.fbq (Meta Pixel, ver index.html para el
// snippet base) — los componentes llaman a estas funciones en vez de
// window.fbq directamente, para no tener que tocar cada punto de instrumentación
// si algún día cambiamos de proveedor de analítica.
//
// fbq puede no existir todavía (bloqueadores de anuncios, el script de Meta
// aún cargando, SSR) — cada función revisa que sea una función antes de
// llamarla, para que un evento de tracking nunca rompa la app.
function fbq(...args) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq(...args)
}

// El snippet base en index.html ya dispara el primer PageView al cargar la
// app — esto es para los cambios de ruta posteriores en la SPA (ver
// useMetaPixelPageView en App.jsx), que un snippet estático nunca puede ver
// porque no hay recargas de página completas.
export function trackPageView() {
  fbq('track', 'PageView')
}

// Se dispara cuando un usuario termina exitosamente el flujo de registro/
// onboarding (ver Onboarding.jsx).
export function trackCompleteRegistration() {
  fbq('track', 'CompleteRegistration')
}

// Se dispara al hacer clic en un enlace de WhatsApp que expresa intención de
// pago (activar/renovar un plan) — ver Pricing.jsx, DowngradeNotice.jsx,
// RenewalReminder.jsx. NO se dispara en el enlace genérico de soporte del
// Footer, que no es una intención de pago.
export function trackLead() {
  fbq('track', 'Lead')
}

// Se dispara al visitar /pricing (ver Pricing.jsx).
export function trackViewContent() {
  fbq('track', 'ViewContent')
}
