-- 046 · Suspensão judicial da divulgação pública (chave de emergência).
--
-- Contexto: tutela deferida em parte na Rp 0601015-42.2026.6.25.0000 (TRE-SE,
-- 07/09/2026) determinou a suspensão da divulgação dos resultados da pesquisa
-- SE-09441/2026 nos sítios/redes/apps sob controle da CDL, "até reapreciação".
--
-- Desenho: NÃO se apaga divulgada_em (é a prova da data real da divulgação,
-- 04/09/2026 09h14 BRT). Cria-se um segundo carimbo, suspensa_em, que faz
-- /resultados, /resultados/[cargo], /resultados/mapa, /tv, /api/divulgacao e o
-- pop-up do site da CDL esconderem os números enquanto estiver preenchido.
-- Ligar/desligar só pelo admin com TOTP; tudo vai pro admin_audit_log.
alter table edicao
  add column if not exists suspensa_em timestamptz,
  add column if not exists suspensao_motivo text;

comment on column edicao.suspensa_em is
  'Divulgação pública suspensa por ordem judicial a partir deste instante (null = não suspensa). Não substitui divulgada_em.';
comment on column edicao.suspensao_motivo is
  'Referência da decisão que determinou a suspensão (ex.: Rp 0601015-42.2026.6.25.0000, TRE-SE).';
