-- 050 — Cadastro completo do eleitor devolvido pelo SPC
--
-- Até aqui a consulta ao SPC ("Confirme PF", produto 11) só deixava no banco
-- o que a ponderação usa (sexo, faixa etária) e o nome mascarado; nome
-- completo, nome da mãe, data de nascimento, estado civil, situação do CPF e
-- o retorno bruto eram descartados. Decisão do contratante em 12/09/2026:
-- guardar TUDO que o SPC devolve, em tabela própria (Sala 1 — nunca se
-- junta a votos_pesquisa, que não tem cpf_hash).
--
-- A exclusão LGPD (/privacidade/excluir) apaga esta tabela junto com
-- cdl_base e eleitores_pesquisa.

create table if not exists public.eleitores_cadastro_spc (
  cpf_hash           text primary key,
  nome_completo      text,
  nome_mae           text,
  data_nascimento    date,
  idade_consulta     integer,
  sexo_bruto         text,          -- como veio ('MASCULINO'/'FEMININO'/outro)
  estado_civil       text,
  cpf_situacao       text,          -- descricaoSituacao / situacaoReceitaFederal
  cpf_situacao_data  date,
  spc_produto        text not null, -- 'confirme_pf_11' | 'jud_legado'
  spc_payload        jsonb not null,
  consultado_em      timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

comment on table public.eleitores_cadastro_spc is
  'Retorno integral do SPC por CPF (hash HMAC, mesmo de cdl_base). Sala 1: dado cadastral, sem vínculo com votos.';

alter table public.eleitores_cadastro_spc enable row level security;
-- Sem policies: só a service role (servidor) lê/escreve.
