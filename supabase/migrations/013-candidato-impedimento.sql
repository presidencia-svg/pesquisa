-- ==========================================================================
-- Migration 013 — candidato sub judice / impedido
--
-- Quando o TSE julga uma candidatura como sub judice (julgamento pendente),
-- inelegivel ou cassada, a urna pode ainda contar o voto mas o resultado
-- depende do desfecho judicial. Pra pesquisa, queremos manter o candidato
-- visivel (pra refletir o que aparece na urna real) mas marcar a situacao
-- com um aviso. Padrao TSE/G1/UOL.
--
-- Texto livre — admin escreve o motivo, ex.: "Sub judice — julgamento
-- pendente no TSE" ou "Cassado em 1a instancia". Vazio/null = sem impedimento.
--
-- Idempotente.
-- ==========================================================================

alter table candidatos_pesquisa
  add column if not exists impedimento text;
