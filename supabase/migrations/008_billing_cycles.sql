-- MiKerygma — Ciclos de facturación y reseteo mensual de generaciones
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)
--
-- Hasta ahora generations_used solo se incrementaba (api/save-generation.js)
-- y nunca volvía a 0, así que cualquier usuario que agotara su límite quedaba
-- bloqueado para siempre. Con estas columnas, api/generate.js y api/preview.js
-- calculan en cada request si el ciclo mensual del usuario ya venció (ver
-- src/lib/billingCycle.js) y, si es así, resetean el contador o hacen
-- downgrade automático a free si era un plan pago sin renovación.
--
-- Reglas de negocio (ver también CLAUDE.md):
-- - Plan free: el ciclo se ancla a created_at (aniversario del registro).
-- - Planes pagos (mensajero/proclamador): el ciclo se ancla a
--   plan_started_at (aniversario de activación de ESE plan, no del registro).
-- - Sin pasarela de pago automática todavía: "renovar" un plan pago hoy es
--   actualizar plan_started_at a mano en Supabase. Si el ciclo vence y
--   plan_started_at no cambió, se asume no-renovación y se hace downgrade.

ALTER TABLE profiles
  ADD COLUMN plan_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN generations_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN downgraded_at TIMESTAMPTZ; -- se llena cuando el sistema hace un downgrade automático; el frontend muestra un aviso mientras no sea NULL (ver DowngradeNotice.jsx) y lo limpia cuando el usuario lo descarta

COMMENT ON COLUMN profiles.plan_started_at IS 'Fecha de activación del plan ACTUAL. Ancla del ciclo de facturación para planes pagos — ver resolveGenerationsCycle() en src/lib/billingCycle.js. Para el plan free el ancla real es created_at, no esta columna. También sirve como fecha de contrato para calcular prorrateo de upgrades (ver comentario en billingCycle.js).';
COMMENT ON COLUMN profiles.generations_reset_at IS 'Inicio del ciclo de generaciones actualmente vigente. Se recalcula automáticamente en cada request a api/generate.js y api/preview.js.';
COMMENT ON COLUMN profiles.downgraded_at IS 'Timestamp del último downgrade automático por falta de renovación. NULL si nunca hubo uno o el usuario ya lo descartó.';

-- Perfiles existentes: no hay forma de saber retroactivamente cuándo se
-- activó su plan actual, así que se asume que empezó en el registro. Para
-- usuarios free esto no importa (su ancla real siempre es created_at); para
-- quienes ya tengan un plan pago, este valor debe corregirse a mano una vez
-- (UPDATE profiles SET plan_started_at = '<fecha real de pago>' WHERE id = '<id>')
-- si se conoce la fecha real de activación.
UPDATE profiles SET plan_started_at = created_at, generations_reset_at = created_at;
