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
export async function openWompiCheckout({ publicKey, amountInCents, reference, signature, redirectUrl }) {
  await loadWidgetScript()

  const checkout = new window.WidgetCheckout({
    currency: 'COP',
    amountInCents,
    reference,
    publicKey,
    signature: { integrity: signature },
    redirectUrl,
  })

  return new Promise((resolve) => {
    checkout.open((result) => resolve(result))
  })
}
