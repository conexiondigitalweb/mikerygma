-- MiKerygma — Tercera capa de degradación por content-filter: pasaje parafraseado
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)
--
-- Cuando Sonnet Y el fallback de Haiku bloquean el mismo pasaje por content
-- filtering (confirmado con Lucas 15:11-32: el bloqueo ocurría citando el
-- texto bíblico textual), api/generate.js reintenta una vez más pidiendo que
-- texto_completo_pasaje se PARAFRASEE en vez de citarse palabra por palabra,
-- dejando el resto del sermón (puntos, ilustraciones, oración) sin cambios.
-- Esta columna registra si ese tercer intento fue el que ganó, para: (a)
-- monitorear qué tan seguido se activa (igual que theological_review_log),
-- y (b) que Result.jsx pueda avisarle al pastor que ese campo específico no
-- es cita textual y debe verificarla en su Biblia antes de usarla en público.

ALTER TABLE generations
  ADD COLUMN passage_paraphrased BOOLEAN NOT NULL DEFAULT false;
