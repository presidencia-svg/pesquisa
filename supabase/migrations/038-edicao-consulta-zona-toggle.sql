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
  'Controla só a COLETA da consulta Zona de Expansão (Aracaju × São Cristóvão). Se true, a cédula é apresentada a eleitores de Aracaju/São Cristóvão. Se false, a coleta para (a cédula some do fluxo). A divulgação segue os votos: respostas já dadas continuam aparecendo nos resultados/TV mesmo com o flag desligado.';
