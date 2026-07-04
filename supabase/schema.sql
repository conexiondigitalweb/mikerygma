-- MiKerygma — Esquema inicial de Supabase
-- Ejecutar en el SQL Editor de Supabase (proyecto dedicado de MiKerygma)

-- ============================================================
-- Tabla: profiles
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'pastor', -- pastor, lider, creador, otro
  denomination TEXT, -- bautista, pentecostal, presbiteriano, católico, interdenominacional, otro
  preferred_translation TEXT DEFAULT 'RVR1960', -- RVR1960, NVI, DHH, LBLA, NTV, TLA
  country TEXT,
  church_name TEXT,
  plan TEXT DEFAULT 'free', -- free, mensajero ($9/mes), proclamador ($19/mes)
  generations_used INTEGER DEFAULT 0,
  generations_limit INTEGER DEFAULT 3, -- free=3, mensajero=15, proclamador=40
  pastoral_tone TEXT, -- pastoral_calido, profetico_desafiante, academico_reflexivo, evangelistico, conversacional
  target_audience TEXT, -- general, jovenes, mujeres, familias, adultos_mayores, profesionales, rural
  pastoral_instructions TEXT, -- instrucciones permanentes de estilo, máximo 1000 caracteres (validado en frontend)
  theological_center TEXT, -- gracia, reino, discipulado, santidad, evangelismo, familia, justicia, adoracion, esperanza
  teaching_style TEXT, -- expositivo, tematico, narrativo, pastoral, apologetico, devocional
  confrontation_level TEXT, -- suave, moderado, directo, profetico
  application_type TEXT, -- practica_diaria, introspectiva, comunitaria, evangelistica, familiar
  pastoral_closing TEXT, -- llamado, oracion_guiada, reflexion, desafio, consuelo
  phrases_to_avoid TEXT, -- frases o enfoques a evitar, máximo 500 caracteres (validado en frontend)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Tabla: generations
-- ============================================================
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL, -- 'pasaje', 'tema', 'situacion', 'youtube'
  input_text TEXT NOT NULL,
  occasion TEXT NOT NULL,
  translation TEXT NOT NULL,
  custom_instructions TEXT, -- instrucciones adicionales específicas de esta generación (opcional)
  output_sermon JSONB,
  output_devotional JSONB,
  output_social JSONB,
  output_prayer TEXT,
  model_used TEXT DEFAULT 'claude-sonnet-4-6',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security)
-- Patrón: BYPASSRLS y GRANT son capas separadas — siempre hacer ambas.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users read own generations" ON generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own generations" ON generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- GRANT explícito (necesario aunque service_role tenga BYPASSRLS)
-- ============================================================
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON generations TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON generations TO service_role;
