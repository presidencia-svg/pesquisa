-- ==========================================================================
-- Migration 011 — municipio_ibge em votos_pesquisa
--
-- Motivacao: ponderacao por peso amostral pos-coleta. Sem o municipio no
-- voto, e' impossivel corrigir distorcao de adesao desigual ("Aracaju
-- 50% dos votos mas e' so 30% do eleitorado SE -> peso reduz Aracaju").
--
-- IMPORTANTE: NAO QUEBRA O ANONIMATO ARQUITETURAL.
--
-- A "Sala 1" (eleitores_pesquisa) guarda CPF hash + demograficos. A
-- "Sala 2" (votos_pesquisa) NAO tem CPF, NAO tem link com Sala 1.
-- Adicionar 'municipio_ibge' aqui e' uma CATEGORIA broad (~3k a 416k
-- eleitores por municipio), nao um identificador. Mesmo no menor
-- municipio (Pedra Mole, 3.476 eleitores), uma resposta nao identifica
-- ninguem em particular — k-anonymity esta preservada.
--
-- E' assim que TODA pesquisa por amostragem ponderada funciona: voto +
-- categoria geografica juntos, sem dado pessoal. Sem isso a pesquisa
-- nao serve pra projecao estadual.
--
-- Idempotente.
-- ==========================================================================

alter table votos_pesquisa
  add column if not exists municipio_ibge integer references municipios_se(ibge_codigo);

create index if not exists votos_municipio_idx
  on votos_pesquisa (edicao_id, municipio_ibge)
  where municipio_ibge is not null;
