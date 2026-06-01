-- Migration 026 — propagação controlada de demográficos pra votos_pesquisa
--
-- Motivação: o relatório complementar TRE/SE (Resolução 23.747/2026,
-- Art. 2º §7º, IV) exige composição da amostra final por gênero, idade,
-- grau de instrução e nível econômico. E a equipe interna + a TV
-- precisam de cruzamentos demográfico × voto pra contextualizar a
-- narrativa ("jovens em Itabaiana votaram em X").
--
-- Trade-off: a arquitetura "duas salas" original deixava votos_pesquisa
-- totalmente anônimos (só token_hash + voto + município). Agora copiamos
-- os demográficos do eleitor para CADA voto, sem o cpf_hash. Permanece
-- pseudonimizado.
--
-- Defesa contra re-identificação: views agregadoras com supressão de
-- células pequenas (N ≥ 5) — implementadas em migration separada após
-- termos volume de dados pra testar.

-- 1) Nova dimensão: nível econômico (ABEP).
--    Valores possíveis: 'A', 'B', 'C', 'D_E', 'nao_informado'.
ALTER TABLE eleitores_pesquisa
  ADD COLUMN IF NOT EXISTS nivel_economico text
    CHECK (nivel_economico IS NULL
           OR nivel_economico IN ('A','B','C','D_E','nao_informado'));

ALTER TABLE cdl_base
  ADD COLUMN IF NOT EXISTS nivel_economico text
    CHECK (nivel_economico IS NULL
           OR nivel_economico IN ('A','B','C','D_E','nao_informado'));

-- 2) Demográficos em votos_pesquisa (sem cpf_hash).
--    Todos nullable pra preservar votos antigos (que ficam NULL).
ALTER TABLE votos_pesquisa
  ADD COLUMN IF NOT EXISTS sexo text
    CHECK (sexo IS NULL OR sexo IN ('M','F')),
  ADD COLUMN IF NOT EXISTS faixa_etaria text
    CHECK (faixa_etaria IS NULL
           OR faixa_etaria IN ('16-17','18-24','25-34','35-44','45-59','60+')),
  ADD COLUMN IF NOT EXISTS escolaridade text
    CHECK (escolaridade IS NULL
           OR escolaridade IN ('fundamental','medio','superior')),
  ADD COLUMN IF NOT EXISTS nivel_economico text
    CHECK (nivel_economico IS NULL
           OR nivel_economico IN ('A','B','C','D_E','nao_informado'));

-- 3) Índices pra cruzamentos demográficos (parciais — só onde NOT NULL).
CREATE INDEX IF NOT EXISTS votos_demog_sexo_idx
  ON votos_pesquisa (edicao_id, cargo, sexo)
  WHERE sexo IS NOT NULL;

CREATE INDEX IF NOT EXISTS votos_demog_faixa_idx
  ON votos_pesquisa (edicao_id, cargo, faixa_etaria)
  WHERE faixa_etaria IS NOT NULL;

CREATE INDEX IF NOT EXISTS votos_demog_escol_idx
  ON votos_pesquisa (edicao_id, cargo, escolaridade)
  WHERE escolaridade IS NOT NULL;

CREATE INDEX IF NOT EXISTS votos_demog_nivel_idx
  ON votos_pesquisa (edicao_id, cargo, nivel_economico)
  WHERE nivel_economico IS NOT NULL;

COMMENT ON COLUMN votos_pesquisa.sexo IS
  'Cópia do sexo do eleitor no momento do voto, sem cpf_hash.
   Usado pra cruzamento demográfico × voto. Views agregadoras
   aplicam supressão N>=5 pra prevenir re-identificação.';

COMMENT ON COLUMN votos_pesquisa.nivel_economico IS
  'Classes ABEP. Coletado em /votar/confirma. "nao_informado" quando
   eleitor opta por não declarar (LGPD — renda é dado sensível).';
