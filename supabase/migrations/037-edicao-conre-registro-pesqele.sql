-- 037 — Campos de registro PesqEle na edição (gate de divulgação)
--
-- Compliance: Lei 9.504/97 art. 33 + Res. TSE 23.600/2019 c/ 23.747/2026.
-- Antes de divulgar, é preciso: nº de registro válido, estatístico responsável
-- com CONRE, e o registro feito >=5 dias antes. O código passa a EXIGIR esses
-- campos em divulgarEdicao() (não basta mais uma string qualquer em registro_tre).

alter table public.edicao
  add column if not exists numero_conre_responsavel text,
  add column if not exists data_registro_pesqele date;

comment on column public.edicao.numero_conre_responsavel is
  'Nº CONRE do estatístico responsável (Res. TSE 23.747/2026 art. 2º IX) — exigido para divulgar.';
comment on column public.edicao.data_registro_pesqele is
  'Data do registro no PesqEle — divulgação só é liberada >=5 dias após (Lei 9.504/97 art. 33).';
