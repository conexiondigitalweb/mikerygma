import { supabase } from '@/lib/supabase'

// Registro simple de eventos de producto en la tabla `events` (ver migración
// 011_events_log.sql) — pensado para medir en qué paso del embudo de
// generación se atascan los usuarios (menos del 20% de los registrados
// completa una generación). No bloquea ni afecta el flujo que instrumenta:
// cualquier fallo al insertar se registra en consola y se ignora.
export async function logEvent(eventName, metadata = null) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { error } = await supabase.from('events').insert({
    user_id: session?.user?.id ?? null,
    event_name: eventName,
    metadata,
  })

  if (error) {
    console.error(`Error registrando evento "${eventName}":`, error)
  }
}
