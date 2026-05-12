-- ==========================================================================
-- Migration 016 — 5 mesorregioes (adiciona 'centro_sul')
--
-- Refatora a divisao de 4 pra 5 regioes pra ficar igual ao mock Claude
-- Design: separa o "Centro-Sul" (Lagarto + Estancia + Tobias Barreto +
-- agreste meridional/litoral sul) do "Agreste Sergipano" (que fica so'
-- com Itabaiana + entorno).
--
-- Composicao final (75 municipios):
--   grande_aracaju (6):   capital + RMA
--   leste (26):           Cotinguiba + Baixo SF + litoral norte
--   agreste (15):         Itabaiana + entorno + agreste central
--   centro_sul (17):      Lagarto + Estancia + Tobias Barreto + sul
--   sertao (11):          Alto SF + sertao
--
-- Idempotente.
-- ==========================================================================

-- Move 17 municipios pra 'centro_sul' (saem de 'agreste' atual)
update municipios_se
   set regiao = 'centro_sul'
 where nome ilike any (array[
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
   'Riachão do Dantas',
   'Tobias Barreto',
   'Poço Verde',
   'Lagarto',
   'Simão Dias',
   'Pinhão'
 ]);

-- Reorganiza alguns do "Leste" antigo que estavam em outras regioes
-- (pra garantir que Baixo S. Francisco fica no Leste).
update municipios_se
   set regiao = 'leste'
 where nome ilike any (array[
   'Aquidabã',
   'Amparo do São Francisco',
   'Brejo Grande',
   'Capela',
   'Carmópolis',
   'Cedro de São João',
   'Divina Pastora',
   'General Maynard',
   'Ilha das Flores',
   'Japaratuba',
   'Japoatã',
   'Malhada dos Bois',
   'Maruim',
   'Muribeca',
   'Neópolis',
   'Nossa Senhora de Lourdes',
   'Pacatuba',
   'Pirambu',
   'Propriá',
   'Riachuelo',
   'Rosário do Catete',
   'Santana do São Francisco',
   'Santo Amaro das Brotas',
   'São Francisco',
   'Siriri',
   'Telha'
 ]);

-- Garante que 'agreste' fica so' com os 15 do Itabaiana/entorno
update municipios_se
   set regiao = 'agreste'
 where nome ilike any (array[
   'Itabaiana',
   'Malhador',
   'Moita Bonita',
   'Areia Branca',
   'Ribeirópolis',
   'Macambira',
   'Campo do Brito',
   'São Domingos',
   'Pedra Mole',
   'Frei Paulo',
   'Carira',
   'Nossa Senhora Aparecida',
   'Graccho Cardoso',
   'Gracho Cardoso',
   'São Miguel do Aleixo',
   'Nossa Senhora das Dores'
 ]);

-- Garante 'sertao' (11)
update municipios_se
   set regiao = 'sertao'
 where nome ilike any (array[
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

-- Validacao (rodar apos):
--   select regiao, count(*) from municipios_se group by regiao order by regiao;
--   select nome from municipios_se where regiao is null;
