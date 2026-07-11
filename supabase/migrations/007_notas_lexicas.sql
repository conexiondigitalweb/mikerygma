-- MiKerygma — Notas léxicas (griego/hebreo original) por generación
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)
--
-- A diferencia de theological_review_log (006), esto SÍ vive en `generations`
-- porque api/save-generation.js ya es quien crea esa fila y ya recibe estos
-- datos desde el cliente (ver src/pages/Generate.jsx) — no hay problema de
-- orden como con la auto-revisión teológica, que corre antes de que exista
-- la fila.

ALTER TABLE generations
  ADD COLUMN output_lexicon_notes JSONB, -- array de { strong, lexema, transliteracion, significado_original, aplicacion_pastoral }, o null
  ADD COLUMN lexicon_notes_status TEXT DEFAULT 'not_attempted'; -- included, not_applicable, no_data, timeout, error, not_attempted (ver X-Lexicon-Status en api/generate.js)
