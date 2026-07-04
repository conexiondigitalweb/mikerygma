-- MiKerygma — Sesión 4: Perfil ministerial 2.0 (ADN pastoral)
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)

ALTER TABLE profiles
  ADD COLUMN theological_center TEXT,
  ADD COLUMN teaching_style TEXT,
  ADD COLUMN confrontation_level TEXT,
  ADD COLUMN application_type TEXT,
  ADD COLUMN pastoral_closing TEXT,
  ADD COLUMN phrases_to_avoid TEXT;
