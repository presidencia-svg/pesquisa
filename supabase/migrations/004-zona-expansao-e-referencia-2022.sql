-- ==========================================================================
-- 004-zona-expansao-e-referencia-2022.sql
--
-- Duas mudancas relacionadas a expansao do dominio da pesquisa:
--
-- 1) Cargo novo `zona_expansao` em votos_pesquisa pra a consulta extra
--    "A Zona de Expansao deve ficar com Aracaju ou Sao Cristovao?",
--    aplicada apenas a eleitores desses 2 municipios. Coluna `resposta`
--    armazena "aracaju" | "sao_cristovao" | null (quando branco/nao_sabe).
--
-- 2) Colunas votos_referencia / ano_referencia / foto_url em
--    candidatos_pesquisa, pra carregar resultados oficiais da eleicao
--    passada (default 2022). Usado pra:
--      - Display visual com foto na cedula (estilo urna)
--      - Coeficiente baseline pra projecao de QE (Federal/Estadual) e
--        comparacao "candidato X teve N votos em 2022, tem Y% agora".
--    Mesmo campo serve pra partidos via candidatos agregados, ou via
--    coluna paralela em partidos (adiciona aqui tambem).
--
-- Idempotente — roda apos 001/002/003.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- (1) Cargo zona_expansao + coluna resposta em votos_pesquisa
-- --------------------------------------------------------------------------

alter table votos_pesquisa drop constraint if exists votos_pesquisa_cargo_check;
alter table votos_pesquisa
  add constraint votos_pesquisa_cargo_check
  check (cargo in (
    'presidente', 'governador', 'senador',
    'federal', 'estadual',
    'zona_expansao'
  ));

alter table votos_pesquisa
  add column if not exists resposta text
  check (
    resposta is null
    or resposta in ('aracaju', 'sao_cristovao')
  );

-- Recria constraint de consistencia entre metodo / cargo / colunas
alter table votos_pesquisa drop constraint if exists votos_pesquisa_metodo_consistente;
alter table votos_pesquisa
  add constraint votos_pesquisa_metodo_consistente
  check (
    (
      metodo = 'numero' and (
        (cargo in ('presidente','governador','senador')
          and candidato_id is not null
          and partido_id is null
          and resposta is null)
        or
        (cargo in ('federal','estadual')
          and partido_id is not null
          and candidato_id is null
          and resposta is null)
        or
        (cargo = 'zona_expansao'
          and candidato_id is null
          and partido_id is null
          and resposta is not null)
      )
    )
    or
    (
      metodo in ('branco','nao_sabe')
      and candidato_id is null
      and partido_id is null
      and resposta is null
    )
  );

-- --------------------------------------------------------------------------
-- (2) Referencia eleitoral 2022 em candidatos + partidos
-- --------------------------------------------------------------------------

alter table candidatos_pesquisa
  add column if not exists votos_referencia integer;

alter table candidatos_pesquisa
  add column if not exists ano_referencia integer;

-- foto_url ja' existe em candidatos_pesquisa (vinda da migration 001)

alter table partidos
  add column if not exists votos_referencia_se integer;

alter table partidos
  add column if not exists ano_referencia integer;

-- --------------------------------------------------------------------------
-- VIEW — v_resumo_edicao (recriada com contadores de zona_expansao)
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
  (select count(*) from votos_pesquisa where edicao_id = e.id and metodo = 'nao_sabe')    as votos_nao_sabe,
  (select count(*) from votos_pesquisa where edicao_id = e.id and cargo = 'zona_expansao' and resposta = 'aracaju')        as zona_pra_aracaju,
  (select count(*) from votos_pesquisa where edicao_id = e.id and cargo = 'zona_expansao' and resposta = 'sao_cristovao')  as zona_pra_sao_cristovao
from edicao e
where e.ativa = true;
