-- ==========================================================================
-- 02-municipios-se.sql
--
-- Popula a tabela `municipios_se` com os 75 municípios oficiais de
-- Sergipe (IBGE) e o eleitorado de referência publicado pelo TSE.
--
-- Fontes:
--   - Códigos IBGE: API pública do IBGE
--     https://servicodados.ibge.gov.br/api/v1/localidades/estados/SE/municipios
--   - Eleitorado: TSE, dados consolidados de 2020/2024 (1.610.407 total).
--
-- IMPORTANTE: os números de eleitorado são REFERÊNCIA. Devem ser
-- atualizados com o snapshot oficial do TSE imediatamente antes do
-- registro PesqEle (set/2026), que vai ter variação por conta de novos
-- eleitores 2025/2026 (em 2024 entraram +50.842 só de primeiros títulos).
-- A atualização entra como migration nova ou via UPDATE no Painel.
--
-- `zona_expansao=true` marca os 4 municípios da Região Metropolitana de
-- Aracaju (RMA), onde a base CDL (votantes do Melhores do Ano) está mais
-- concentrada. Útil pra análise pós-coleta detectar viés geográfico.
--
-- Idempotente — pode rodar múltiplas vezes; ON CONFLICT atualiza.
-- ==========================================================================

insert into municipios_se (ibge_codigo, nome, zona_expansao, eleitorado) values
  (2800100, 'Amparo do São Francisco',     false,   2666),
  (2800209, 'Aquidabã',                    false,  16171),
  (2800308, 'Aracaju',                     true,  404901),
  (2800407, 'Arauá',                       false,   9206),
  (2800506, 'Areia Branca',                false,  13456),
  (2800605, 'Barra dos Coqueiros',         true,   23978),
  (2800670, 'Boquim',                      false,  20880),
  (2800704, 'Brejo Grande',                false,   6742),
  (2801009, 'Campo do Brito',              false,  14346),
  (2801108, 'Canhoba',                     false,   4306),
  (2801207, 'Canindé de São Francisco',    false,  22820),
  (2801306, 'Capela',                      false,  24994),
  (2801405, 'Carira',                      false,  16476),
  (2801504, 'Carmópolis',                  false,  13029),
  (2801603, 'Cedro de São João',           false,   5151),
  (2801702, 'Cristinápolis',               false,  13629),
  (2801900, 'Cumbe',                       false,   4009),
  (2802007, 'Divina Pastora',              false,   3936),
  (2802106, 'Estância',                    false,  47613),
  (2802205, 'Feira Nova',                  false,   5620),
  (2802304, 'Frei Paulo',                  false,  12693),
  (2802403, 'Gararu',                      false,   8852),
  (2802502, 'General Maynard',             false,   2906),
  (2802601, 'Graccho Cardoso',             false,   5869),
  (2802700, 'Ilha das Flores',             false,   7331),
  (2802809, 'Indiaroba',                   false,  12514),
  (2802908, 'Itabaiana',                   false,  68745),
  (2803005, 'Itabaianinha',                false,  29643),
  (2803104, 'Itabi',                       false,   4438),
  (2803203, 'Itaporanga d''Ajuda',         false,  27201),
  (2803302, 'Japaratuba',                  false,  14115),
  (2803401, 'Japoatã',                     false,  10668),
  (2803500, 'Lagarto',                     false,  74041),
  (2803609, 'Laranjeiras',                 false,  21593),
  (2803708, 'Macambira',                   false,   6249),
  (2803807, 'Malhada dos Bois',            false,   3880),
  (2803906, 'Malhador',                    false,   9766),
  (2804003, 'Maruim',                      false,  12240),
  (2804102, 'Moita Bonita',                false,   9152),
  (2804201, 'Monte Alegre de Sergipe',     false,  11539),
  (2804300, 'Muribeca',                    false,   6898),
  (2804409, 'Neópolis',                    false,  13828),
  (2804458, 'Nossa Senhora Aparecida',     false,   7109),
  (2804508, 'Nossa Senhora da Glória',     false,  26611),
  (2804607, 'Nossa Senhora das Dores',     false,  20368),
  (2804706, 'Nossa Senhora de Lourdes',    false,   5592),
  (2804805, 'Nossa Senhora do Socorro',    true,  109118),
  (2804904, 'Pacatuba',                    false,  11447),
  (2805000, 'Pedra Mole',                  false,   3181),
  (2805109, 'Pedrinhas',                   false,   7302),
  (2805208, 'Pinhão',                      false,   5329),
  (2805307, 'Pirambu',                     false,   8169),
  (2805406, 'Poço Redondo',                false,  20599),
  (2805505, 'Poço Verde',                  false,  18674),
  (2805604, 'Porto da Folha',              false,  22581),
  (2805703, 'Propriá',                     false,  19362),
  (2805802, 'Riachão do Dantas',           false,  16817),
  (2805901, 'Riachuelo',                   false,   8019),
  (2806008, 'Ribeirópolis',                false,  13809),
  (2806107, 'Rosário do Catete',           false,   8509),
  (2806206, 'Salgado',                     false,  16159),
  (2806305, 'Santa Luzia do Itanhy',       false,  11417),
  (2806404, 'Santana do São Francisco',    false,   5688),
  (2806503, 'Santa Rosa de Lima',          false,   4073),
  (2806602, 'Santo Amaro das Brotas',      false,   9535),
  (2806701, 'São Cristóvão',               true,   56112),
  (2806800, 'São Domingos',                false,   8056),
  (2806909, 'São Francisco',               false,   3490),
  (2807006, 'São Miguel do Aleixo',        false,   3993),
  (2807105, 'Simão Dias',                  false,  34219),
  (2807204, 'Siriri',                      false,   6678),
  (2807303, 'Telha',                       false,   3424),
  (2807402, 'Tobias Barreto',              false,  38887),
  (2807501, 'Tomar do Geru',               false,   9735),
  (2807600, 'Umbaúba',                     false,  18255)
on conflict (ibge_codigo) do update
  set nome = excluded.nome,
      zona_expansao = excluded.zona_expansao,
      eleitorado = excluded.eleitorado;

-- --------------------------------------------------------------------------
-- CONFERÊNCIA pós-execução
-- Verifique total e número de linhas:
--   select count(*), sum(eleitorado) from municipios_se;
-- Esperado: 75 linhas, sum(eleitorado) ≈ 1.610.407
-- --------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- COTA POR MUNICÍPIO
--
-- A cota_pesquisa é proporcional ao eleitorado, normalizada pelo n
-- amostral total decidido pelo estatístico CONRE.
--
-- Quando n estiver definido (ex.: n=1067 pra ±3pp com IC 95%), rodar:
--
--   update municipios_se
--      set cota_pesquisa = greatest(
--            1,
--            round(eleitorado::numeric * 1067 / 1610407)
--          )
--    where eleitorado > 0;
--
-- Trocar 1067 pelo n decidido. O `greatest(1, ...)` garante que mesmo o
-- menor município (Amparo, 2.666 eleitores → cota teórica de 1,77) tenha
-- pelo menos 1 vaga reservada, em vez de 0.
--
-- Conferir:
--   select sum(cota_pesquisa) from municipios_se;
-- Esperado: aproximadamente igual ao n decidido (pode ter ±5 por
-- arredondamento dos 75 municípios).
-- --------------------------------------------------------------------------
