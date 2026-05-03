-- ==========================================================================
-- 001-schema-base.sql
-- Schema base da Pesquisa Sergipe 2026.
--
-- Arquitetura "duas salas": eleitores_pesquisa (validacao) e
-- tokens_emitidos + votos_pesquisa (votacao). NAO HA foreign key entre
-- as salas — essa e' a garantia tecnica de anonimato.
--
-- Roda no SQL Editor do Supabase apos criar o projeto novo. Idempotente.
-- ==========================================================================

-- Extensoes uteis
create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- TABELA — edicao
-- Cada rodada de pesquisa (piloto + producao final) e' uma edicao.
-- --------------------------------------------------------------------------
create table if not exists edicao (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,                          -- ex: "Piloto Jun/2026", "Pesquisa Outubro 2026"
  inicio        timestamptz not null,
  fim           timestamptz not null,
  ativa         boolean not null default false,
  registro_tre  text,                                   -- numero do registro no TRE/SE
  criado_em     timestamptz not null default now()
);

create unique index if not exists edicao_unica_ativa
  on edicao(ativa) where ativa = true;

-- --------------------------------------------------------------------------
-- TABELA — municipios_se
-- Os 75 municipios de Sergipe + eleitorado oficial do TSE pra cota.
-- Popular via seed depois.
-- --------------------------------------------------------------------------
create table if not exists municipios_se (
  ibge_codigo   integer primary key,
  nome          text not null,
  zona_expansao boolean not null default false,        -- true so pra Aracaju + Sao Cristovao
  eleitorado    integer not null,                       -- TSE
  cota_pesquisa integer,                                -- limite de cadastros (sera calculado)
  criado_em     timestamptz not null default now()
);

create index if not exists municipios_nome_idx on municipios_se (nome);

-- --------------------------------------------------------------------------
-- SALA 1 — VALIDACAO
-- Quem e' elegivel pra votar nesta edicao. NAO TEM COLUNA DE VOTO.
-- --------------------------------------------------------------------------
create table if not exists eleitores_pesquisa (
  id                  uuid primary key default gen_random_uuid(),
  edicao_id           uuid not null references edicao(id),
  cpf_hash            text not null,                    -- sha256(cpf + secret)
  cpf_mascarado       text not null,                    -- '***.***.123-XX' (LGPD)
  nome_mascarado      text,                             -- 'Maria S. ***'
  municipio_ibge      integer not null references municipios_se(ibge_codigo),
  spc_validado        boolean not null default false,
  wa_validado         boolean not null default false,
  ip                  text,
  user_agent          text,
  device_fingerprint  text,
  criado_em           timestamptz not null default now(),
  unique (edicao_id, cpf_hash)
);

create index if not exists eleitores_municipio_idx
  on eleitores_pesquisa (edicao_id, municipio_ibge);
create index if not exists eleitores_fp_idx
  on eleitores_pesquisa (edicao_id, device_fingerprint)
  where device_fingerprint is not null;

-- --------------------------------------------------------------------------
-- SALA 2 — VOTACAO
-- Tokens emitidos e votos. NAO TEM REFERENCIA a eleitores_pesquisa.
-- --------------------------------------------------------------------------
create table if not exists tokens_emitidos (
  token_hash    text primary key,                       -- sha256(token + secret)
  edicao_id     uuid not null references edicao(id),
  usado         boolean not null default false,
  criado_hora   timestamptz not null                    -- TRUNCADO pra hora (sem minuto/segundo)
);

create index if not exists tokens_edicao_idx on tokens_emitidos (edicao_id, usado);

create table if not exists votos_pesquisa (
  id              uuid primary key default gen_random_uuid(),
  token_hash      text not null references tokens_emitidos(token_hash),
  edicao_id       uuid not null references edicao(id),
  cargo           text not null check (cargo in ('presidente', 'governador', 'senador', 'federal', 'estadual')),
  candidato_id    uuid,                                 -- pra Pres/Gov/Sen
  partido_id      uuid,                                 -- pra Fed/Est
  criado_hora     timestamptz not null,                 -- TRUNCADO pra hora
  -- Constraint: cargo decide qual coluna e' usada
  check (
    (cargo in ('presidente', 'governador', 'senador') and candidato_id is not null and partido_id is null)
    or
    (cargo in ('federal', 'estadual') and partido_id is not null and candidato_id is null)
  )
);

create index if not exists votos_edicao_cargo_idx
  on votos_pesquisa (edicao_id, cargo);
create index if not exists votos_candidato_idx
  on votos_pesquisa (edicao_id, candidato_id) where candidato_id is not null;
create index if not exists votos_partido_idx
  on votos_pesquisa (edicao_id, partido_id) where partido_id is not null;

-- Senador permite ate 2 votos por token na mesma edicao
-- Pres/Gov/Fed/Est: maximo 1 voto por token na edicao
-- Constraint via trigger ou via aplicacao (mais simples na app por enquanto)

-- --------------------------------------------------------------------------
-- TABELA — partidos
-- Os ~30 partidos com registro no TSE (popular via seed).
-- --------------------------------------------------------------------------
create table if not exists partidos (
  id            uuid primary key default gen_random_uuid(),
  numero        integer not null unique,                -- 13, 22, 45, etc
  sigla         text not null unique,
  nome          text not null,
  cor_hex       text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- TABELA — candidatos_pesquisa
-- Pra Pres/Gov/Sen. Vinculado a partido.
-- --------------------------------------------------------------------------
create table if not exists candidatos_pesquisa (
  id            uuid primary key default gen_random_uuid(),
  edicao_id     uuid not null references edicao(id),
  cargo         text not null check (cargo in ('presidente', 'governador', 'senador')),
  numero        integer not null,                       -- numero na cedula
  nome_urna     text not null,
  nome_completo text,
  partido_id    uuid not null references partidos(id),
  foto_url      text,
  ordem         integer,                                -- ordem de exibicao na cedula (random ou fixo)
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  unique (edicao_id, cargo, numero)
);

-- --------------------------------------------------------------------------
-- TABELA — rate_limit_ip
-- Throttle de tentativas pra evitar bots.
-- --------------------------------------------------------------------------
create table if not exists rate_limit_ip (
  id          bigserial primary key,
  ip          text not null,
  acao        text not null,
  criado_em   timestamptz not null default now()
);

create index if not exists rate_limit_ip_lookup
  on rate_limit_ip (ip, acao, criado_em desc);

-- --------------------------------------------------------------------------
-- TABELA — whatsapp_codigos
-- Codigos OTP enviados, com tentativas.
-- --------------------------------------------------------------------------
create table if not exists whatsapp_codigos (
  id            uuid primary key default gen_random_uuid(),
  edicao_id     uuid not null references edicao(id),
  cpf_hash      text not null,
  whatsapp_e164 text not null,
  codigo_hash   text not null,
  tentativas    integer not null default 0,
  validado      boolean not null default false,
  expira_em     timestamptz not null,
  criado_em     timestamptz not null default now()
);

create index if not exists whatsapp_codigos_lookup
  on whatsapp_codigos (cpf_hash, edicao_id, criado_em desc);

-- --------------------------------------------------------------------------
-- VIEW — resumo_edicao
-- Numeros macro da edicao ativa.
-- --------------------------------------------------------------------------
create or replace view v_resumo_edicao as
select
  e.id                                                                  as edicao_id,
  e.nome,
  e.ativa,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id)      as eleitores_cadastrados,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and spc_validado) as com_spc,
  (select count(*) from eleitores_pesquisa where edicao_id = e.id and wa_validado)  as com_wa,
  (select count(*) from tokens_emitidos where edicao_id = e.id)         as tokens_emitidos,
  (select count(*) from tokens_emitidos where edicao_id = e.id and usado) as tokens_usados,
  (select count(*) from votos_pesquisa where edicao_id = e.id)          as votos_total
from edicao e
where e.ativa = true;
