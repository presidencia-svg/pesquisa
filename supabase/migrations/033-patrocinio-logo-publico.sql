-- Migration 033 — exibição pública de patrocinadores firmados
-- (aplicada via mcp__supabase__apply_migration em 2026-06-06)
ALTER TABLE interessados_patrocinio
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS site_url text,
  ADD COLUMN IF NOT EXISTS mostrar_publico boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS interessados_publicaveis_idx
  ON interessados_patrocinio (cota, criado_em)
  WHERE status = 'firmado' AND mostrar_publico = true AND logo_url IS NOT NULL;
