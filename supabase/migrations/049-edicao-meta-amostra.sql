-- 049 — Meta de amostra por edição (monitor da coleta)
--
-- A 2ª edição (coleta 13–20/09/2026) tem meta mínima de 50.000 respondentes
-- validados. A meta não é cota nem trava: serve ao painel /admin/amostra pra
-- mostrar o ritmo da coleta e, por categoria do eleitorado (sexo, faixa
-- etária, instrução, município), quantos respondentes faltam pra chegar à
-- proporção do TSE no tamanho da meta — o que orienta o redirecionamento de
-- convites durante a coleta (auditoria de conformidade, set/2026).

alter table public.edicao
  add column if not exists meta_amostra integer
    check (meta_amostra is null or meta_amostra > 0);

comment on column public.edicao.meta_amostra is
  'Meta mínima de respondentes validados (CPF + WhatsApp). Só orienta o monitor da coleta; não bloqueia nem pondera.';
