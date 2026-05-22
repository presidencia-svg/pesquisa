-- Migration 019 — Correções recomendadas pelos advisors Supabase
--
-- Aplicada após análise de stress test em 22/05/2026
-- (ver docs/stress-test-2026-05-22.md). Cobre os 4 grupos de
-- recomendações do linter:
--
--   1. search_path mutável em função          → 1 fix
--   2. SECURITY DEFINER em views              → 5 fixes
--   3. Foreign keys sem covering index        → 7 fixes
--   4. Unused indexes ocupando espaço         → 6 drops
--
-- Total: 19 operações idempotentes (CREATE/DROP IF [NOT] EXISTS).

-- ─────────────────────────────────────────────────────────────────────
-- 1. search_path mutável
-- ─────────────────────────────────────────────────────────────────────
-- Sem isso, função usa search_path do chamador → pode ser sequestrada
-- por schema malicioso no PATH. Fixar em `public, pg_temp` previne.

ALTER FUNCTION public.k_anonimo_estrato(integer) SET search_path = public, pg_temp;

-- ─────────────────────────────────────────────────────────────────────
-- 2. SECURITY DEFINER → security_invoker = true (Postgres 15+)
-- ─────────────────────────────────────────────────────────────────────
-- Views passam a respeitar permissões + RLS do chamador, não do criador.
-- Os dados expostos por essas views (resultados agregados) já são
-- públicos por design, mas alinhar com least-privilege é boa prática.

ALTER VIEW public.v_estrato_edicao        SET (security_invoker = true);
ALTER VIEW public.v_resumo_edicao         SET (security_invoker = true);
ALTER VIEW public.v_resultados_zona       SET (security_invoker = true);
ALTER VIEW public.v_resultados_legenda    SET (security_invoker = true);
ALTER VIEW public.v_resultados_candidato  SET (security_invoker = true);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Covering indexes para FKs (acelera ON DELETE CASCADE)
-- ─────────────────────────────────────────────────────────────────────
-- Os índices compostos existentes (votos_candidato_idx etc.) têm o
-- FK column como SEGUNDO campo do BTree — não satisfaz lookup direto
-- por FK. Criar índices dedicados (parciais quando FK aceita NULL).

-- candidatos_pesquisa: cascade de partidos → centenas de linhas, baixo impacto
CREATE INDEX IF NOT EXISTS candidatos_pesquisa_partido_idx
  ON public.candidatos_pesquisa (partido_id);

-- eleitores_pesquisa: cascade de municípios → milhares de linhas
CREATE INDEX IF NOT EXISTS eleitores_pesquisa_municipio_idx
  ON public.eleitores_pesquisa (municipio_ibge);

-- votos_pesquisa: as cascades aqui são as mais críticas (milhões de linhas
-- projetados). Índices PARCIAIS porque as colunas FK admitem NULL.
CREATE INDEX IF NOT EXISTS votos_pesquisa_candidato_only_idx
  ON public.votos_pesquisa (candidato_id)
  WHERE candidato_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS votos_pesquisa_partido_only_idx
  ON public.votos_pesquisa (partido_id)
  WHERE partido_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS votos_pesquisa_municipio_only_idx
  ON public.votos_pesquisa (municipio_ibge)
  WHERE municipio_ibge IS NOT NULL;

CREATE INDEX IF NOT EXISTS votos_pesquisa_token_hash_idx
  ON public.votos_pesquisa (token_hash);

-- whatsapp_codigos: cascade quando edição é excluída
CREATE INDEX IF NOT EXISTS whatsapp_codigos_edicao_idx
  ON public.whatsapp_codigos (edicao_id);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Drop de índices nunca usados (economiza disco + acelera INSERT)
-- ─────────────────────────────────────────────────────────────────────
-- Confirmados como zero scans pelo Supabase linter (lint 0005).
-- Se uma query futura precisar deles, recriar é cheap.

DROP INDEX IF EXISTS public.eleitores_fp_idx;
DROP INDEX IF EXISTS public.edicao_ativa_divulgada_idx;
DROP INDEX IF EXISTS public.eleitores_estrato_idx;
DROP INDEX IF EXISTS public.municipios_regiao_idx;
DROP INDEX IF EXISTS public.eleitores_whatsapp_idx;

-- NOTA: cdl_base_municipio_idx foi inicialmente listado como "unused"
-- mas cobre o FK cdl_base.municipio_ibge_fkey. Mantido (não dropar).
