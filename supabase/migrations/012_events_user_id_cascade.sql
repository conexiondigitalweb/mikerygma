-- MiKerygma — ON DELETE CASCADE en events.user_id
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)
--
-- La migración 011 dejó events.user_id como
-- `REFERENCES auth.users(id)` sin ON DELETE CASCADE (nombre de constraint
-- autogenerado por Postgres: events_user_id_fkey). Esto bloqueaba borrar un
-- usuario de auth.users con un error de foreign key en cuanto tuviera
-- cualquier fila en events, obligando a borrar sus eventos a mano primero
-- (confirmado al limpiar un usuario de prueba durante la verificación del
-- fix de redirect post-login). No cambia RLS ni ningún otro comportamiento
-- de la tabla.

ALTER TABLE events
  DROP CONSTRAINT events_user_id_fkey,
  ADD CONSTRAINT events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
