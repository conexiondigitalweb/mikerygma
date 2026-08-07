import { logEvent } from '@/lib/events'

// Carga perezosa del script del Widget Checkout de Wompi (una sola vez, sin
// importar cuántas veces el usuario haga clic en "Pagar con Wompi") y lo
// abre embebido (modal superpuesto sobre la página actual) — no es una
// redirección a otro sitio. `redirectUrl` es solo a dónde vuelve el
// navegador DESPUÉS de que el modal se cierra, exigido por Wompi.
const WIDGET_SCRIPT_SRC = 'https://checkout.wompi.co/widget.js'

let widgetScriptPromise = null

function loadWidgetScript() {
  if (typeof window.WidgetCheckout === 'function') return Promise.resolve()
  if (widgetScriptPromise) return widgetScriptPromise

  widgetScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = WIDGET_SCRIPT_SRC
    script.onload = () => resolve()
    script.onerror = () => {
      widgetScriptPromise = null
      reject(new Error('No se pudo cargar el widget de pagos de Wompi.'))
    }
    document.head.appendChild(script)
  })

  return widgetScriptPromise
}

// `signature`/`reference`/`amountInCents`/`publicKey` vienen tal cual del
// backend (api/wompi/create-signature.js) — nunca se calculan en el
// frontend, porque eso requeriría exponer WOMPI_INTEGRITY_KEY.
//
// Instrumentación de diagnóstico (ver CLAUDE.md / diagnóstico real: clics
// de click_wompi_pago que nunca llegaron a wompi_payment_events, ni
// aprobados ni rechazados — no había forma de saber si el widget nunca se
// abría o si se abría y el problema estaba adentro):
// - wompi_checkout_abierto: el script cargó, el widget se construyó sin
//   error y se llamó a checkout.open() sin que lanzara síncronamente. Es la
//   señal más cercana a "el usuario SÍ vio el checkout" que expone la API
//   del widget — Wompi no ofrece un callback propio de "listo"/"renderizado".
// - wompi_checkout_error: el script falló en cargar (red, bloqueador de
//   contenido, etc.) o el widget lanzó un error al construirse/abrirse.
export async function openWompiCheckout({ publicKey, amountInCents, reference, signature, redirectUrl }) {
  try {
    await loadWidgetScript()
  } catch (err) {
    logEvent('wompi_checkout_error', { stage: 'script_load', message: err.message, reference })
    throw err
  }

  let checkout
  try {
    checkout = new window.WidgetCheckout({
      currency: 'COP',
      amountInCents,
      reference,
      publicKey,
      signature: { integrity: signature },
      redirectUrl,
    })
  } catch (err) {
    logEvent('wompi_checkout_error', { stage: 'widget_init', message: err.message, reference })
    throw err
  }

  return new Promise((resolve, reject) => {
    try {
      checkout.open((result) => resolve(result))
      logEvent('wompi_checkout_abierto', { reference })
    } catch (err) {
      logEvent('wompi_checkout_error', { stage: 'widget_open', message: err.message, reference })
      reject(err)
    }
  })
}
