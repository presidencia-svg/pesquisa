-- 047 · Proveniência do sexo (cadastral × autodeclarado).
--
-- PRÉ-REQUISITO DE DEPLOY: o código de /votar/confirma e o cache cdl_base
-- passam a ler/gravar a coluna sexo_fonte; publicar o código só com esta
-- migração aplicada (aplicada em produção em 09/09/2026, MCP apply_migration
-- "047_sexo_fonte"). Aditiva e anulável — não altera dados existentes.
--
-- Contexto: a partir da 2ª edição, /votar/confirma pergunta o sexo ao eleitor
-- SOMENTE quando a consulta cadastral por CPF (cdl_base / SPC "Confirme PF")
-- não devolve o campo — na 1ª edição, 22% dos respondentes, sobretudo jovens.
-- Sem esta coluna o valor autodeclarado ficaria indistinguível do cadastral
-- na composição da amostra (v_amostra_composicao) e no cache cdl_base.
--
-- Semântica:
--   'cadastral'     = veio de cdl_base (importado) ou do SPC;
--   'autodeclarado' = informado pelo eleitor em /votar/confirma porque a
--                     consulta não trouxe; em cdl_base só é gravado DEPOIS
--                     da validação do OTP e nunca sobrescreve um cadastral;
--   NULL            = registro anterior a esta migration (sexo, quando
--                     presente, veio de cdl_base/SPC — antes de 047 nenhum
--                     valor autodeclarado foi gravado).
-- Aditiva e nullable: não altera dados existentes nem views.
alter table eleitores_pesquisa
  add column if not exists sexo_fonte text
    check (sexo_fonte is null or sexo_fonte in ('cadastral', 'autodeclarado'));

alter table cdl_base
  add column if not exists sexo_fonte text
    check (sexo_fonte is null or sexo_fonte in ('cadastral', 'autodeclarado'));

comment on column eleitores_pesquisa.sexo_fonte is
  'cadastral = cdl_base/SPC; autodeclarado = informado pelo eleitor em /votar/confirma porque a consulta não trouxe; null = anterior à migration 047 (cadastral)';
comment on column cdl_base.sexo_fonte is
  'idem eleitores_pesquisa.sexo_fonte; autodeclarado só é gravado após validação do OTP e nunca sobrescreve valor cadastral';
