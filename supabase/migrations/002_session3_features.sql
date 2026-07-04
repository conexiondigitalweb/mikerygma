-- MiKerygma — Sesión 3: instrucciones por generación, estilo pastoral, modo YouTube
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)

-- ============================================================
-- Feature 1: Instrucciones adicionales por generación
-- ============================================================
ALTER TABLE generations
  ADD COLUMN custom_instructions TEXT;

-- ============================================================
-- Feature 2: Mi estilo pastoral
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN pastoral_tone TEXT,
  ADD COLUMN target_audience TEXT,
  ADD COLUMN pastoral_instructions TEXT;

-- Feature 3 (modo YouTube) no requiere columnas nuevas: reutiliza
-- generations.input_type ('youtube') y generations.input_text (transcripción).
