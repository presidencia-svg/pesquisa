-- Migration 031 — leads de patrocínio institucional B2B
-- (aplicada via mcp__supabase__apply_migration em 2026-06-06)

CREATE TABLE IF NOT EXISTS public.interessados_patrocinio (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa         text NOT NULL,
  cnpj            text,
  contato_nome    text NOT NULL,
  contato_email   text NOT NULL,
  contato_telefone text,
  cota            text NOT NULL CHECK (cota IN ('ouro', 'prata')),
  mensagem        text,
  status          text NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo', 'em_contato', 'firmado', 'recusado')),
  ip              text,
  user_agent      text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interessados_patrocinio_status_idx
  ON interessados_patrocinio (status, criado_em DESC);

ALTER TABLE interessados_patrocinio ENABLE ROW LEVEL SECURITY;

CREATE POLICY interessados_deny_anon ON interessados_patrocinio
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY interessados_deny_authenticated ON interessados_patrocinio
  AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
