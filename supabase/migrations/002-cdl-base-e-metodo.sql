-- ==========================================================================
-- 002-cdl-base-e-metodo.sql
-- Adiciona:
--   1. Tabela cdl_base — allowlist de CPFs ja conhecidos (votantes do
--      Melhores do Ano), pra pular validacao SPC.
--   2. Coluna fonte em eleitores_pesquisa — registra de onde veio a
--      validacao (cdl_base | spc | manual).
--   3. Coluna metodo em votos_pesquisa — separa voto por numero (decorou)
--      de voto em branco e abstencao por cargo.
--
-- Roda no SQL Editor do Supabase APOS a 001. Idempotente.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- TABELA — cdl_base
-- Lista de CPFs ja conhecidos pela CDL Aracaju (~50k votantes do
-- Melhores do Ano). Quando o eleitor digita CPF, hasheamos e buscamos
-- aqui antes de gastar requisicao no SPC Brasil.
--
-- IMPORTANTE: cpf_hash usa o MESMO HMAC (CPF_HASH_SECRET) usado em
-- eleitores_pesquisa, pra que a comparacao funcione.
-- --------------------------------------------------------------------------
create table if not exists cdl_base (
  cpf_hash         text primary key,
  municipio_ibge   integer references municipios_se(ibge_codigo),  -- se conhecido
  whatsapp_e164    text,                                            -- se conhecido (pre-preenche OTP)
  nome_mascarado   text,                                            -- se conhecido ('Maria S. ***')
  importado_em     timestamptz not null default now(),
  origem           text not null default 'melhores_do_ano'          -- pra rastrear futuras importacoes
);

create index if not exists cdl_base_municipio_idx
  on cdl_base (municipio_ibge) where municipio_ibge is not null;

-- --------------------------------------------------------------------------
-- COLUNA — eleitores_pesquisa.fonte
-- Registra como o CPF foi validado nesta edicao:
--   'cdl_base' — encontrado em cdl_base (pulou SPC)
--   'spc'      — validado via SPC Brasil
--   'manual'   — validacao administrativa (excecao)
-- --------------------------------------------------------------------------
alter table eleitores_pesquisa
  add column if not exists fonte text
    check (fonte in ('cdl_base', 'spc', 'manual'));

-- Pra registros antigos (nao deve ter ainda, mas por seguranca):
update eleitores_pesquisa set fonte = 'spc' where fonte is null;

alter table eleitores_pesquisa
  alter column fonte set not null;

-- --------------------------------------------------------------------------
-- COLUNA — votos_pesquisa.metodo
-- Diferencia voto valido (numero digitado) de branco/abstencao.
-- Como a cedula e estilo urna (so numero, sem busca por nome), todo voto
-- com candidato_id ou partido_id tem metodo = 'numero'.
--   'numero'   — eleitor digitou o numero do candidato/legenda
--   'branco'   — eleitor escolheu votar em branco neste cargo
--   'nao_sabe' — eleitor escolheu nao votar neste cargo
-- --------------------------------------------------------------------------
alter table votos_pesquisa
  add column if not exists metodo text
    check (metodo in ('numero', 'branco', 'nao_sabe'));

update votos_pesquisa set metodo = 'numero' where metodo is null;

alter table votos_pesquisa
  alter column metodo set not null;

-- O check antigo de votos_pesquisa nao permitia branco/nao_sabe. Trocamos:
alter table votos_pesquisa drop constraint if exists votos_pesquisa_check;

alter table votos_pesquisa
  add constraint votos_pesquisa_metodo_consistente
  check (
    (
      metodo = 'numero'
      and (
        (cargo in ('presidente', 'governador', 'senador') and candidato_id is not null and partido_id is null)
        or
        (cargo in ('federal', 'estadual') and partido_id is not null and candidato_id is null)
      )
    )
    or
    (
      metodo in ('branco', 'nao_sabe')
      and candidato_id is null
      and partido_id is null
    )
  );

-- --------------------------------------------------------------------------
-- VIEW — v_resumo_edicao (recriada com numeros novos)
-- DROP antes do CREATE porque a 001 ja' criou v_resumo_edicao com outras
-- colunas, e Postgres nao permite mudar nomes/ordem de colunas via
-- CREATE OR REPLACE VIEW (so' permite mudar a query subjacente).
-- --------------------------------------------------------------------------
drop view if exists v_resumo_edicao;

create view v_resumo_edicao as
select
  e.id                                                                  as edicao_id,
  e.nome,
  e.ativa,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id)      as eleitores_cadastrados,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and fonte = 'cdl_base') as via_cdl_base,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and fonte = 'spc')      as via_spc,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and spc_validado)       as com_spc,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and wa_validado)        as com_wa,
  (select count(*) from tokens_emitidos where edicao_id = e.id)                           as tokens_emitidos,
  (select count(*) from tokens_emitidos where edicao_id = e.id and usado)                 as tokens_usados,
  (select count(*) from votos_pesquisa where edicao_id = e.id and metodo = 'numero')      as votos_validos,
  (select count(*) from votos_pesquisa where edicao_id = e.id and metodo = 'branco')      as votos_brancos,
  (select count(*) from votos_pesquisa where edicao_id = e.id and metodo = 'nao_sabe')    as votos_nao_sabe
from edicao e
where e.ativa = true;
