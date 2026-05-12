-- ==========================================================================
-- Migration 015 — categoria 'grande_aracaju' + fix Amparo do São Francisco
--
-- Aracaju + cidades-dormitorio tem perfil eleitoral proprio e dominam
-- a amostra (61% dos eleitores SE). Isolar pra "Grande Aracaju" da
-- analise mais util.
--
-- Composicao oficial da Regiao Metropolitana de Aracaju (LC SE 25/1995
-- + expansao): Aracaju, Barra dos Coqueiros, Nossa Senhora do Socorro,
-- Sao Cristovao, Laranjeiras, Itaporanga d'Ajuda. Esses 6 saem do
-- 'leste' e viram 'grande_aracaju'.
--
-- Tambem corrige fallback da mig 014 (Amparo DO Sao Francisco, nao
-- "de Sao Francisco" como assumi).
--
-- Idempotente.
-- ==========================================================================

-- Corrige a unica falha da mig 014: Amparo "do" S. Francisco
update municipios_se
   set regiao = 'leste'
 where nome ilike 'Amparo do São Francisco'
   and regiao is null;

-- Move 6 municipios do Leste pra Grande Aracaju
update municipios_se
   set regiao = 'grande_aracaju'
 where nome ilike any (array[
   'Aracaju',
   'Barra dos Coqueiros',
   'Nossa Senhora do Socorro',
   'São Cristóvão',
   'Laranjeiras',
   'Itaporanga d''Ajuda',
   'Itaporanga D''Ajuda'
 ]);

-- Validacao (rodar manualmente apos):
--   select regiao, count(*) from municipios_se group by regiao order by regiao;
--   select nome from municipios_se where regiao is null;
