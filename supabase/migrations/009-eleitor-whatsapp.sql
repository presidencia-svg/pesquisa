-- ==========================================================================
-- Migration 009 — guarda WhatsApp confirmado no registro do eleitor
--
-- Antes, o whatsapp_e164 vivia apenas em cdl_base (pra re-uso em
-- pesquisas futuras) e em whatsapp_codigos (efemero, OTP). Eleitores
-- entrantes via SPC (fonte='spc') tinham o numero gravado em cdl_base
-- via upsert, mas o registro especifico desta edicao no
-- eleitores_pesquisa nao mantinha referencia explicita.
--
-- Agora a coluna existe na sala 1. Util pra:
--   - Auditoria: PesqEle/Art. 13 da Res. 23.747/2026 pede dados
--     auditaveis com canal de contato.
--   - Antifraude pos-coleta: identificar numeros em ralo (varios CPFs
--     diferentes usando o mesmo whatsapp).
--   - Suporte: contactar respondente caso ele reporte problema.
--
-- Mantemos a sala 2 (votos_pesquisa) sem qualquer referencia.
-- Anonimato arquitetural continua intacto.
-- ==========================================================================

alter table eleitores_pesquisa
  add column if not exists whatsapp_e164 text;

create index if not exists eleitores_whatsapp_idx
  on eleitores_pesquisa (edicao_id, whatsapp_e164)
  where whatsapp_e164 is not null;
