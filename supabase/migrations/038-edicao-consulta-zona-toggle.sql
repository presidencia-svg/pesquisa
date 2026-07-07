-- 038 — Liga/desliga a consulta "Zona de Expansão" (Aracaju × São Cristóvão)
--
-- A cédula de consulta zona_expansao é apresentada condicionalmente a
-- eleitores de Aracaju (2800308) e São Cristóvão (2806701). Nem toda
-- edição vai querer essa pergunta — este flag permite ao admin ligar ou
-- desligar sem mexer em código.
--
-- default true = mantém o comportamento atual (a consulta aparece).

alter table public.edicao
  add column if not exists consulta_zona_ativa boolean not null default true;

comment on column public.edicao.consulta_zona_ativa is
  'Se true, a cédula de consulta Zona de Expansão (Aracaju × São Cristóvão) é apresentada a eleitores de Aracaju/São Cristóvão e conta nos resultados. Se false, é omitida do fluxo de votação e da divulgação.';
