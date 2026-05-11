-- ==========================================================================
-- Migration 006 — views de resultados pra /admin/resultados
--
-- Tres views agregam votos_pesquisa pra apuracao em tempo real:
--   v_resultados_candidato — Pres/Gov/Sen, agrega por candidato
--   v_resultados_legenda   — Fed/Est, agrega por partido
--   v_resultados_zona      — Zona de Expansao (consulta extra)
--
-- Todas filtram metodo='numero' (voto valido), porque branco/nao_sabe
-- nao tem candidato/partido/resposta — esses sao contados em paralelo
-- pelo admin direto na tabela votos_pesquisa.
-- ==========================================================================

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
  count(*)::int as votos
from votos_pesquisa v
join candidatos_pesquisa c on c.id = v.candidato_id
left join partidos p on p.id = c.partido_id
where v.metodo = 'numero'
  and v.cargo in ('presidente', 'governador', 'senador')
group by v.edicao_id, v.cargo, v.candidato_id, c.numero, c.nome_urna, c.foto_url, p.sigla, p.cor_hex;

drop view if exists v_resultados_legenda;
create view v_resultados_legenda as
select
  v.edicao_id,
  v.cargo,
  v.partido_id,
  p.numero,
  p.sigla,
  p.nome,
  p.cor_hex,
  count(*)::int as votos
from votos_pesquisa v
join partidos p on p.id = v.partido_id
where v.metodo = 'numero'
  and v.cargo in ('federal', 'estadual')
group by v.edicao_id, v.cargo, v.partido_id, p.numero, p.sigla, p.nome, p.cor_hex;

drop view if exists v_resultados_zona;
create view v_resultados_zona as
select
  v.edicao_id,
  v.resposta,
  count(*)::int as votos
from votos_pesquisa v
where v.cargo = 'zona_expansao'
  and v.metodo = 'numero'
  and v.resposta is not null
group by v.edicao_id, v.resposta;
