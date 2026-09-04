-- Coligação/federação oficial do candidato, como registrada no TSE.
--
-- Fonte: DivulgaCand `nomeColigacao`. No proporcional (dep. federal e
-- estadual) coligação é proibida desde 2020, então o campo traz a
-- FEDERAÇÃO ("FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP)") ou só o partido
-- ("PSB") quando ele concorre sozinho. No majoritário traz o nome da
-- coligação ("SERGIPE CRESCE COM VOCÊ").
--
-- A projeção de cadeiras (lib/projecao.ts) agrupa por esta coluna — é
-- assim que o TSE apura: federação conta como um partido só.
alter table public.candidatos_pesquisa
  add column if not exists coligacao text;

comment on column public.candidatos_pesquisa.coligacao is
  'Coligação/federação como registrada no TSE (DivulgaCand nomeColigacao). '
  'No proporcional é a FEDERAÇÃO (ou o próprio partido, se concorre só); '
  'a projeção de cadeiras agrupa por esta coluna. Preenchida pelo '
  'scripts/importar-divulgacand.ts.';
