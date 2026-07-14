// Ciclos de facturación mensuales y reseteo de generations_used. No hay cron
// jobs configurados (Vercel Hobby), así que el reseteo se evalúa de forma
// perezosa: api/generate.js y api/preview.js llaman a
// resolveGenerationsCycle() apenas leen el perfil de Supabase, ANTES de
// cualquier validación de límite o feature-gating, y persisten `updates` si
// `changed` es true.
//
// Ancla del ciclo (ver también CLAUDE.md):
// - Plan free: aniversario mensual de profiles.created_at (fecha de registro).
// - Planes pagos (mensajero/proclamador): aniversario mensual de
//   profiles.plan_started_at (fecha de activación de ESE plan — no del
//   registro original).
//
// "Renovación" hoy, sin pasarela de pago automática, es actualizar
// plan_started_at a mano en Supabase. Si el ciclo de un plan pago vence y
// plan_started_at sigue siendo el mismo valor con el que empezó ese ciclo
// (nadie lo renovó), se interpreta como no-renovación y se hace downgrade
// automático a free — ver el caso 'downgrade' abajo.
//
// Prorrateo de upgrades (mensajero -> proclamador a mitad de ciclo): no hay
// checkout automático todavía, así que esto se resuelve calculando el cobro
// a mano, pero los datos ya están disponibles para ese cálculo:
//   diasRestantes = ceil((currentCycleStart(plan_started_at, ahora) + 1 mes) - ahora, en días)
//   creditoPlanViejo = (PLANS[planViejo].price / 30) * diasRestantes
//   cargoPlanNuevo   = (PLANS[planNuevo].price / 30) * diasRestantes
//   cobroProrrateo   = cargoPlanNuevo - creditoPlanViejo
// Al aplicar el upgrade, plan_started_at se actualiza a la fecha del cambio
// (igual que una renovación), lo que además reinicia el ciclo del plan nuevo.

const FREE_PLAN = 'free'
const FREE_GENERATIONS_LIMIT = 3

function cycleAnchor(profile) {
  return profile.plan === FREE_PLAN ? profile.created_at : (profile.plan_started_at ?? profile.created_at)
}

// Suma `months` meses a `date`, ajustando al último día del mes destino si el
// día original no existe ahí (ej. 31 de enero + 1 mes -> 28/29 de febrero, no
// "3 de marzo" como haría un setMonth() sin ajustar).
function addMonthsClamped(date, months) {
  const d = new Date(date)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const daysInTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, daysInTargetMonth))
  return d
}

// Encuentra el inicio del ciclo mensual vigente: el aniversario de `anchor`
// más reciente que ya pasó (o es igual a `now`). El número de iteraciones es
// el número de meses realmente transcurridos desde el ancla — acotado y
// barato incluso para cuentas abandonadas por mucho tiempo.
export function currentCycleStart(anchor, now) {
  let cycleStart = new Date(anchor)
  while (addMonthsClamped(cycleStart, 1) <= now) {
    cycleStart = addMonthsClamped(cycleStart, 1)
  }
  return cycleStart
}

// Días que faltan para que termine el ciclo vigente (redondeado hacia
// arriba: "2.1 días restantes" cuenta como 3, para no decir "vence en 2 días"
// cuando en realidad vence mañana pasado el mediodía). Se usa para el aviso
// previo de vencimiento (ver AdnPastoralPrompt.jsx como precedente de banner
// puramente informativo) — reutiliza currentCycleStart/cycleAnchor en vez de
// duplicar la lógica de ancla ya usada por resolveGenerationsCycle.
export function daysUntilCycleEnd(profile, now = new Date()) {
  const anchor = new Date(cycleAnchor(profile))
  const cycleStart = currentCycleStart(anchor, now)
  const cycleEnd = addMonthsClamped(cycleStart, 1)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.ceil((cycleEnd - now) / msPerDay)
}

// Dado un perfil recién leído de Supabase, decide si su ciclo de
// generaciones venció y qué cambios aplicar. NUNCA escribe en la base de
// datos — solo calcula; quien llama decide cómo persistir `updates`.
export function resolveGenerationsCycle(profile, now = new Date()) {
  const anchor = new Date(cycleAnchor(profile))
  const lastReset = new Date(profile.generations_reset_at ?? anchor)
  const cycleStart = currentCycleStart(anchor, now)

  const cycleExpired = lastReset < cycleStart
  if (!cycleExpired) {
    return { changed: false, profile }
  }

  if (profile.plan === FREE_PLAN) {
    const updates = { generations_used: 0, generations_reset_at: cycleStart.toISOString() }
    return { changed: true, event: 'reset', profile: { ...profile, ...updates }, updates }
  }

  // Plan pago vencido sin renovación -> downgrade automático a free. El
  // ancla del nuevo ciclo free es created_at, no la del plan que se acaba de
  // perder.
  const freeCycleStart = currentCycleStart(new Date(profile.created_at), now)
  const updates = {
    plan: FREE_PLAN,
    generations_limit: FREE_GENERATIONS_LIMIT,
    generations_used: 0,
    generations_reset_at: freeCycleStart.toISOString(),
    downgraded_at: now.toISOString(),
  }
  return { changed: true, event: 'downgrade', profile: { ...profile, ...updates }, updates }
}
