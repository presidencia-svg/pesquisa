-- Brancos e "não sei" por (edição, cargo), já agregados.
--
-- lib/resultados-data.ts buscava `cargo, metodo` linha por linha em
-- votos_pesquisa e contava no Node. O PostgREST devolve no máximo 1.000
-- linhas por requisição: com ~5.900 votos branco/não-sei, só o fim da
-- lista voltava — presidente, governador e senador ficavam com 0 brancos
-- e 0 indecisos na apresentação/TV, e federal com um terço do real.
create or replace view public.v_votos_branco_nao_sabe
with (security_invoker = true) as
  select edicao_id, cargo, metodo, count(*)::int as votos
  from public.votos_pesquisa
  where metodo in ('branco', 'nao_sabe')
  group by edicao_id, cargo, metodo;

comment on view public.v_votos_branco_nao_sabe is
  'Contagem de votos em branco e "não sei" por (edição, cargo, método). Agregada pra não cair no limite de 1.000 linhas do PostgREST.';

revoke all on public.v_votos_branco_nao_sabe from anon, authenticated;
grant select on public.v_votos_branco_nao_sabe to service_role;
