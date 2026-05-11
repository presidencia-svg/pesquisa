-- ==========================================================================
-- 03-candidatos-referencia.sql
--
-- Popula `candidatos_pesquisa` com os candidatos REAIS de referencia:
--   - Presidente:  candidatos do 1o turno 2022 (Brasil, nacional)
--   - Governador:  candidatos do 1o turno 2022 (SE)
--   - Senador:     candidatos de 2018 (SE) — em 2018 SE elegeu 2
--                  senadores (Alessandro Vieira + Rogerio Carvalho), MESMA
--                  dinamica de 2026 (2 vagas). 2022 elegeu so 1 vaga e
--                  e' menos util como baseline.
--
-- Tres `ano_referencia` no batch:
--   2018 → senador
--   2022 → presidente + governador
--
-- votos_referencia serve de coeficiente baseline pras projecoes 2026.
-- foto_url permanece NULL — admin pode preencher via /admin/candidatos.
--
-- IMPORTANTE: dados sao HISTORICOS. Antes do registro PesqEle pra a
-- pesquisa real de 2026, LIMPAR e re-popular com os candidatos
-- efetivamente registrados pelo TRE/SE em 2026.
--
-- Roda APOS as migrations 001 + 002 + 003 + 004.
-- Substitui completamente o seed 01-partidos-candidatos-teste.sql.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- (0) Insere partidos historicos que aparecem nas listas 2018/2022 mas
--     nao estavam no seed inicial. ON CONFLICT pra nao mexer no que ja tem.
-- --------------------------------------------------------------------------
insert into partidos (numero, sigla, nome, cor_hex) values
  (16, 'PSTU',  'Partido Socialista dos Trabalhadores Unificado', '#cc0000'),
  (18, 'REDE',  'Rede Sustentabilidade',                          '#15ab53'),
  (21, 'PCB',   'Partido Comunista Brasileiro',                   '#a4161a'),
  (27, 'DC',    'Democracia Crista',                              '#143974'),
  (33, 'PMN',   'Partido da Mobilizacao Nacional',                '#5cabba'),
  (54, 'PPL',   'Partido Patria Livre (historico 2018)',          '#27ae60'),
  (80, 'UP',    'Unidade Popular',                                '#e3000f')
on conflict (numero) do nothing;

-- --------------------------------------------------------------------------
-- (1) Limpa candidatos antigos da edicao ativa
-- --------------------------------------------------------------------------
do $$
declare
  v_edicao_id uuid;
begin
  select id into v_edicao_id from edicao where ativa = true limit 1;
  if v_edicao_id is null then
    raise exception 'Nenhuma edicao ativa. Crie e ative uma edicao primeiro.';
  end if;

  delete from candidatos_pesquisa where edicao_id = v_edicao_id;

  -- ─── PRESIDENTE BR 2022 (1º turno) ─────────────────────────────────────
  insert into candidatos_pesquisa
    (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem, ano_referencia, votos_referencia)
  select v_edicao_id, 'presidente', 13, 'LULA', 'Luiz Inácio Lula da Silva',
         id, 1, 2022, 57259504 from partidos where numero = 13
  union all
  select v_edicao_id, 'presidente', 22, 'JAIR BOLSONARO', 'Jair Messias Bolsonaro',
         id, 2, 2022, 51072345 from partidos where numero = 22
  union all
  select v_edicao_id, 'presidente', 15, 'SIMONE TEBET', 'Simone Nassar Tebet',
         id, 3, 2022, 4915423 from partidos where numero = 15
  union all
  select v_edicao_id, 'presidente', 12, 'CIRO GOMES', 'Ciro Ferreira Gomes',
         id, 4, 2022, 3599287 from partidos where numero = 12
  union all
  select v_edicao_id, 'presidente', 44, 'SORAYA', 'Soraya Vieira Thronicke',
         id, 5, 2022, 600955 from partidos where numero = 44
  union all
  select v_edicao_id, 'presidente', 30, 'FELIPE D''ÁVILA', 'Luiz Felipe Chaves d''Ávila',
         id, 6, 2022, 559708 from partidos where numero = 30
  union all
  select v_edicao_id, 'presidente', 17, 'PADRE KELMON', 'Kelmon Luís da Silva Souza',
         id, 7, 2022, 81129 from partidos where numero = 17
  union all
  select v_edicao_id, 'presidente', 80, 'LEO PÉRICLES', 'Léo Péricles Camargo da Silva',
         id, 8, 2022, 50199 from partidos where numero = 80
  union all
  select v_edicao_id, 'presidente', 21, 'SOFIA MANZANO', 'Sofia Padua Manzano',
         id, 9, 2022, 45596 from partidos where numero = 21
  union all
  select v_edicao_id, 'presidente', 16, 'VERA', 'Vera Lúcia Pereira da Silva Salgado',
         id, 10, 2022, 38389 from partidos where numero = 16
  union all
  select v_edicao_id, 'presidente', 27, 'EYMAEL', 'José Maria Eymael',
         id, 11, 2022, 16308 from partidos where numero = 27;

  -- ─── GOVERNADOR SE 2022 (1º turno) ─────────────────────────────────────
  -- Fabio venceu no 2º turno com 610.543 votos (51,83%).
  insert into candidatos_pesquisa
    (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem, ano_referencia, votos_referencia)
  select v_edicao_id, 'governador', 13, 'ROGÉRIO CARVALHO', 'Rogério Carvalho Santos',
         id, 1, 2022, 338796 from partidos where numero = 13
  union all
  select v_edicao_id, 'governador', 55, 'FÁBIO MITIDIERI', 'Fábio Cruz Mitidieri',
         id, 2, 2022, 294936 from partidos where numero = 55
  union all
  select v_edicao_id, 'governador', 45, 'ALESSANDRO VIEIRA', 'Alessandro Bezerra Vieira',
         id, 3, 2022, 82495 from partidos where numero = 45
  union all
  select v_edicao_id, 'governador', 50, 'NIULLY CAMPOS', 'Niully Campos Souza Marinho',
         id, 4, 2022, 37366 from partidos where numero = 50
  union all
  select v_edicao_id, 'governador', 27, 'DR. CLÁUDIO', 'Antônio Cláudio Aragão',
         id, 5, 2022, 2655 from partidos where numero = 27
  union all
  select v_edicao_id, 'governador', 80, 'PROF. AROLDO FÉLIX', 'Aroldo Félix de Souza',
         id, 6, 2022, 1044 from partidos where numero = 80
  union all
  select v_edicao_id, 'governador', 16, 'ELINOS SABINO', 'Elinos Sabino da Silva',
         id, 7, 2022, 646 from partidos where numero = 16;

  -- ─── SENADOR SE 2018 (2 vagas eleitas — MESMA dinamica de 2026) ────────
  -- Eleitos: Alessandro Vieira (REDE) e Rogerio Carvalho (PT).
  -- Fontes: TSE 2018, Wikipedia.
  insert into candidatos_pesquisa
    (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem, ano_referencia, votos_referencia)
  select v_edicao_id, 'senador', 181, 'ALESSANDRO VIEIRA', 'Alessandro Bezerra Vieira',
         id, 1, 2018, 474449 from partidos where numero = 18
  union all
  select v_edicao_id, 'senador', 131, 'ROGÉRIO CARVALHO', 'Rogério Carvalho Santos',
         id, 2, 2018, 300247 from partidos where numero = 13
  union all
  select v_edicao_id, 'senador', 200, 'ANDRÉ MOURA', 'André Moura',
         id, 3, 2018, 251213 from partidos where numero = 20
  union all
  select v_edicao_id, 'senador', 155, 'JACKSON BARRETO', 'Jackson Barreto de Lima',
         id, 4, 2018, 204677 from partidos where numero = 15
  union all
  select v_edicao_id, 'senador', 404, 'ANTÔNIO CARLOS VALADARES', 'Antônio Carlos Valadares',
         id, 5, 2018, 175155 from partidos where numero = 40
  union all
  select v_edicao_id, 'senador', 100, 'PASTOR HELENO', 'Heleno Silva',
         id, 6, 2018, 165039 from partidos where numero = 10
  union all
  select v_edicao_id, 'senador', 540, 'HENRI CLAY', 'Henri Clay Andrade dos Santos',
         id, 7, 2018, 109562 from partidos where numero = 54
  union all
  select v_edicao_id, 'senador', 500, 'SÔNIA MEIRE', 'Sônia Meire Santos Andrade Vieira',
         id, 8, 2018, 62770 from partidos where numero = 50
  union all
  select v_edicao_id, 'senador', 177, 'CADU SILVA', 'Cadu Silva',
         id, 9, 2018, 43215 from partidos where numero = 17
  union all
  select v_edicao_id, 'senador', 433, 'REYNALDO NUNES', 'Reynaldo Nunes',
         id, 10, 2018, 27147 from partidos where numero = 43
  union all
  select v_edicao_id, 'senador', 505, 'JOSSIMÁRIO MICK', 'Jossimário Mick',
         id, 11, 2018, 11650 from partidos where numero = 50
  union all
  select v_edicao_id, 'senador', 161, 'CLARCKSON MESSIAS', 'Clarckson Messias',
         id, 12, 2018, 2960 from partidos where numero = 16;

  raise notice 'Candidatos de referencia (Pres+Gov 2022, Sen 2018) importados.';
end $$;

-- --------------------------------------------------------------------------
-- CONFERÊNCIA pós-execução
-- --------------------------------------------------------------------------
-- select cargo, count(*), min(ano_referencia), max(ano_referencia)
-- from candidatos_pesquisa
-- where edicao_id in (select id from edicao where ativa=true)
-- group by cargo order by cargo;
--
-- Esperado:
--   governador: 7,  2022, 2022
--   presidente: 11, 2022, 2022
--   senador:    12, 2018, 2018

-- --------------------------------------------------------------------------
-- TODO operacional
-- 1. Conferir nomes/numeros em /admin/candidatos.
-- 2. Preencher foto_url de cada candidato.
-- 3. Atualizar partidos.votos_referencia_se com totais 2022 (Fed/Est)
--    por partido em SE, quando dispusermos do dado consolidado.
-- 4. Antes do registro PesqEle 2026: LIMPAR esses dados e inserir
--    candidatos efetivamente registrados pelo TRE/SE.
-- --------------------------------------------------------------------------
