-- 058 — votos por município e opção (detalhe da cobertura, admin).
--
-- A página interna "Cobertura por município" ganhou o clique no
-- município mostrando os mais votados ali. Ler votos_pesquisa cru por
-- município estoura o limite de 1.000 linhas do PostgREST (Aracaju tem
-- milhares de votos por cargo), então a agregação fica no banco.
--
-- Uma linha por (edição, município, cargo, método, candidato, partido,
-- resposta). Candidato nulo com partido preenchido = voto de legenda
-- (federal/estadual). Resposta só na consulta zona_expansao.
-- Sem dado pessoal. Idempotente.
create or replace view public.v_votos_municipio_opcao
  with (security_invoker = true) as
select
  edicao_id,
  municipio_ibge,
  cargo,
  metodo,
  candidato_id,
  partido_id,
  resposta,
  count(*)::integer as votos
from public.votos_pesquisa
group by edicao_id, municipio_ibge, cargo, metodo, candidato_id, partido_id, resposta;

comment on view public.v_votos_municipio_opcao is
  'Votos agregados por município/cargo/opção (admin — cobertura por município).';
