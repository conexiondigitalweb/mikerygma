-- MiKerygma — Log de eventos de producto (embudo de generación)
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)
--
-- Instrumenta 4 eventos del flujo de generación (ver src/lib/events.js y
-- src/pages/Generate.jsx) para diagnosticar en qué paso se atascan los
-- usuarios registrados que nunca completan una generación: vio_pantalla_generar,
-- click_generar, generacion_completada, error_generacion.

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON events TO authenticated;
GRANT ALL ON events TO service_role;

CREATE INDEX events_user_id_event_name_idx ON events (user_id, event_name);
CREATE INDEX events_created_at_idx ON events (created_at DESC);
