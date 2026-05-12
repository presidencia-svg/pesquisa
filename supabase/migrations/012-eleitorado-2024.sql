-- ==========================================================================
-- Migration 012 — eleitorado oficial 2024 + sem bloqueio por cota
--
-- Atualiza municipios_se.eleitorado com os numeros do TSE/TRE-SE 2024
-- (74 municipios fornecidos pelo cliente — Umbauba precisa confirmacao).
-- Total fornecido: 1.414.773 eleitores SE.
--
-- TAMBEM zera todas as cotas (cota_pesquisa = NULL). A pesquisa nao
-- bloqueia mais por municipio — coleta tudo que vier, e a distorcao
-- amostral e' corrigida pos-coleta via ponderacao por peso.
--
-- Idempotente. Roda repetidas vezes sem dano.
-- ==========================================================================

-- (a) Atualiza eleitorado 2024
-- UPDATE por nome com ilike pra tolerar variacao de acentos/case.
update municipios_se set eleitorado = 6484  where nome ilike 'Santana do São Francisco';
update municipios_se set eleitorado = 3028  where nome ilike 'Amparo de São Francisco';
update municipios_se set eleitorado = 17451 where nome ilike 'Aquidabã';
update municipios_se set eleitorado = 416605 where nome ilike 'Aracaju';
update municipios_se set eleitorado = 9856  where nome ilike 'Arauá';
update municipios_se set eleitorado = 15245 where nome ilike 'Areia Branca';
update municipios_se set eleitorado = 30257 where nome ilike 'Barra dos Coqueiros';
update municipios_se set eleitorado = 8315  where nome ilike 'Brejo Grande';
update municipios_se set eleitorado = 22168 where nome ilike 'Boquim';
update municipios_se set eleitorado = 15766 where nome ilike 'Campo do Brito';
update municipios_se set eleitorado = 4721  where nome ilike 'Canhoba';
update municipios_se set eleitorado = 24884 where nome ilike 'Canindé de São Francisco';
update municipios_se set eleitorado = 27337 where nome ilike 'Capela';
update municipios_se set eleitorado = 17195 where nome ilike 'Carira';
update municipios_se set eleitorado = 13098 where nome ilike 'Carmópolis';
update municipios_se set eleitorado = 5441  where nome ilike 'Cedro de São João';
update municipios_se set eleitorado = 14983 where nome ilike 'Cristinápolis';
update municipios_se set eleitorado = 7687  where nome ilike 'Nossa Senhora Aparecida';
update municipios_se set eleitorado = 4514  where nome ilike 'Cumbe';
update municipios_se set eleitorado = 4402  where nome ilike 'Divina Pastora';
update municipios_se set eleitorado = 51062 where nome ilike 'Estância';
update municipios_se set eleitorado = 6345  where nome ilike 'Feira Nova';
update municipios_se set eleitorado = 13645 where nome ilike 'Frei Paulo';
update municipios_se set eleitorado = 3406  where nome ilike 'General Maynard';
update municipios_se set eleitorado = 9592  where nome ilike 'Gararu';
update municipios_se set eleitorado = 6462  where nome ilike 'Graccho Cardoso' or nome ilike 'Gracho Cardoso';
update municipios_se set eleitorado = 7801  where nome ilike 'Ilha das Flores';
update municipios_se set eleitorado = 14202 where nome ilike 'Indiaroba';
update municipios_se set eleitorado = 75563 where nome ilike 'Itabaiana';
update municipios_se set eleitorado = 32348 where nome ilike 'Itabaianinha';
update municipios_se set eleitorado = 4851  where nome ilike 'Itabi';
update municipios_se set eleitorado = 29885 where nome ilike 'Itaporanga d''Ajuda' or nome ilike 'Itaporanga D''Ajuda';
update municipios_se set eleitorado = 14988 where nome ilike 'Japaratuba';
update municipios_se set eleitorado = 11699 where nome ilike 'Japoatã';
update municipios_se set eleitorado = 80724 where nome ilike 'Lagarto';
update municipios_se set eleitorado = 22426 where nome ilike 'Laranjeiras';
update municipios_se set eleitorado = 6891  where nome ilike 'Macambira';
update municipios_se set eleitorado = 4246  where nome ilike 'Malhada dos Bois';
update municipios_se set eleitorado = 10340 where nome ilike 'Malhador';
update municipios_se set eleitorado = 13300 where nome ilike 'Maruim';
update municipios_se set eleitorado = 9881  where nome ilike 'Moita Bonita';
update municipios_se set eleitorado = 12921 where nome ilike 'Monte Alegre de Sergipe';
update municipios_se set eleitorado = 7678  where nome ilike 'Muribeca';
update municipios_se set eleitorado = 14569 where nome ilike 'Neópolis';
update municipios_se set eleitorado = 29446 where nome ilike 'Nossa Senhora da Glória';
update municipios_se set eleitorado = 21305 where nome ilike 'Nossa Senhora das Dores';
update municipios_se set eleitorado = 6245  where nome ilike 'Nossa Senhora de Lourdes';
update municipios_se set eleitorado = 121723 where nome ilike 'Nossa Senhora do Socorro';
update municipios_se set eleitorado = 12031 where nome ilike 'Pacatuba';
update municipios_se set eleitorado = 3476  where nome ilike 'Pedra Mole';
update municipios_se set eleitorado = 8043  where nome ilike 'Pedrinhas';
update municipios_se set eleitorado = 5607  where nome ilike 'Pinhão';
update municipios_se set eleitorado = 9001  where nome ilike 'Pirambu';
update municipios_se set eleitorado = 22637 where nome ilike 'Poço Redondo';
update municipios_se set eleitorado = 19792 where nome ilike 'Poço Verde';
update municipios_se set eleitorado = 24637 where nome ilike 'Porto da Folha';
update municipios_se set eleitorado = 20350 where nome ilike 'Propriá';
update municipios_se set eleitorado = 17874 where nome ilike 'Riachão do Dantas';
update municipios_se set eleitorado = 8619  where nome ilike 'Riachuelo';
update municipios_se set eleitorado = 14679 where nome ilike 'Ribeirópolis';
update municipios_se set eleitorado = 9181  where nome ilike 'Rosário do Catete';
update municipios_se set eleitorado = 18123 where nome ilike 'Salgado';
update municipios_se set eleitorado = 12803 where nome ilike 'Santa Luzia do Itanhy';
update municipios_se set eleitorado = 4736  where nome ilike 'Santa Rosa de Lima';
update municipios_se set eleitorado = 10793 where nome ilike 'Santo Amaro das Brotas';
update municipios_se set eleitorado = 61587 where nome ilike 'São Cristóvão';
update municipios_se set eleitorado = 8725  where nome ilike 'São Domingos';
update municipios_se set eleitorado = 3848  where nome ilike 'São Francisco';
update municipios_se set eleitorado = 4108  where nome ilike 'São Miguel do Aleixo';
update municipios_se set eleitorado = 37027 where nome ilike 'Simão Dias';
update municipios_se set eleitorado = 7022  where nome ilike 'Siriri';
update municipios_se set eleitorado = 3729  where nome ilike 'Telha';
update municipios_se set eleitorado = 41941 where nome ilike 'Tobias Barreto';
update municipios_se set eleitorado = 10717 where nome ilike 'Tomar do Geru';

-- (b) Zera todas as cotas — pesquisa nao bloqueia mais por municipio.
-- Ponderacao pos-coleta corrige a distorcao de adesao.
update municipios_se set cota_pesquisa = NULL;

-- (c) Validacao: lista municipios sem eleitorado atualizado (pra
-- checar Umbauba e qualquer outro que tenha ficado de fora).
-- Roda manualmente apos a migracao:
--   select ibge_codigo, nome, eleitorado from municipios_se
--    where eleitorado is null or eleitorado = 0
--    order by nome;
