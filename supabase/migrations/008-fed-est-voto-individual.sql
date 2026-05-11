-- ==========================================================================
-- Migration 008 — permite armazenar candidato_id em votos fed/est
--
-- Mudanca metodologica: agora alem do voto agregado por legenda (partido,
-- usado pra Quociente Eleitoral / projecao de cadeiras), tambem
-- armazenamos qual candidato individual o eleitor digitou. Isso permite
-- responder duas perguntas em paralelo:
--   1. Quantas cadeiras cada partido elege?  (soma de legenda + QE/QP)
--   2. Dentro do partido X, quem sao os mais votados?  (ordem dos
--      eleitos pelo proprio partido — espelha como TSE conta)
--
-- Quando o eleitor digita um numero completo (ex.: 5512) que NAO bate
-- com nenhum candidato cadastrado na edicao, gravamos so' partido_id
-- (candidato_id fica null). Isso e' o normal porque so' temos os
-- eleitos em 2022 cadastrados, nao todos os candidatos.
--
-- Idempotente.
-- ==========================================================================

-- Relaxa a CHECK de consistencia metodo/cargo/colunas — agora fed/est
-- pode ter candidato_id preenchido ou nao. Partido_id continua obrigatorio.

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
          and resposta is null
          -- candidato_id agora opcional (NULL ou nao-NULL ambos validos)
          )
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

-- Re-cria v_resultados_candidato pra incluir fed/est (antes era so' pres/gov/sen).
-- Inclui apenas votos onde candidato_id foi identificado — quem digitou
-- um numero que nao bateu nenhum cadastrado nao entra aqui (mas continua
-- contado em v_resultados_legenda).
drop view if exists v_resultados_candidato;
create view v_resultados_candidato as
select
  v.edicao_id,
  v.cargo,
  v.candidato_id,
  c.numero,
  c.nome_urna,
  c.foto_url,
  p.sigla,
  p.cor_hex,
  c.partido_id,
  count(*)::int as votos
from votos_pesquisa v
join candidatos_pesquisa c on c.id = v.candidato_id
left join partidos p on p.id = c.partido_id
where v.metodo = 'numero'
  and v.candidato_id is not null
group by v.edicao_id, v.cargo, v.candidato_id,
         c.numero, c.nome_urna, c.foto_url,
         p.sigla, p.cor_hex, c.partido_id;
