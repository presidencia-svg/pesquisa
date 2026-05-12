-- ==========================================================================
-- Migration 017 — edicao.turno (1 ou 2)
--
-- Pesquisa de intencao de voto tem que indicar a fase: 1o turno (todos
-- candidatos) ou 2o turno (so' os 2 mais votados em Pres/Gov, mais
-- 'voto util' nos demais cargos).
--
-- Default 1 (a maioria das pesquisas eh de 1o turno). Admin pode mudar
-- por edicao em /admin/edicoes.
--
-- Idempotente.
-- ==========================================================================

alter table edicao
  add column if not exists turno smallint not null default 1
    check (turno in (1, 2));
