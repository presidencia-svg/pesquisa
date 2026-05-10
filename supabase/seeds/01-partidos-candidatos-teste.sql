-- ==========================================================================
-- 01-partidos-candidatos-teste.sql
--
-- SEED de teste pra desenvolvimento local. Insere alguns partidos com
-- numeros reais do TSE (informacao publica) e candidatos CLARAMENTE
-- FICTICIOS pra evitar qualquer confusao com personagens reais antes do
-- registro da pesquisa.
--
-- Roda uma vez no SQL Editor APOS as migrations 001+002+003.
-- Nao roda em producao — la os candidatos reais entram via interface
-- administrativa depois do registro no TRE.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- PARTIDOS (numeros reais do TSE)
-- --------------------------------------------------------------------------
insert into partidos (numero, sigla, nome, cor_hex) values
  (10, 'REPUBLICANOS', 'Republicanos', '#1a4f8b'),
  (11, 'PP', 'Progressistas', '#0a2a6e'),
  (12, 'PDT', 'Partido Democratico Trabalhista', '#e3000f'),
  (13, 'PT', 'Partido dos Trabalhadores', '#cc0000'),
  (14, 'PTB', 'Partido Trabalhista Brasileiro', '#fdcb31'),
  (15, 'MDB', 'Movimento Democratico Brasileiro', '#1f8a3a'),
  (17, 'PSL', 'Partido Social Liberal', '#003366'),
  (19, 'PODEMOS', 'Podemos', '#0f4d92'),
  (20, 'PSC', 'Partido Social Cristao', '#159b48'),
  (22, 'PL', 'Partido Liberal', '#003875'),
  (23, 'CIDADANIA', 'Cidadania', '#e3262f'),
  (25, 'UNIAO', 'Uniao Brasil', '#fbb03b'),
  (28, 'PRTB', 'Partido Renovador Trabalhista Brasileiro', '#ffb300'),
  (35, 'PMB', 'Partido da Mulher Brasileira', '#ff80ab'),
  (40, 'PSB', 'Partido Socialista Brasileiro', '#ffcc00'),
  (43, 'PV', 'Partido Verde', '#3aa647'),
  (44, 'NOVO', 'Partido Novo', '#ff6f00'),
  (45, 'PSDB', 'Partido da Social Democracia Brasileira', '#0089cf'),
  (50, 'PSOL', 'Partido Socialismo e Liberdade', '#e8480c'),
  (51, 'PATRIOTA', 'Patriota', '#003876'),
  (54, 'CONSERVADORES', 'Partido Conservador', '#1c3e6b'),
  (55, 'PSD', 'Partido Social Democratico', '#005d8f'),
  (65, 'PCdoB', 'Partido Comunista do Brasil', '#a4161a'),
  (70, 'AVANTE', 'Avante', '#003f7d'),
  (77, 'SOLIDARIEDADE', 'Solidariedade', '#fcaf17'),
  (90, 'PROS', 'Partido Republicano da Ordem Social', '#114981')
on conflict (numero) do nothing;

-- --------------------------------------------------------------------------
-- CANDIDATOS DE TESTE — todos os nomes fictícios. Usados apenas pra
-- desenvolver as cedulas e validar o fluxo. Antes do piloto e da pesquisa
-- real, esta tabela vai ser limpa e populada com candidatos reais
-- registrados pelo TRE.
--
-- Atribui a edicao 'Teste de fluxo' (ou a primeira edicao ativa).
-- --------------------------------------------------------------------------
do $$
declare
  v_edicao_id uuid;
begin
  select id into v_edicao_id from edicao where ativa = true limit 1;
  if v_edicao_id is null then
    raise notice 'Nenhuma edicao ativa. Cria primeiro:';
    raise notice '  insert into edicao (nome, inicio, fim, ativa) values (...);';
    return;
  end if;

  -- Limpa candidatos anteriores desta edicao pra rodar idempotente
  delete from candidatos_pesquisa where edicao_id = v_edicao_id;

  -- ─── PRESIDENTE (2 digitos = numero do partido) ───────────────────────
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'presidente', 13, 'CANDIDATO TESTE A', 'Candidato Teste A da Silva',
         id, 1 from partidos where numero = 13;
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'presidente', 22, 'CANDIDATO TESTE B', 'Candidato Teste B Souza',
         id, 2 from partidos where numero = 22;
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'presidente', 45, 'CANDIDATO TESTE C', 'Candidato Teste C Lima',
         id, 3 from partidos where numero = 45;

  -- ─── GOVERNADOR (2 digitos) ────────────────────────────────────────────
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'governador', 13, 'GOV TESTE A', 'Governador Teste A Sergipe',
         id, 1 from partidos where numero = 13;
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'governador', 22, 'GOV TESTE B', 'Governador Teste B Aracaju',
         id, 2 from partidos where numero = 22;
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'governador', 55, 'GOV TESTE C', 'Governador Teste C Itabaiana',
         id, 3 from partidos where numero = 55;
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'governador', 25, 'GOV TESTE D', 'Governador Teste D Lagarto',
         id, 4 from partidos where numero = 25;

  -- ─── SENADOR (3 digitos = numero do partido + ordem do candidato) ─────
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'senador', 130, 'SEN TESTE A', 'Senador Teste A Sergipano',
         id, 1 from partidos where numero = 13;
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'senador', 220, 'SEN TESTE B', 'Senador Teste B Aracajuana',
         id, 2 from partidos where numero = 22;
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'senador', 555, 'SEN TESTE C', 'Senador Teste C Itabaianense',
         id, 3 from partidos where numero = 55;
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'senador', 251, 'SEN TESTE D', 'Senador Teste D Lagartense',
         id, 4 from partidos where numero = 25;
  insert into candidatos_pesquisa (edicao_id, cargo, numero, nome_urna, nome_completo, partido_id, ordem)
  select v_edicao_id, 'senador', 401, 'SEN TESTE E', 'Senador Teste E Estanciense',
         id, 5 from partidos where numero = 40;
end $$;

-- --------------------------------------------------------------------------
-- CONFERENCIA — quantos candidatos por cargo apos rodar:
-- --------------------------------------------------------------------------
-- select cargo, count(*) from candidatos_pesquisa group by cargo;
