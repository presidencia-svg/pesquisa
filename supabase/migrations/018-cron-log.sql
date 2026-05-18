-- Migration 018 — cron_log
--
-- Auditoria de execuções de jobs agendados (Vercel Cron), em particular
-- a retenção LGPD (whatsapp_codigos, rate_limit_ip, eleitores_pesquisa).
-- Cada execução grava 1 linha com nome do job, status, contagens e
-- mensagem de erro se houver.
--
-- Necessário pra:
--   - Provar à ANPD que a retenção está sendo cumprida (Art. 6º X LGPD).
--   - Painel admin mostrar última execução + contagens.
--   - Investigar falhas (timeouts, erro de FK).
-- --------------------------------------------------------------------------

create table if not exists cron_log (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,                            -- ex.: 'retencao_lgpd'
  status        text not null check (status in ('ok', 'erro')),
  resultado     jsonb,                                    -- ex.: { whatsapp_codigos: 12, rate_limit_ip: 340, eleitores_pesquisa: 0 }
  erro          text,                                     -- mensagem se status = 'erro'
  duracao_ms    integer,                                  -- pra detectar regressão
  executado_em  timestamptz not null default now()
);

create index if not exists cron_log_nome_data_idx
  on cron_log (nome, executado_em desc);

-- O próprio cron_log também tem retenção: 1 ano basta pra evidência ANPD
-- e investigação. Limpeza inclusa no job de retenção LGPD.
