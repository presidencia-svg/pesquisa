-- 035 — Views agregadas pra Projeção de cadeiras
--
-- BUG: app/admin/(autenticado)/projecao/page.tsx lia votos_pesquisa LINHA A
-- LINHA pra contar votos por partido/candidato. O PostgREST corta em 1.000
-- linhas por padrão (max-rows), então a projeção inteira era calculada sobre
-- apenas 1.000 dos ~45 mil votos ("VOTOS VÁLIDOS: 1.000"). Os dados sempre
-- estiveram íntegros — só a leitura é que truncava.
--
-- FIX: agregar no banco. Estas views contam votos por (cargo, partido/candidato,
-- município). O município é mantido pra permitir o modo PONDERADO (peso amostral
-- por município). Como são agregadas, o nº de linhas cai de ~45 mil pra centenas.

create or replace view public.v_proj_partido_mun as
  select edicao_id, cargo, partido_id, municipio_ibge, count(*)::int as votos
  from public.votos_pesquisa
  where metodo = 'numero' and partido_id is not null
  group by edicao_id, cargo, partido_id, municipio_ibge;

create or replace view public.v_proj_candidato_mun as
  select edicao_id, cargo, candidato_id, municipio_ibge, count(*)::int as votos
  from public.votos_pesquisa
  where metodo = 'numero' and candidato_id is not null
  group by edicao_id, cargo, candidato_id, municipio_ibge;

comment on view public.v_proj_partido_mun is
  'Votos de legenda agregados por (edição, cargo, partido, município). Usada na projeção de cadeiras (evita o corte de 1.000 linhas do PostgREST).';
comment on view public.v_proj_candidato_mun is
  'Votos nominais agregados por (edição, cargo, candidato, município). Usada na projeção de cadeiras.';

-- Respondentes distintos por município (pro modo PONDERADO da projeção, que
-- pesa cada voto por eleitorado/respostas do município). O fetch cru também
-- truncava em 1.000 — aqui já vem agregado (~75 linhas).
create or replace view public.v_respostas_municipio as
  select edicao_id, municipio_ibge, count(distinct token_hash)::int as respostas
  from public.votos_pesquisa
  where municipio_ibge is not null
  group by edicao_id, municipio_ibge;

comment on view public.v_respostas_municipio is
  'Respondentes distintos (token_hash) por (edição, município). Usada nos pesos amostrais da projeção ponderada.';
