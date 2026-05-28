-- ==========================================================================
-- 025 — Voto único por token+cargo via UNIQUE INDEX + trigger
-- ==========================================================================
--
-- Fecha vulnerabilidade descoberta na 3a rodada de pentest interno
-- (docs/confidencial/pentest-2026-05-bateria-3-completo.md, Bateria I).
--
-- A regra "1 voto por token por cargo (exceto senador que tem 2)" estava
-- enforced apenas na aplicação via `SELECT count(*) ... if >= vagas`. Padrão
-- TOCTOU: 2 POSTs paralelos com o mesmo cookie `voto` passam o check antes
-- do primeiro INSERT comittar, e ambos gravam → 2 votos do mesmo token no
-- mesmo cargo.
--
-- Confirmado empiricamente em prod (edição "Teste de fluxo"):
-- 334 tokens com 2 votos no MESMO candidato de senador — race condition
-- já aconteceu (ou via double-click sem debounce, ou via paralelismo).
--
-- Esta migration:
--   (1) Limpa duplicatas existentes — preserva o voto mais antigo de cada
--       (token_hash, candidato_id, cargo) e remove os subsequentes.
--   (2) Cria UNIQUE INDEX pra cargos single-vote (Pres/Gov/Fed/Est/Zona).
--   (3) Cria UNIQUE INDEX pra senador no par (token, candidato) — impede
--       2x no mesmo candidato sem afetar brancos.
--   (4) Cria trigger BEFORE INSERT que conta votos de senador por token e
--       barra a partir do 3º, usando pg_advisory_xact_lock pra serializar
--       inserções concorrentes do MESMO token sem bloquear outras.
--
-- Idempotente — usa IF NOT EXISTS / OR REPLACE.
-- ==========================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- (1) Limpa duplicatas existentes — só pra (token, candidato, cargo) onde
-- mais de uma linha existe. Preserva a linha mais antiga (criado_hora ASC,
-- id como desempate). Cargos single-vote duplicados também são limpos.
-- --------------------------------------------------------------------------

WITH dup AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY token_hash, cargo,
                   coalesce(candidato_id::text, ''),
                   coalesce(partido_id::text, ''),
                   coalesce(resposta, ''),
                   metodo
      ORDER BY criado_hora ASC NULLS FIRST, id ASC
    ) AS rn
  FROM votos_pesquisa
)
DELETE FROM votos_pesquisa
WHERE id IN (SELECT id FROM dup WHERE rn > 1);

-- --------------------------------------------------------------------------
-- (2) UNIQUE INDEX para cargos single-vote: 1 voto por (token, cargo).
-- Cobre Pres/Gov/Fed/Est/Zona. Senador fica de fora (tem 2 vagas).
-- --------------------------------------------------------------------------

DROP INDEX IF EXISTS votos_unico_token_cargo_singleshot;
CREATE UNIQUE INDEX votos_unico_token_cargo_singleshot
  ON votos_pesquisa (token_hash, cargo)
  WHERE cargo IN (
    'presidente', 'governador', 'federal', 'estadual', 'zona_expansao'
  );

-- --------------------------------------------------------------------------
-- (3) Senador: impede 2x no MESMO candidato (caso real observado em prod).
-- Não cobre o teto de 2 brancos / 2 nao_sabe — o trigger (4) faz isso.
-- --------------------------------------------------------------------------

DROP INDEX IF EXISTS votos_unico_token_senador_candidato;
CREATE UNIQUE INDEX votos_unico_token_senador_candidato
  ON votos_pesquisa (token_hash, candidato_id)
  WHERE cargo = 'senador' AND candidato_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- (4) Trigger: teto de 2 votos de senador por token.
--
-- UNIQUE INDEX não cobre o teto numérico (count) — cobre só unicidade de
-- combinações. Para "no máximo 2 linhas com cargo=senador por token", uso
-- BEFORE INSERT + advisory lock por token_hash.
--
-- pg_advisory_xact_lock(hashtextextended(token, 0)) serializa inserções
-- de senador do MESMO token até o COMMIT, sem bloquear outros tokens.
-- Custo: latência marginal sob contenção (raríssima em pesquisa).
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_max2_senador()
RETURNS TRIGGER AS $$
DECLARE
  qtd INT;
BEGIN
  IF NEW.cargo = 'senador' THEN
    -- Serializa apenas inserções de senador do MESMO token.
    PERFORM pg_advisory_xact_lock(
      hashtextextended(NEW.token_hash, 0)
    );

    SELECT count(*) INTO qtd
    FROM votos_pesquisa
    WHERE token_hash = NEW.token_hash AND cargo = 'senador';

    IF qtd >= 2 THEN
      RAISE EXCEPTION
        'Limite de 2 votos para senador por token foi atingido (token=%, cargo=%)',
        NEW.token_hash, NEW.cargo
        USING ERRCODE = '23505';  -- unique_violation — app já trata
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_max2_senador ON votos_pesquisa;
CREATE TRIGGER trg_max2_senador
  BEFORE INSERT ON votos_pesquisa
  FOR EACH ROW EXECUTE FUNCTION fn_max2_senador();

-- --------------------------------------------------------------------------
-- (5) Documentação inline pra próxima pessoa que ler.
-- --------------------------------------------------------------------------

COMMENT ON INDEX votos_unico_token_cargo_singleshot IS
  '1 voto por (token, cargo) — fecha race TOCTOU em Pres/Gov/Fed/Est/Zona';
COMMENT ON INDEX votos_unico_token_senador_candidato IS
  '1 voto por (token, candidato) em senador — impede dupla no mesmo cara';
COMMENT ON FUNCTION fn_max2_senador() IS
  'Teto de 2 votos de senador por token, serializado via advisory lock';

COMMIT;
