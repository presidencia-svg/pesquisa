-- ==========================================================================
-- Migration 010 — controle de divulgacao pra pagina publica /resultados
--
-- A pagina /resultados publica fica trancada ate' a CDL clicar
-- "Divulgar" no admin. Antes disso, mostra um placeholder com a data
-- prevista. Apos divulgar, expoe os mesmos dados do /admin/resultados,
-- mas com layout publico (sem banner "visao interna") e com referencia
-- ao registro PesqEle (Resolucao TSE 23.747/2026).
--
-- Idempotente.
-- ==========================================================================

-- Timestamp em que a CDL acionou a divulgacao publica. NULL = nao divulgada.
alter table edicao
  add column if not exists divulgada_em timestamptz;

-- Data em que a divulgacao esta prevista (mostrada na pagina publica
-- antes da divulgacao oficial). NULL = sem data prevista exibida.
alter table edicao
  add column if not exists divulgacao_prevista timestamptz;

-- Indexa edicao ativa + divulgada pra a pagina publica achar rapido.
create index if not exists edicao_ativa_divulgada_idx
  on edicao (ativa, divulgada_em)
  where ativa = true and divulgada_em is not null;
