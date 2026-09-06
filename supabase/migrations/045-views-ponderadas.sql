-- Ponderação por município calculada NO BANCO.
--
-- Registro PesqEle: peso = share do município no eleitorado TSE ÷ share na
-- amostra. Até aqui o app somava votos × peso a partir de views por
-- município paginadas (v_proj_candidato_mun etc.). Paginar sem ORDER BY
-- estável repetia/omitia linhas (a projeção do admin mostrou a Delegada
-- Katarina com 542/389 votos em vez de 727/653). Com o resultado já
-- agregado e ponderado no banco, o app lê poucas centenas de linhas de
-- uma vez — sem paginação, sem chance de perder linha.
--
-- v_peso_municipio: peso por (edição, município), só Sergipe. Votos de
-- eleitores com título fora de SE ficam com peso 0 no ponderado (o
-- universo registrado é o eleitorado sergipano); no bruto continuam.

create or replace view public.v_peso_municipio
with (security_invoker = true) as
  with resp as (
    select edicao_id, municipio_ibge, count(distinct token_hash)::numeric as n
    from public.votos_pesquisa
    where municipio_ibge is not null
    group by edicao_id, municipio_ibge
  ),
  tot as (
    select edicao_id, sum(n) as n_total from resp group by edicao_id
  ),
  etot as (
    select r.edicao_id, sum(m.eleitorado)::numeric as e_total
    from public.municipios_se m join resp r on r.municipio_ibge = m.ibge_codigo
    group by r.edicao_id
  )
  select r.edicao_id, r.municipio_ibge, r.n as respostas, m.eleitorado,
         (m.eleitorado::numeric / e.e_total) / (r.n / t.n_total) as peso
  from resp r
  join public.municipios_se m on m.ibge_codigo = r.municipio_ibge
  join tot t on t.edicao_id = r.edicao_id
  join etot e on e.edicao_id = r.edicao_id;

comment on view public.v_peso_municipio is
  'Peso amostral por (edição, município): (eleitorado/E_total) ÷ (respostas/n_total). Só municípios de Sergipe; fora de SE = sem peso (0).';

create or replace view public.v_resultados_candidato_pond
with (security_invoker = true) as
  select v.edicao_id, v.cargo, v.candidato_id,
         count(*)::int as votos,
         sum(coalesce(p.peso, 0))::numeric(14,4) as votos_pond
  from public.votos_pesquisa v
  left join public.v_peso_municipio p on p.edicao_id = v.edicao_id and p.municipio_ibge = v.municipio_ibge
  where v.metodo = 'numero' and v.candidato_id is not null
  group by v.edicao_id, v.cargo, v.candidato_id;

comment on view public.v_resultados_candidato_pond is
  'Votos brutos e ponderados por município, por (edição, cargo, candidato).';

create or replace view public.v_resultados_legenda_pond
with (security_invoker = true) as
  select v.edicao_id, v.cargo, v.partido_id,
         count(*)::int as votos,
         sum(coalesce(p.peso, 0))::numeric(14,4) as votos_pond
  from public.votos_pesquisa v
  left join public.v_peso_municipio p on p.edicao_id = v.edicao_id and p.municipio_ibge = v.municipio_ibge
  where v.metodo = 'numero' and v.partido_id is not null
  group by v.edicao_id, v.cargo, v.partido_id;

comment on view public.v_resultados_legenda_pond is
  'Votos brutos e ponderados por (edição, cargo, partido) — nominais + legenda, base da projeção de cadeiras.';

create or replace view public.v_votos_branco_nao_sabe_pond
with (security_invoker = true) as
  select v.edicao_id, v.cargo, v.metodo,
         count(*)::int as votos,
         sum(coalesce(p.peso, 0))::numeric(14,4) as votos_pond
  from public.votos_pesquisa v
  left join public.v_peso_municipio p on p.edicao_id = v.edicao_id and p.municipio_ibge = v.municipio_ibge
  where v.metodo in ('branco', 'nao_sabe')
  group by v.edicao_id, v.cargo, v.metodo;

comment on view public.v_votos_branco_nao_sabe_pond is
  'Brancos e "não sei" brutos e ponderados por (edição, cargo, método).';

revoke all on public.v_peso_municipio, public.v_resultados_candidato_pond, public.v_resultados_legenda_pond, public.v_votos_branco_nao_sabe_pond from anon, authenticated;
grant select on public.v_peso_municipio, public.v_resultados_candidato_pond, public.v_resultados_legenda_pond, public.v_votos_branco_nao_sabe_pond to service_role;
