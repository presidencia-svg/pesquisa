-- ==========================================================================
-- Migration 014 — mesorregiao IBGE em municipios_se
--
-- Adiciona a coluna `regiao` em municipios_se categorizando cada um dos
-- 75 municipios em uma das 3 mesorregioes oficiais do IBGE pra Sergipe:
--
--   'leste'   — Leste Sergipano (Grande Aracaju, Cotinguiba, Baixo SF,
--               litoral). Inclui a capital e a maior concentracao
--               populacional/eleitoral.
--   'agreste' — Agreste Sergipano (centro-sul: Itabaiana, Lagarto,
--               Estancia, Tobias Barreto, agreste meridional).
--   'sertao'  — Sertao Sergipano (norte/noroeste: Glória, Caninde,
--               Porto da Folha, Poço Redondo).
--
-- Usado pra agregacao "lider por regiao" em /resultados.
-- Idempotente.
-- ==========================================================================

alter table municipios_se
  add column if not exists regiao text;

create index if not exists municipios_regiao_idx
  on municipios_se (regiao)
  where regiao is not null;

-- ----- LESTE SERGIPANO -----
update municipios_se set regiao = 'leste' where nome ilike any (array[
  'Aracaju',
  'Barra dos Coqueiros',
  'Nossa Senhora do Socorro',
  'São Cristóvão',
  'Laranjeiras',
  'Maruim',
  'Riachuelo',
  'Carmópolis',
  'General Maynard',
  'Pirambu',
  'Japaratuba',
  'Japoatã',
  'Santo Amaro das Brotas',
  'Capela',
  'Divina Pastora',
  'Siriri',
  'Rosário do Catete',
  'Pacatuba',
  'Brejo Grande',
  'Ilha das Flores',
  'Neópolis',
  'Propriá',
  'Santana do São Francisco',
  'Telha',
  'Cedro de São João',
  'Amparo de São Francisco',
  'Malhada dos Bois',
  'Muribeca',
  'Aquidabã',
  'São Francisco',
  'Nossa Senhora de Lourdes'
]);

-- ----- AGRESTE SERGIPANO -----
update municipios_se set regiao = 'agreste' where nome ilike any (array[
  'Estância',
  'Indiaroba',
  'Santa Luzia do Itanhy',
  'Boquim',
  'Cristinápolis',
  'Tomar do Geru',
  'Pedrinhas',
  'Itabaianinha',
  'Umbaúba',
  'Arauá',
  'Salgado',
  'Itaporanga d''Ajuda',
  'Itaporanga D''Ajuda',
  'Riachão do Dantas',
  'Tobias Barreto',
  'Poço Verde',
  'Lagarto',
  'Simão Dias',
  'Pinhão',
  'Macambira',
  'Campo do Brito',
  'São Domingos',
  'Pedra Mole',
  'Itabaiana',
  'Malhador',
  'Moita Bonita',
  'Areia Branca',
  'Ribeirópolis',
  'Nossa Senhora das Dores',
  'Frei Paulo',
  'Carira',
  'Nossa Senhora Aparecida',
  'Graccho Cardoso',
  'Gracho Cardoso',
  'São Miguel do Aleixo'
]);

-- ----- SERTÃO SERGIPANO -----
update municipios_se set regiao = 'sertao' where nome ilike any (array[
  'Canindé de São Francisco',
  'Poço Redondo',
  'Porto da Folha',
  'Gararu',
  'Nossa Senhora da Glória',
  'Monte Alegre de Sergipe',
  'Canhoba',
  'Itabi',
  'Cumbe',
  'Feira Nova',
  'Santa Rosa de Lima'
]);

-- Validacao: lista municipios sem regiao (precisa rodar manualmente)
-- select ibge_codigo, nome from municipios_se where regiao is null order by nome;
