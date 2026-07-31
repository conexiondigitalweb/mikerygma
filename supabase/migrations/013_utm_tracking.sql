-- MiKerygma — Tracking de origen de anuncio (UTM) en profiles
-- Ejecutar en el SQL Editor de Supabase (proyecto de producción)
--
-- Captura utm_source/utm_campaign/utm_medium del primer contacto del
-- usuario con el sitio (ver src/lib/utmTracking.js), guardados al completar
-- el onboarding (Onboarding.jsx), para poder cruzar performance publicitaria
-- de Meta Ads (ángulo 1/2/3) con activación real. Usuarios registrados
-- antes de esta migración quedan con estos campos en NULL — no hay forma de
-- recuperar su origen retroactivamente.

ALTER TABLE profiles
  ADD COLUMN utm_source TEXT,
  ADD COLUMN utm_campaign TEXT,
  ADD COLUMN utm_medium TEXT;
