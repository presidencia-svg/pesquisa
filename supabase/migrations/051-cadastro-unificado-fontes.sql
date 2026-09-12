-- 051 — Cadastro unificado do eleitor em cdl_base + proveniência por campo
--
-- Decisão do contratante em 12/09/2026: "unificar os dados mas colocar flags
-- para saber de onde veio a fonte". Até aqui o cadastro do eleitor estava em
-- três lugares: cdl_base (cache por CPF usado no login), eleitores_cadastro_spc
-- (migration 050, retorno integral do SPC, criada horas antes) e
-- eleitores_pesquisa (o que o eleitor confirma por edição).
--
-- O que muda:
--   1. cdl_base passa a ser o cadastro único por CPF: recebe as colunas do
--      SPC (nome completo, nome da mãe, nascimento, estado civil, situação
--      do CPF, produto e JSON bruto) que estavam em eleitores_cadastro_spc.
--   2. Cada dado ganha uma coluna <campo>_fonte com vocabulário único:
--        'mda'     = importado do Melhores do Ano (informado pelo eleitor lá)
--        'spc_mda' = consulta SPC feita pelo Melhores do Ano (cache copiado)
--        'spc'     = consulta SPC feita por esta pesquisa
--        'eleitor' = informado/confirmado pelo eleitor no formulário desta
--                    pesquisa (/votar/confirma; sexo só após o OTP)
--      sexo_fonte (migration 047) migra do par cadastral/autodeclarado pra
--      este vocabulário, em cdl_base e em eleitores_pesquisa:
--        cadastral → 'spc' (única forma de o código ter gravado)
--        autodeclarado → 'eleitor'
--      Em produção as duas colunas estavam 100% NULL (o código da 047 nunca
--      foi publicado — site fora do ar desde 08/09), então o UPDATE é
--      só por segurança.
--   3. Backfill das flags a partir de cdl_base.origem, que já dizia como a
--      linha nasceu:
--        melhores_do_ano   → nome/whatsapp 'mda'; sexo/faixa 'spc_mda'
--                            (importar-sexo-mda.ts); município, escolaridade
--                            e renda só existem se o eleitor participou → 'eleitor';
--                            whatsapp vira 'eleitor' se ele participou (confirmou
--                            ou corrigiu o número no formulário).
--        spc_lookup        → nome/sexo/faixa 'spc' (consulta ao vivo em /votar);
--        spc_pesquisa_2026   demais campos 'eleitor'.
--      Linhas copiadas de eleitores_cadastro_spc: cadastro_spc_fonte =
--      'spc_mda' (todas vieram do backfill scripts/importar-cadastro-spc-mda.ts;
--      o site nunca rodou com a 050).
--   4. eleitores_cadastro_spc é removida (absorvida). A exclusão LGPD
--      (/privacidade/excluir) já apaga cdl_base inteira.
--
-- PRÉ-REQUISITO DE DEPLOY: publicar o código só com esta migração aplicada
-- (app/votar/*, otp, confirma e scripts de import gravam as colunas novas).
-- Aditiva exceto pelo drop da 050 (nada em produção lia a tabela).

-- 1. Colunas do SPC em cdl_base --------------------------------------------
alter table cdl_base
  add column if not exists nome_completo      text,
  add column if not exists nome_mae           text,
  add column if not exists data_nascimento    date,
  add column if not exists idade_consulta     integer,
  add column if not exists estado_civil       text,
  add column if not exists cpf_situacao       text,
  add column if not exists cpf_situacao_data  date,
  add column if not exists spc_produto        text,
  add column if not exists spc_payload        jsonb,
  add column if not exists spc_consultado_em  timestamptz,
  add column if not exists atualizado_em      timestamptz not null default now();

-- 2. Flags de proveniência ---------------------------------------------------
alter table cdl_base
  add column if not exists nome_fonte             text,
  add column if not exists municipio_fonte        text,
  add column if not exists whatsapp_fonte         text,
  add column if not exists faixa_etaria_fonte     text,
  add column if not exists escolaridade_fonte     text,
  add column if not exists nivel_economico_fonte  text,
  add column if not exists cadastro_spc_fonte     text;

-- sexo_fonte: troca o vocabulário (047 → 051)
alter table cdl_base drop constraint if exists cdl_base_sexo_fonte_check;
alter table eleitores_pesquisa drop constraint if exists eleitores_pesquisa_sexo_fonte_check;
update cdl_base set sexo_fonte = 'spc' where sexo_fonte = 'cadastral';
update cdl_base set sexo_fonte = 'eleitor' where sexo_fonte = 'autodeclarado';
update eleitores_pesquisa set sexo_fonte = 'spc' where sexo_fonte = 'cadastral';
update eleitores_pesquisa set sexo_fonte = 'eleitor' where sexo_fonte = 'autodeclarado';

alter table cdl_base
  add constraint cdl_base_nome_fonte_check
    check (nome_fonte is null or nome_fonte in ('mda', 'spc_mda', 'spc', 'eleitor')),
  add constraint cdl_base_municipio_fonte_check
    check (municipio_fonte is null or municipio_fonte in ('mda', 'spc_mda', 'spc', 'eleitor')),
  add constraint cdl_base_whatsapp_fonte_check
    check (whatsapp_fonte is null or whatsapp_fonte in ('mda', 'spc_mda', 'spc', 'eleitor')),
  add constraint cdl_base_sexo_fonte_check
    check (sexo_fonte is null or sexo_fonte in ('mda', 'spc_mda', 'spc', 'eleitor')),
  add constraint cdl_base_faixa_etaria_fonte_check
    check (faixa_etaria_fonte is null or faixa_etaria_fonte in ('mda', 'spc_mda', 'spc', 'eleitor')),
  add constraint cdl_base_escolaridade_fonte_check
    check (escolaridade_fonte is null or escolaridade_fonte in ('mda', 'spc_mda', 'spc', 'eleitor')),
  add constraint cdl_base_nivel_economico_fonte_check
    check (nivel_economico_fonte is null or nivel_economico_fonte in ('mda', 'spc_mda', 'spc', 'eleitor')),
  add constraint cdl_base_cadastro_spc_fonte_check
    check (cadastro_spc_fonte is null or cadastro_spc_fonte in ('spc_mda', 'spc')),
  add constraint cdl_base_spc_produto_check
    check (spc_produto is null or spc_produto in ('confirme_pf_11', 'jud_legado'));

alter table eleitores_pesquisa
  add constraint eleitores_pesquisa_sexo_fonte_check
    check (sexo_fonte is null or sexo_fonte in ('mda', 'spc_mda', 'spc', 'eleitor'));

-- 3. Backfill das flags pelas linhas existentes ------------------------------
with participou as (
  select distinct cpf_hash from eleitores_pesquisa
)
update cdl_base b set
  nome_fonte = case
    when b.nome_mascarado is null then null
    when b.origem = 'melhores_do_ano' then 'mda'
    else 'spc' end,
  sexo_fonte = case
    when b.sexo is null then null
    when b.sexo_fonte is not null then b.sexo_fonte
    when b.origem = 'melhores_do_ano' then 'spc_mda'
    else 'spc' end,
  faixa_etaria_fonte = case
    when b.faixa_etaria is null then null
    when b.origem = 'melhores_do_ano' then 'spc_mda'
    else 'spc' end,
  whatsapp_fonte = case
    when b.whatsapp_e164 is null then null
    when p.cpf_hash is not null then 'eleitor'
    when b.origem = 'melhores_do_ano' then 'mda'
    else 'eleitor' end,
  municipio_fonte = case when b.municipio_ibge is null then null else 'eleitor' end,
  escolaridade_fonte = case when b.escolaridade is null then null else 'eleitor' end,
  nivel_economico_fonte = case when b.nivel_economico is null then null else 'eleitor' end
from cdl_base b2
left join participou p on p.cpf_hash = b2.cpf_hash
where b2.cpf_hash = b.cpf_hash;

-- 4. Absorve eleitores_cadastro_spc (todas as linhas vieram do backfill MdA)
update cdl_base b set
  nome_completo      = s.nome_completo,
  nome_mae           = s.nome_mae,
  data_nascimento    = s.data_nascimento,
  idade_consulta     = s.idade_consulta,
  estado_civil       = s.estado_civil,
  cpf_situacao       = s.cpf_situacao,
  cpf_situacao_data  = s.cpf_situacao_data,
  spc_produto        = s.spc_produto,
  spc_payload        = s.spc_payload,
  spc_consultado_em  = s.consultado_em,
  cadastro_spc_fonte = 'spc_mda',
  atualizado_em      = now()
from eleitores_cadastro_spc s
where s.cpf_hash = b.cpf_hash;

-- CPFs que estivessem só na 050 (hoje: nenhum) entram como linha nova.
insert into cdl_base (
  cpf_hash, origem, nome_completo, nome_mae, data_nascimento, idade_consulta,
  estado_civil, cpf_situacao, cpf_situacao_data, spc_produto, spc_payload,
  spc_consultado_em, cadastro_spc_fonte
)
select
  s.cpf_hash, 'melhores_do_ano', s.nome_completo, s.nome_mae, s.data_nascimento,
  s.idade_consulta, s.estado_civil, s.cpf_situacao, s.cpf_situacao_data,
  s.spc_produto, s.spc_payload, s.consultado_em, 'spc_mda'
from eleitores_cadastro_spc s
where not exists (select 1 from cdl_base b where b.cpf_hash = s.cpf_hash);

drop table if exists eleitores_cadastro_spc;

-- 5. Documentação --------------------------------------------------------------
comment on table cdl_base is
  'Cadastro único do eleitor por CPF (hash HMAC). Sala 1: sem vínculo com votos_pesquisa. Cada dado tem <campo>_fonte dizendo de onde veio (mda, spc_mda, spc, eleitor). origem = como a linha nasceu.';
comment on column cdl_base.origem is
  'Como a linha nasceu: melhores_do_ano (import), spc_lookup (consulta em /votar), spc_pesquisa_2026 (insert em /votar/confirma). Proveniência por campo está nas colunas *_fonte.';
comment on column cdl_base.nome_fonte is 'Fonte de nome_mascarado: mda | spc_mda | spc | eleitor';
comment on column cdl_base.municipio_fonte is 'Fonte de municipio_ibge: mda | spc_mda | spc | eleitor';
comment on column cdl_base.whatsapp_fonte is 'Fonte de whatsapp_e164: mda | spc_mda | spc | eleitor';
comment on column cdl_base.sexo_fonte is
  'Fonte de sexo: mda | spc_mda | spc | eleitor. Só ''eleitor'' é editável no formulário; gravado apenas após o OTP e nunca sobrescreve valor cadastral (spc/spc_mda).';
comment on column cdl_base.faixa_etaria_fonte is 'Fonte de faixa_etaria: spc_mda | spc (nunca perguntada ao eleitor)';
comment on column cdl_base.escolaridade_fonte is 'Fonte de escolaridade: eleitor';
comment on column cdl_base.nivel_economico_fonte is 'Fonte de nivel_economico: eleitor';
comment on column cdl_base.cadastro_spc_fonte is
  'Fonte do bloco SPC (nome_completo … spc_payload): spc_mda = cache do Melhores do Ano; spc = consulta feita por esta pesquisa';
comment on column cdl_base.spc_payload is 'Retorno bruto do SPC (produto em spc_produto). Guardar TUDO — decisão do contratante em 12/09/2026.';
comment on column eleitores_pesquisa.sexo_fonte is
  'Fonte do sexo nesta edição: mda | spc_mda | spc (cadastral) | eleitor (informado em /votar/confirma porque a consulta não trouxe). NULL = anterior à 047 (cadastral).';

create index if not exists cdl_base_cadastro_spc_fonte_idx
  on cdl_base (cadastro_spc_fonte) where cadastro_spc_fonte is not null;
