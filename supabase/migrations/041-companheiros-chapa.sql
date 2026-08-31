-- 041 · Chapa majoritária (vice / suplentes) na cédula
--
-- Presidente e Governador levam o VICE; Senador leva os SUPLENTES
-- (1º e 2º) — como na urna eletrônica. Guardamos como JSONB: um array
-- de { rotulo, nome, partido, foto_url }. Só se aplica a cargos
-- majoritários; fica null nos demais. Dado público (DivulgaCand/TSE).

alter table candidatos_pesquisa
  add column if not exists companheiros jsonb;

comment on column candidatos_pesquisa.companheiros is
  'Chapa: array de {rotulo,nome,partido,foto_url}. Vice (presidente/governador) ou suplentes (senador). Dado público TSE. Só majoritário.';

-- Os dados (13 vices de presidente, 6 de governador, 11 pares de
-- suplentes de senador) são carregados por script a partir do TSE
-- (DivulgaCand), não versionados aqui.
