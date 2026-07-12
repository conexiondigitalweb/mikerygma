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
  denomination_other TEXT, -- solo si denomination = 'otro'; texto libre del usuario, ver buildPrompt() en api/generate.js
  preferred_translation TEXT DEFAULT 'RVR1960', -- RVR1960, NVI, DHH, LBLA, NTV, TLA
  country TEXT,
  church_name TEXT,
  plan TEXT DEFAULT 'free', -- free, mensajero ($9/mes), proclamador ($19/mes)
  generations_used INTEGER DEFAULT 0,
  generations_limit INTEGER DEFAULT 3, -- free=3, mensajero=15, proclamador=40
  plan_started_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- fecha de activación del plan ACTUAL; ancla del ciclo de facturación para planes pagos (free se ancla a created_at) — ver src/lib/billingCycle.js (Sesión 12)
  generations_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- inicio del ciclo de generaciones vigente; se recalcula en cada request a api/generate.js y api/preview.js
  downgraded_at TIMESTAMPTZ, -- se llena cuando el sistema hace downgrade automático a free por falta de renovación; el frontend muestra un aviso mientras no sea NULL
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
  title TEXT, -- título del sermón/contenido generado, extraído del output (Sesión 8)
  status TEXT DEFAULT 'borrador', -- borrador, revisado, predicado, publicado, archivado
  tags TEXT[], -- etiquetas libres, ej: ['gracia', 'familia', 'juventud']
  is_favorite BOOLEAN DEFAULT false,
  preached_date DATE, -- fecha en que se predicó (nullable)
  notes TEXT, -- notas personales del pastor sobre esta generación (nullable)
  pasaje_central TEXT, -- extraído del output del sermón, para indexación y búsqueda de reutilización
  output_lexicon_notes JSONB, -- notas léxicas griego/hebreo (Sesión 10), array de { strong, lexema, transliteracion, significado_original, aplicacion_pastoral } o null
  lexicon_notes_status TEXT DEFAULT 'not_attempted', -- included, not_applicable, no_data, timeout, error, not_attempted (ver X-Lexicon-Status en api/generate.js)
  passage_paraphrased BOOLEAN NOT NULL DEFAULT false, -- true si texto_completo_pasaje vino de la 3ra capa de degradación (parafraseo) porque Sonnet y Haiku bloquearon la cita textual por content-filter
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Tabla: scripture_usage — control de pasajes usados (Sesión 8)
-- ============================================================
CREATE TABLE scripture_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES generations(id) ON DELETE CASCADE,
  reference TEXT NOT NULL, -- ej: "Salmo 23", "Juan 3:16-21"
  book TEXT NOT NULL, -- ej: "Salmo", "Juan"
  chapter INTEGER, -- ej: 23, 3
  verse_start INTEGER, -- ej: 1, 16
  verse_end INTEGER, -- ej: null, 21
  usage_type TEXT DEFAULT 'central', -- 'central' o 'apoyo'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Tabla: theological_review_log — log de la auto-revisión teológica
-- post-generación (Sesión 9). Sin FK a `generations`: la revisión corre en
-- api/generate.js antes de que exista esa fila. Es un log de monitoreo en
-- agregado, no una unión por sermón.
-- ============================================================
CREATE TABLE theological_review_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL, -- modelo que generó el sermón (claude-sonnet-4-6 o claude-haiku-4-5 por fallback)
  review_model TEXT NOT NULL, -- modelo que corrió la revisión (claude-haiku-4-5)
  was_corrected BOOLEAN NOT NULL DEFAULT false,
  issues_found INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security)
-- Patrón: BYPASSRLS y GRANT son capas separadas — siempre hacer ambas.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripture_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE theological_review_log ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users update own generations" ON generations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own scripture_usage" ON scripture_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own scripture_usage" ON scripture_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own scripture_usage" ON scripture_usage
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own theological_review_log" ON theological_review_log
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- GRANT explícito (necesario aunque service_role tenga BYPASSRLS)
-- ============================================================
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON generations TO authenticated;
GRANT ALL ON scripture_usage TO authenticated;
GRANT ALL ON theological_review_log TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON generations TO service_role;
GRANT ALL ON scripture_usage TO service_role;
GRANT ALL ON theological_review_log TO service_role;

-- Índice para la consulta de reutilización de pasajes (libro + capítulo, por usuario)
CREATE INDEX scripture_usage_user_book_chapter_idx ON scripture_usage (user_id, book, chapter);
