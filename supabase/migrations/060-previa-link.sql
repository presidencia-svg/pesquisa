-- 060 — link de prévia de uso único (estatístico responsável).
--
-- O estatístico precisa examinar o resultado JÁ PONDERADO antes de aprovar a
-- execução do raking — e antes da divulgação (edicao.divulgada_em nulo, tudo
-- trancado ao público). Em vez de dar login de admin, a CDL gera um link:
--
--   /previa/<token>   → tela de abertura (GET não consome: robô de prévia de
--                       link do WhatsApp/e-mail não queima o acesso);
--   botão "Abrir"     → consome o link (UPDATE atômico em aberto_em) e amarra
--                       a sessão ao navegador por cookie httpOnly;
--   /previa/ver       → os números, só pra quem tem o cookie da sessão.
--
-- Quem receber o link repassado encontra "link já utilizado". Só o hash do
-- token e o hash da sessão ficam no banco. Acesso só via service_role.
-- Idempotente.
create table if not exists public.previa_link (
  id                      uuid primary key default gen_random_uuid(),
  token_hash              text not null unique,
  edicao_id               uuid not null references public.edicao(id),
  destinatario            text not null,
  criado_em               timestamptz not null default now(),
  criado_por              text,
  expira_em               timestamptz not null,
  aberto_em               timestamptz,
  sessao_hash             text unique,
  sessao_expira_em        timestamptz,
  ip                      text,
  user_agent              text,
  visualizacoes           integer not null default 0,
  ultima_visualizacao_em  timestamptz,
  revogado_em             timestamptz
);

comment on table public.previa_link is
  'Links de prévia de uso único do resultado ponderado (pré-divulgação). Só hashes; acesso só via service_role.';
comment on column public.previa_link.aberto_em is
  'Momento em que o link foi consumido (botão Abrir). Não nulo = link gasto.';
comment on column public.previa_link.sessao_hash is
  'SHA-256 do segredo do cookie previa_sessao — amarra a prévia ao navegador que abriu.';

alter table public.previa_link enable row level security;
revoke all on public.previa_link from anon, authenticated;
