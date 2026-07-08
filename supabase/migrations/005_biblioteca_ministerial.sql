-- MiKerygma — Sesión 8: Biblioteca Ministerial
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)

-- ============================================================
-- Nuevas columnas en generations (organización, estado, notas)
-- ============================================================
ALTER TABLE generations
  ADD COLUMN title TEXT, -- título del sermón/contenido generado, extraído del output
  ADD COLUMN status TEXT DEFAULT 'borrador', -- borrador, revisado, predicado, publicado, archivado
  ADD COLUMN tags TEXT[], -- etiquetas libres, ej: ['gracia', 'familia', 'juventud']
  ADD COLUMN is_favorite BOOLEAN DEFAULT false,
  ADD COLUMN preached_date DATE, -- fecha en que se predicó (nullable)
  ADD COLUMN notes TEXT, -- notas personales del pastor sobre esta generación (nullable)
  ADD COLUMN pasaje_central TEXT; -- extraído del output del sermón, para indexación y búsqueda de reutilización

-- La biblioteca necesita que el usuario autenticado pueda actualizar sus propias
-- generaciones (estado, tags, favorito, fecha de predicación, notas) desde el cliente.
-- Hasta ahora solo existían políticas de SELECT e INSERT para generations.
CREATE POLICY "Users update own generations" ON generations
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- Tabla: scripture_usage — control de pasajes usados
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

ALTER TABLE scripture_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scripture_usage" ON scripture_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own scripture_usage" ON scripture_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own scripture_usage" ON scripture_usage
  FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON scripture_usage TO authenticated;
GRANT ALL ON scripture_usage TO service_role;

-- Índice para la consulta de reutilización de pasajes (libro + capítulo, por usuario)
CREATE INDEX scripture_usage_user_book_chapter_idx ON scripture_usage (user_id, book, chapter);
