-- Migration 032 — adiciona cota 'diamante' ao CHECK constraint
-- (aplicada via mcp__supabase__apply_migration em 2026-06-06)

ALTER TABLE interessados_patrocinio
  DROP CONSTRAINT IF EXISTS interessados_patrocinio_cota_check;

ALTER TABLE interessados_patrocinio
  ADD CONSTRAINT interessados_patrocinio_cota_check
  CHECK (cota IN ('diamante', 'ouro', 'prata'));
