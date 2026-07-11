import { useEffect, useRef, useState } from 'react'

// Cada cuánto se fuerza a revisar si hay un Service Worker nuevo en el
// servidor — los navegadores no chequean solos con esta frecuencia.
const CHECK_INTERVAL_MS = 30000
const COUNTDOWN_SECONDS = 3

// Debe coincidir exactamente con GENERATING_STORAGE_KEY en src/pages/Generate.jsx.
// No se importa desde ahí a propósito — Generate.jsx es el sistema de
// generación, y este componente no debe depender de (ni arriesgar tocar) su
// lógica; se duplica la clave como un contrato de solo lectura entre ambos.
const GENERATING_STORAGE_KEY = 'mikerygma_generating'

function isGenerationInProgress() {
  try {
    return sessionStorage.getItem(GENERATING_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Lección de marcagol.live: skipWaiting + clientsClaim en el Service Worker
// (ver vite.config.js) NO bastan solos — activan la versión nueva y toman
// control de las pestañas abiertas, pero el HTML/JS ya cargado en memoria
// sigue siendo el viejo hasta que la página se recarga de verdad. Este
// componente es esa recarga forzada: escucha 'controllerchange' (la señal
// del navegador de que un Service Worker nuevo tomó control de esta
// pestaña — dispara exactamente por clientsClaim), avisa con una cuenta
// regresiva de 3s y recarga solo, sin depender de que el usuario haga clic.
// Única excepción: si hay una generación de sermón en curso (ver
// GENERATING_STORAGE_KEY), la recarga se pospone hasta que termine — nunca
// se fuerza a mitad de un streaming de generación.
export function UpdatePrompt() {
  const [updateReady, setUpdateReady] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const pendingReloadRef = useRef(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let registration = null
    // Si ya había un controller antes de este efecto, un controllerchange
    // posterior es una actualización real. Si NO había controller (primera
    // instalación del Service Worker en este dispositivo), el primer
    // controllerchange es solo la activación inicial, no una actualización
    // — no hace falta recargar ni avisar nada.
    let hadController = Boolean(navigator.serviceWorker.controller)

    const maybeShowPrompt = () => {
      if (isGenerationInProgress()) {
        pendingReloadRef.current = true
        return
      }
      pendingReloadRef.current = false
      setUpdateReady(true)
    }

    const handleControllerChange = () => {
      if (!hadController) {
        hadController = true
        return
      }
      maybeShowPrompt()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    navigator.serviceWorker.ready.then((reg) => {
      registration = reg
    })

    const interval = setInterval(() => {
      registration?.update().catch(() => {})
      // Una recarga pospuesta por una generación en curso: revisa si ya
      // terminó, con el mismo intervalo de 30s.
      if (pendingReloadRef.current && !isGenerationInProgress()) {
        maybeShowPrompt()
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!updateReady) return

    setCountdown(COUNTDOWN_SECONDS)
    const tick = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) return prev - 1

        clearInterval(tick)
        if (isGenerationInProgress()) {
          // Arrancó una generación durante la cuenta regresiva: se pospone
          // de nuevo en vez de interrumpirla.
          setUpdateReady(false)
          pendingReloadRef.current = true
          return COUNTDOWN_SECONDS
        }
        window.location.reload()
        return 0
      })
    }, 1000)

    return () => clearInterval(tick)
  }, [updateReady])

  if (!updateReady) return null

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed inset-x-0 bottom-0 z-[100] w-full border-t border-primary bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
    >
      Actualizando a la versión más reciente... ({countdown})
    </button>
  )
}

export default UpdatePrompt
