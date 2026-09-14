-- 056 — origem real do participante no resumo do admin.
--
-- eleitores_pesquisa.fonte só distingue 'cdl_base' (já estava na base
-- quando entrou) de 'spc' (consultado na hora). Isso mistura três
-- populações que a CDL quer enxergar separadas:
--   1. Melhores do Ano  — cdl_base.origem = 'melhores_do_ano' (lista própria da CDL);
--   2. Base da 1ª edição — não é MDA, mas já emitiu token numa edição anterior;
--   3. SPC novo          — o resto (consultado no SPC e sem histórico nas edições).
-- As três somam eleitores_cadastrados. Quem é MDA e também votou na 1ª
-- edição conta como MDA (via_mda_votou_ed1 mostra a sobreposição).
create or replace view public.v_resumo_edicao
with (security_invoker = true) as
select
  e.id as edicao_id,
  e.nome,
  e.ativa,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id) as eleitores_cadastrados,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and fonte = 'cdl_base') as via_cdl_base,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and fonte = 'spc') as via_spc,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and spc_validado) as com_spc,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and wa_validado) as com_wa,
  (select count(*) from tokens_emitidos where edicao_id = e.id) as tokens_emitidos,
  (select count(*) from tokens_emitidos where edicao_id = e.id and usado) as tokens_usados,
  (select count(*) from votos_pesquisa where edicao_id = e.id and metodo = 'numero') as votos_validos,
  (select count(*) from votos_pesquisa where edicao_id = e.id and metodo = 'branco') as votos_brancos,
  (select count(*) from votos_pesquisa where edicao_id = e.id and metodo = 'nao_sabe') as votos_nao_sabe,
  (select count(*) from votos_pesquisa where edicao_id = e.id and cargo = 'zona_expansao' and resposta = 'aracaju') as zona_pra_aracaju,
  (select count(*) from votos_pesquisa where edicao_id = e.id and cargo = 'zona_expansao' and resposta = 'sao_cristovao') as zona_pra_sao_cristovao,
  -- origem real (056)
  (select count(*) from eleitores_pesquisa ep
     join cdl_base b on b.cpf_hash = ep.cpf_hash
    where ep.edicao_id = e.id and b.origem = 'melhores_do_ano') as via_melhores_do_ano,
  (select count(*) from eleitores_pesquisa ep
     join cdl_base b on b.cpf_hash = ep.cpf_hash
    where ep.edicao_id = e.id and b.origem = 'melhores_do_ano'
      and exists (select 1 from eleitores_pesquisa a
                   where a.cpf_hash = ep.cpf_hash and a.edicao_id <> e.id and a.token_emitido)) as via_mda_votou_ed1,
  (select count(*) from eleitores_pesquisa ep
    where ep.edicao_id = e.id
      and not exists (select 1 from cdl_base b where b.cpf_hash = ep.cpf_hash and b.origem = 'melhores_do_ano')
      and exists (select 1 from eleitores_pesquisa a
                   where a.cpf_hash = ep.cpf_hash and a.edicao_id <> e.id and a.token_emitido)) as via_base_1a_edicao,
  (select count(*) from eleitores_pesquisa ep
    where ep.edicao_id = e.id
      and not exists (select 1 from cdl_base b where b.cpf_hash = ep.cpf_hash and b.origem = 'melhores_do_ano')
      and not exists (select 1 from eleitores_pesquisa a
                       where a.cpf_hash = ep.cpf_hash and a.edicao_id <> e.id and a.token_emitido)) as via_spc_novo
from edicao e
where e.ativa = true;

comment on view public.v_resumo_edicao is
  'Resumo da edição ativa para o admin. via_melhores_do_ano + via_base_1a_edicao + via_spc_novo = eleitores_cadastrados (056).';
