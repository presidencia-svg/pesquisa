-- 054 — idempotência do convite WhatsApp da 2ª edição na base própria da
-- pesquisa (cdl_base). Espelha votantes.convite_pesquisa2_enviado_em do
-- banco do Melhores do Ano. Usado por scripts/disparar-convite-pesquisa.mjs
-- --base pesquisa (dispara em 13/09/2026, 08h–15h, America/Recife).
-- Aplicada em 12/09/2026.
alter table cdl_base
  add column if not exists convite_pesquisa2_enviado_em timestamptz;

create index if not exists cdl_base_convite_pesquisa2_pendente_idx
  on cdl_base (whatsapp_e164)
  where whatsapp_e164 is not null and convite_pesquisa2_enviado_em is null;

comment on column cdl_base.convite_pesquisa2_enviado_em is
  'Quando o convite WhatsApp da 2ª edição (template convite_pesquisa) foi aceito pela Meta para este número; null = pendente. Opt-out também marca, para nunca voltar à fila.';
