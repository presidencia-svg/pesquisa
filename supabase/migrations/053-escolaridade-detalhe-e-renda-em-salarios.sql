-- 053 — 2ª edição: detalhe da escolaridade e renda em salários mínimos
--
-- Decisão do contratante em 12/09/2026, ao revisar o formulário pra 2ª
-- edição (coleta 13–20/09/2026):
--
--   1. Escolaridade. O estrato de ponderação continua com três níveis
--      (fundamental / medio / superior — o mesmo agregado do TSE e o que
--      consta do registro no PesqEle). O formulário passa a mostrar quatro
--      opções em linguagem corrente, porque quem "não estudou ou só sabe
--      ler e escrever" não se reconhecia em "Ensino fundamental":
--          sem_estudo   → estrato fundamental  (TSE: ANALFABETO, LÊ E ESCREVE)
--          fundamental  → estrato fundamental  (TSE: FUND. INCOMPLETO/COMPLETO)
--          medio        → estrato medio
--          superior     → estrato superior
--      A opção marcada fica em `escolaridade_detalhe`; o estrato derivado
--      continua em `escolaridade`. Linhas da 1ª edição ficam com detalhe
--      NULL (não há como saber).
--
--   2. Renda familiar. Na 1ª edição a pergunta usava classes ABEP
--      (A/B/C/D_E + nao_informado) apresentadas como faixas de R$; 36,7%
--      preferiram não informar e a faixa de baixo ("até R$ 2.800") não
--      separava a maioria do eleitorado sergipano. Passa a ser perguntada em
--      salários mínimos, com "Não sei" separado de "Prefiro não informar":
--          ate_1_sm | 1_a_2_sm | 2_a_5_sm | 5_a_10_sm | mais_10_sm |
--          nao_sei | nao_informado
--      Os valores antigos continuam válidos no CHECK (linhas da 1ª edição
--      não são reescritas); o formulário não os oferece mais e não os
--      pré-preenche.
--
-- Ponderação: nada muda (renda não pondera; o estrato de escolaridade é o
-- mesmo). Aditiva. Nenhuma linha existente é alterada.

-- 1. escolaridade_detalhe -------------------------------------------------------
alter table eleitores_pesquisa
  add column if not exists escolaridade_detalhe text;
alter table cdl_base
  add column if not exists escolaridade_detalhe text;

alter table eleitores_pesquisa drop constraint if exists eleitores_pesquisa_escolaridade_detalhe_check;
alter table eleitores_pesquisa
  add constraint eleitores_pesquisa_escolaridade_detalhe_check
    check (escolaridade_detalhe is null
           or escolaridade_detalhe in ('sem_estudo', 'fundamental', 'medio', 'superior'));

alter table cdl_base drop constraint if exists cdl_base_escolaridade_detalhe_check;
alter table cdl_base
  add constraint cdl_base_escolaridade_detalhe_check
    check (escolaridade_detalhe is null
           or escolaridade_detalhe in ('sem_estudo', 'fundamental', 'medio', 'superior'));

-- Coerência detalhe × estrato (quando os dois existem).
alter table eleitores_pesquisa drop constraint if exists eleitores_pesquisa_escolaridade_coerente_check;
alter table eleitores_pesquisa
  add constraint eleitores_pesquisa_escolaridade_coerente_check
    check (escolaridade_detalhe is null or escolaridade is null
           or escolaridade = case escolaridade_detalhe
                               when 'sem_estudo' then 'fundamental'
                               else escolaridade_detalhe end);

alter table cdl_base drop constraint if exists cdl_base_escolaridade_coerente_check;
alter table cdl_base
  add constraint cdl_base_escolaridade_coerente_check
    check (escolaridade_detalhe is null or escolaridade is null
           or escolaridade = case escolaridade_detalhe
                               when 'sem_estudo' then 'fundamental'
                               else escolaridade_detalhe end);

comment on column eleitores_pesquisa.escolaridade_detalhe is
  'Opção marcada no formulário (2ª edição em diante): sem_estudo | fundamental | medio | superior. O estrato de ponderação é `escolaridade` (sem_estudo → fundamental). NULL = 1ª edição.';
comment on column cdl_base.escolaridade_detalhe is
  'Opção marcada no formulário (2ª edição em diante): sem_estudo | fundamental | medio | superior. Estrato em `escolaridade`; fonte em escolaridade_fonte.';

-- 2. nivel_economico: amplia o vocabulário ----------------------------------------
-- Os CHECKs da 026 foram criados inline (nome gerado: <tabela>_nivel_economico_check).
-- Remove qualquer CHECK que envolva só essa coluna, seja qual for o nome.
do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tabela
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'c'
       and c.conrelid in ('eleitores_pesquisa'::regclass, 'cdl_base'::regclass, 'votos_pesquisa'::regclass)
       and array_length(c.conkey, 1) = 1
       and a.attname = 'nivel_economico'
  loop
    execute format('alter table %s drop constraint %I', r.tabela, r.conname);
  end loop;
end $$;

alter table eleitores_pesquisa
  add constraint eleitores_pesquisa_nivel_economico_check
    check (nivel_economico is null or nivel_economico in (
      'ate_1_sm', '1_a_2_sm', '2_a_5_sm', '5_a_10_sm', 'mais_10_sm', 'nao_sei', 'nao_informado',
      'A', 'B', 'C', 'D_E'));

alter table cdl_base
  add constraint cdl_base_nivel_economico_check
    check (nivel_economico is null or nivel_economico in (
      'ate_1_sm', '1_a_2_sm', '2_a_5_sm', '5_a_10_sm', 'mais_10_sm', 'nao_sei', 'nao_informado',
      'A', 'B', 'C', 'D_E'));

alter table votos_pesquisa
  add constraint votos_pesquisa_nivel_economico_check
    check (nivel_economico is null or nivel_economico in (
      'ate_1_sm', '1_a_2_sm', '2_a_5_sm', '5_a_10_sm', 'mais_10_sm', 'nao_sei', 'nao_informado',
      'A', 'B', 'C', 'D_E'));

comment on column eleitores_pesquisa.nivel_economico is
  'Renda familiar mensal autodeclarada. 2ª edição: faixas em salários mínimos (ate_1_sm … mais_10_sm, nao_sei, nao_informado). 1ª edição: classes A/B/C/D_E/nao_informado. Não pondera (sem parâmetro oficial do eleitorado por renda).';
comment on column cdl_base.nivel_economico is
  'Renda familiar mensal autodeclarada — mesmo vocabulário de eleitores_pesquisa.nivel_economico. Valores da 1ª edição (A/B/C/D_E) não são pré-preenchidos no formulário.';
comment on column votos_pesquisa.nivel_economico is
  'Cópia controlada da renda do eleitor no momento do voto, sem cpf_hash. 2ª edição em salários mínimos; 1ª edição em classes A/B/C/D_E. "nao_informado" = optou por não declarar; "nao_sei" = não soube estimar.';
