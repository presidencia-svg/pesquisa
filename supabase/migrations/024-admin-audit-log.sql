-- Migration 024 — Log de auditoria de acessos admin
--
-- Registra cada acesso a páginas/recursos sensíveis do painel admin
-- ANTES e DEPOIS da divulgação. Em caso de vazamento, permite
-- rastrear quem acessou o quê e quando.
--
-- Não cria fricção pro admin (registro é silencioso, server-side).
--
-- LGPD: o IP do admin é dado pessoal (titular = o próprio admin),
-- e fica registrado pra cumprir o art. 37 da LGPD (manutenção de
-- registros de operações de tratamento). Retenção: 1 ano após a
-- última edição encerrar — alinhada com obrigações ANPD.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao          text NOT NULL,
  -- 'view_resultados_pre_divulgacao' | 'view_eleitores' |
  -- 'view_resultados_pos_divulgacao' | 'marcar_divulgacao' |
  -- 'editar_candidato' | 'notificar_resultado' | ...
  recurso       text,
  -- Ex: id da edição, id do candidato — contexto adicional
  detalhe       jsonb,
  -- Ex: { "edicao_id": "...", "campos_lidos": [...] }
  ip            text,
  user_agent    text,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- Index pra query "últimas N ações"
CREATE INDEX IF NOT EXISTS admin_audit_log_criado_idx
  ON public.admin_audit_log (criado_em DESC);

-- Index pra query "todas as ações desse tipo"
CREATE INDEX IF NOT EXISTS admin_audit_log_acao_idx
  ON public.admin_audit_log (acao, criado_em DESC);

COMMENT ON TABLE public.admin_audit_log IS
  'Registro de operações de tratamento via painel admin (LGPD art. 37). '
  'Limpado pelo cron de retenção 1 ano após edicao.fim mais antigo.';

-- RLS: deny tudo exceto service_role (segue padrão do projeto)
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon" ON public.admin_audit_log
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON public.admin_audit_log
  AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
