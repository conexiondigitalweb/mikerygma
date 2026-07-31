// Captura de parámetros UTM (utm_source, utm_campaign, utm_medium) del
// primer contacto del usuario con el sitio, para saber qué ángulo de
// anuncio de Meta Ads trajo cada registro — hoy no hay ningún tracking de
// origen, así que no se puede cruzar performance publicitaria con
// activación real.
//
// Atribución "first-touch": se guarda una sola vez en localStorage (no
// sessionStorage, para que sobreviva aunque el usuario tarde varios minutos
// u horas en completar el registro) y NUNCA se sobreescribe una vez
// guardado — si alguien entra por un anuncio, navega, y vuelve más tarde
// sin UTM en la URL (ej. escribiendo mikerygma.com directo), se conserva el
// origen real que lo trajo la primera vez, en vez de perderlo.

const UTM_STORAGE_KEY = 'mikerygma_utm_params'
const UTM_FIELDS = ['utm_source', 'utm_campaign', 'utm_medium']

// Se llama una sola vez al cargar la app (ver App.jsx). Si la URL de esta
// carga no trae ningún parámetro UTM, o si ya había uno guardado de una
// visita anterior, no hace nada.
export function captureUtmParams() {
  try {
    if (localStorage.getItem(UTM_STORAGE_KEY)) return

    const params = new URLSearchParams(window.location.search)
    const found = {}
    for (const field of UTM_FIELDS) {
      const value = params.get(field)
      if (value) found[field] = value
    }

    if (Object.keys(found).length > 0) {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(found))
    }
  } catch {
    // localStorage no disponible (modo privado, cuota excedida, etc.) — no es crítico
  }
}

// Se usa en Onboarding.jsx al guardar el perfil. Devuelve {} si nunca se
// capturó nada (usuario que no vino de un anuncio, o localStorage no disponible).
export function getStoredUtmParams() {
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
