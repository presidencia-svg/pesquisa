-- Migration 023 — Policies RLS DENY ALL explícitas pra clientes anônimos
--
-- Estado anterior:
--   • Todas as tabelas tinham RLS habilitada
--   • Nenhuma policy criada → default deny IMPLÍCITO
--
-- Riscos do implícito:
--   • Auditoria não consegue ver "essa tabela está intencionalmente
--     bloqueada pra anônimo" — parece esquecimento
--   • Se alguém criar uma policy permissiva por engano no Dashboard,
--     abre tudo
--   • Não documenta a intenção pro próximo dev
--
-- Solução: policy explícita NEGANDO acesso aos roles `anon` e
-- `authenticated`. `service_role` continua bypassando RLS (pra que o
-- servidor da aplicação leia/escreva via supabaseAdmin()).
--
-- Resultado:
--   • Tentativa com anon key (ex: alguém pegou a chave do HTML) → 403
--   • Tentativa com authenticated key (improvável aqui, não usamos
--     auth do Supabase) → 403
--   • Aplicação via service_role → continua normal
--   • Dashboard advisor para de listar tabelas sem policy

-- Helper: aplica deny_anon em uma tabela (idempotente)
DO $$
DECLARE
  t TEXT;
  tabelas TEXT[] := ARRAY[
    'candidatos_pesquisa',
    'cdl_base',
    'cron_log',
    'edicao',
    'eleitores_pesquisa',
    'municipios_se',
    'partidos',
    'rate_limit_ip',
    'tokens_emitidos',
    'votos_pesquisa',
    'whatsapp_codigos'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas
  LOOP
    -- Drop policies antigas com mesmo nome (idempotência)
    EXECUTE format('DROP POLICY IF EXISTS "deny_anon" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "deny_authenticated" ON public.%I', t);

    -- Deny pra anon
    EXECUTE format(
      'CREATE POLICY "deny_anon" ON public.%I '
      'AS RESTRICTIVE '
      'FOR ALL TO anon '
      'USING (false) WITH CHECK (false)',
      t
    );

    -- Deny pra authenticated (não usamos esse role, mas defesa em
    -- profundidade caso futuro habilite auth Supabase)
    EXECUTE format(
      'CREATE POLICY "deny_authenticated" ON public.%I '
      'AS RESTRICTIVE '
      'FOR ALL TO authenticated '
      'USING (false) WITH CHECK (false)',
      t
    );

    -- Garante RLS habilitada (já estava, mas idempotente)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END$$;

COMMENT ON SCHEMA public IS
  'Tabelas com RLS DENY ALL explícito pra anon/authenticated. '
  'Acesso somente via service_role do Vercel (lib/supabase/admin.ts). '
  'Ver docs/lgpd.md e migration 023.';
