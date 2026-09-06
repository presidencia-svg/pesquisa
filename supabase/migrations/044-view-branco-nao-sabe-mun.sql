-- Brancos e "não sei" por (edição, cargo, município).
--
-- Base pra ponderação por município dos resultados públicos
-- (lib/resultados-data.ts): peso do município × contagem. A view sem
-- município (v_votos_branco_nao_sabe) continua servindo o admin.
create or replace view public.v_votos_branco_nao_sabe_mun
with (security_invoker = true) as
  select edicao_id, cargo, metodo, municipio_ibge, count(*)::int as votos
  from public.votos_pesquisa
  where metodo in ('branco', 'nao_sabe') and municipio_ibge is not null
  group by edicao_id, cargo, metodo, municipio_ibge;

comment on view public.v_votos_branco_nao_sabe_mun is
  'Brancos e "não sei" por (edição, cargo, método, município). Usada na ponderação por município dos resultados públicos.';

revoke all on public.v_votos_branco_nao_sabe_mun from anon, authenticated;
grant select on public.v_votos_branco_nao_sabe_mun to service_role;
