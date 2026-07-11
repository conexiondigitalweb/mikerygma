-- MiKerygma — Log de la auto-revisión teológica (post-generación)
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)
--
-- No tiene FK a `generations` porque api/generate.js corre la revisión antes
-- de que exista esa fila (la crea api/save-generation.js después, con lo que
-- envía el cliente). Este log es para monitoreo en agregado: qué tan seguido
-- se activa la corrección automática, no para unir con un sermón puntual.

CREATE TABLE theological_review_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL, -- modelo que generó el sermón (claude-sonnet-4-6 o claude-haiku-4-5 por fallback)
  review_model TEXT NOT NULL, -- modelo que corrió la revisión (claude-haiku-4-5)
  was_corrected BOOLEAN NOT NULL DEFAULT false,
  issues_found INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE theological_review_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own theological_review_log" ON theological_review_log
  FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON theological_review_log TO authenticated;
GRANT ALL ON theological_review_log TO service_role;

CREATE INDEX theological_review_log_created_at_idx ON theological_review_log (created_at DESC);
