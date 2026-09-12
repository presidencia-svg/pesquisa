-- 055 — motivo de quem saiu da fila do convite da 2ª edição sem receber
-- mensagem (número inválido, sem nome, já recebeu pela base mda, erro
-- permanente da Meta). Usado por lib/convite-pesquisa.ts (cron Vercel).
alter table cdl_base
  add column if not exists convite_pesquisa2_erro text;

comment on column cdl_base.convite_pesquisa2_erro is
  'Null = convite aceito pela Meta. Preenchido quando convite_pesquisa2_enviado_em foi marcado sem envio (motivo).';
