-- 057 — origem de tráfego (UTM) do cadastro.
--
-- Os anúncios da 2ª edição (Meta) apontam pra /votar?utm_source=meta&...
-- e o site não gravava nada disso: só dava pra ver clique no painel do
-- Meta, nunca quantos cadastros/votos cada conjunto trouxe de fato.
--
-- O formulário de CPF captura os utm_* da URL (ou do sessionStorage,
-- se a página recarregou), o rascunho pre_voto carrega, e a linha em
-- eleitores_pesquisa recebe na hora do insert/update em /votar/confirma.
-- Sala 1 apenas — votos_pesquisa continua sem nada disso.
--
-- Valores são saneados no servidor (lib/origem-utm.ts): só [a-z0-9._-],
-- até 80 caracteres, minúsculos. Não é dado pessoal.
-- Idempotente.
alter table public.eleitores_pesquisa
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text,
  add column if not exists utm_term     text;

comment on column public.eleitores_pesquisa.utm_source   is 'Origem de tráfego (utm_source) capturada em /votar. Saneado, sem dado pessoal.';
comment on column public.eleitores_pesquisa.utm_campaign is 'utm_campaign do link que trouxe o eleitor (ex.: 2a-edicao-popular).';
comment on column public.eleitores_pesquisa.utm_content  is 'utm_content — nome do anúncio ({{ad.name}} no Meta).';
comment on column public.eleitores_pesquisa.utm_term     is 'utm_term — nome do conjunto de anúncios ({{adset.name}} no Meta).';

create index if not exists eleitores_pesquisa_utm_idx
  on public.eleitores_pesquisa (edicao_id, utm_campaign, utm_term, utm_content)
  where utm_source is not null;

-- Leitura interna: cadastros e tokens por campanha/conjunto/anúncio.
create or replace view public.v_origem_utm_edicao
with (security_invoker = true) as
select
  edicao_id,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  utm_content,
  count(*)                                   as cadastros,
  count(*) filter (where token_emitido)      as com_token,
  min(criado_em)                             as primeiro_em,
  max(criado_em)                             as ultimo_em
from public.eleitores_pesquisa
where utm_source is not null
group by 1, 2, 3, 4, 5, 6;
