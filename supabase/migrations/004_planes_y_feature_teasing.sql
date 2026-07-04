-- MiKerygma — Sesión 5: sistema de diferenciación de planes (feature teasing)
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)

-- Actualiza el default de generations_limit para nuevos perfiles: 3 (plan Gratis)
ALTER TABLE profiles ALTER COLUMN generations_limit SET DEFAULT 3;

-- Nota: este cambio solo afecta a los perfiles que se creen a partir de ahora.
-- Si quieres normalizar los límites de usuarios existentes según su plan actual,
-- puedes ejecutar (opcional, revisa antes de correrlo en producción):
--
-- UPDATE profiles SET generations_limit = 3  WHERE plan = 'free'       AND generations_limit = 5;
-- UPDATE profiles SET generations_limit = 15 WHERE plan = 'mensajero'  AND generations_limit = 50;
-- UPDATE profiles SET generations_limit = 40 WHERE plan = 'proclamador' AND generations_limit = -1;
