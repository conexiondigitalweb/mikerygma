-- MiKerygma — Denominación específica cuando el usuario elige "Otra"
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)
--
-- "Otra" en el selector de denominación (src/lib/constants.js) no dejaba
-- aclarar cuál era la denominación real del usuario — quedaba indistinguible
-- de dejar el campo vacío, y ambos caían en el mismo bloque genérico
-- "INTERDENOMINACIONAL / OTRA" del prompt (ver GUÍAS DE ÉNFASIS
-- DENOMINACIONAL en api/generate.js). Este campo libre le da al modelo una
-- pista adicional sin necesitar una guía de énfasis escrita a mano para cada
-- denominación posible.

ALTER TABLE profiles
  ADD COLUMN denomination_other TEXT; -- solo relevante cuando denomination = 'otro'; texto libre del usuario, ver buildPrompt() en api/generate.js
