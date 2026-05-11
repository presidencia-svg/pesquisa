-- ==========================================================================
-- 03-candidatos-2022.sql
--
-- Popula `candidatos_pesquisa` com os candidatos REAIS de 2022 (Presidente
-- nacional + Governador SE + Senador SE). Inclui o total de votos
-- recebidos como `votos_referencia` pra servir de coeficiente baseline
-- nas projeções de 2026.
--
-- IMPORTANTE: dados de 2022 são REFERÊNCIA. Antes do registro PesqEle
-- pra a pesquisa real, esta tabela DEVE ser limpa e reabastecida com os
-- candidatos efetivamente registrados pelo TRE em 2026. Use o ano_referencia
-- pra distinguir: 2022 = baseline, 2026 = registro real.
--
-- foto_url está NULL — pode ser preenchido depois pelo admin via
-- /admin/candidatos, ou por script futuro que busca da TSE.
--
-- Roda APOS as migrations 001 + 002 + 003 + 004.
-- Substitui completamente o seed 01-partidos-candidatos-teste.sql.
--
-- Fontes:
--   - Governador SE 2022 1º turno: TSE / Gazeta do Povo
--     (https://www.gazetadopovo.com.br/eleicoes/2022/se/...)
--   - Senador SE 2022: TSE / Gazeta do Povo
--   - Presidente: TSE oficial 2022 (1º turno nacional)
-- ==========================================================================

do $$
declare
  v_edicao_id uuid;
begin
  select id into v_edicao_id from edicao where ativa = true limit 1;
  if v_edicao_id is null then
    raise exception 'Nenhuma edicao ativa. Crie e ative uma edicao primeiro.';
  end if;

  -- Limpa candidatos antigos desta edicao (TESTE A/B/C do seed 01)
  delete from candidatos_pesquisa where edicao_id = v_edicao_id;

  -- ─── PRESIDENTE BRASIL 2022 (1º turno, dados nacionais) ────────────────
  -- Numeros e votos do 1º turno 2022 (resultado oficial TSE).
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

  -- ─── GOVERNADOR SE 2022 (1º turno) ──────────────────────────────────────
  -- Fonte: TSE / Gazeta do Povo. Fábio venceu no 2º turno com 610.543 votos.
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

  -- ─── SENADOR SE 2022 (1 vaga eleita, turno único) ──────────────────────
  -- Em 2026 SE elege 2 senadores. Os candidatos vao mudar.
  -- Esses sao da eleicao passada, servem de coeficiente baseline.
  insert into candidatos_pesquisa
    (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem, ano_referencia, votos_referencia)
  select v_edicao_id, 'senador', 111, 'LAÉRCIO OLIVEIRA', 'Laércio José de Oliveira',
         id, 1, 2022, 310300 from partidos where numero = 11
  union all
  select v_edicao_id, 'senador', 404, 'VALADARES FILHO', 'Antônio Carlos Valadares Filho',
         id, 2, 2022, 267756 from partidos where numero = 40
  union all
  select v_edicao_id, 'senador', 222, 'EDUARDO AMORIM', 'Eduardo Amorim de Almeida',
         id, 3, 2022, 246398 from partidos where numero = 22
  union all
  select v_edicao_id, 'senador', 190, 'DANIELLE GARCIA', 'Danielle Cristine Garcia Mendes',
         id, 4, 2022, 206135 from partidos where numero = 19
  union all
  select v_edicao_id, 'senador', 500, 'HENRI CLAY', 'Henri Clay Andrade dos Santos',
         id, 5, 2022, 52741 from partidos where numero = 50
  union all
  select v_edicao_id, 'senador', 161, 'HERALDO GOES', 'Heraldo Pereira Goes',
         id, 6, 2022, 1600 from partidos where numero = 16
  union all
  select v_edicao_id, 'senador', 270, 'AIRTON COSTA', 'Airton Costa dos Santos',
         id, 7, 2022, 1333 from partidos where numero = 27;

  raise notice 'Candidatos 2022 importados.';
end $$;

-- --------------------------------------------------------------------------
-- CONFERÊNCIA pós-execução
-- --------------------------------------------------------------------------
-- Lista quantos candidatos por cargo:
--   select cargo, count(*) from candidatos_pesquisa
--    where edicao_id in (select id from edicao where ativa=true)
--    group by cargo order by cargo;
-- Esperado: presidente=11, governador=7, senador=7

-- --------------------------------------------------------------------------
-- TODO — apos rodar este seed:
-- 1. Conferir nomes e numeros no /admin/candidatos.
-- 2. Subir foto_url de cada candidato (formato JPG/PNG hospedado em
--    URL pública). Pode usar Supabase Storage ou link externo.
-- 3. Atualizar `partidos.votos_referencia_se` quando tivermos os totais
--    por partido em SE 2022 (Deputado Federal + Estadual).
-- 4. Pra registro PesqEle real em 2026, LIMPAR esses dados e inserir os
--    candidatos efetivamente registrados pelo TRE/SE.
-- --------------------------------------------------------------------------
