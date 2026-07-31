-- MiKerygma — Log de eventos de pago de Wompi
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)
--
-- api/wompi/webhook.js inserta una fila por cada notificación recibida
-- (APPROVED, DECLINED, ERROR, VOIDED, etc.), no solo las fallidas — así
-- queda un registro completo de auditoría de pagos, tanto exitosos como no,
-- sin depender de logs de Vercel que expiran. La activación real del plan
-- ocurre en `profiles` (ver buildPlanActivationUpdate en billingCycle.js);
-- esta tabla es de solo lectura para diagnóstico, nunca se lee para decidir
-- nada en el flujo de la app.

CREATE TABLE wompi_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT, -- mensajero, proclamador — extraído de la referencia, null si no se pudo parsear
  reference TEXT,
  wompi_transaction_id TEXT,
  status TEXT NOT NULL, -- APPROVED, DECLINED, ERROR, VOIDED, etc. (el status tal cual lo manda Wompi)
  amount_in_cents INTEGER,
  raw_event JSONB, -- payload completo del evento, para depurar sin depender de logs de Vercel
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wompi_payment_events ENABLE ROW LEVEL SECURITY;

-- Sin políticas de SELECT/INSERT para `authenticated`: esta tabla solo la
-- escribe el webhook (service_role, que tiene BYPASSRLS) y solo la lee el
-- propio Doiler desde el SQL Editor — no hay ningún flujo de la app donde
-- un usuario deba ver sus propios eventos de pago.
GRANT ALL ON wompi_payment_events TO service_role;

CREATE INDEX wompi_payment_events_user_id_idx ON wompi_payment_events (user_id);
CREATE INDEX wompi_payment_events_created_at_idx ON wompi_payment_events (created_at DESC);
