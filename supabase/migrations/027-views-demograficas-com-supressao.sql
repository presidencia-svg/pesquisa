-- Migration 027 — views agregadoras com supressão N>=5
-- (mesma SQL aplicada via mcp__supabase__apply_migration em 2026-06-01)

CREATE OR REPLACE VIEW v_amostra_composicao
WITH (security_invoker = true) AS
SELECT edicao_id, 'sexo' AS dimensao, sexo AS valor, count(*)::int AS n
  FROM eleitores_pesquisa
 WHERE wa_validado = true AND sexo IS NOT NULL
 GROUP BY edicao_id, sexo
UNION ALL
SELECT edicao_id, 'faixa_etaria', faixa_etaria, count(*)::int
  FROM eleitores_pesquisa
 WHERE wa_validado = true AND faixa_etaria IS NOT NULL
 GROUP BY edicao_id, faixa_etaria
UNION ALL
SELECT edicao_id, 'escolaridade', escolaridade, count(*)::int
  FROM eleitores_pesquisa
 WHERE wa_validado = true AND escolaridade IS NOT NULL
 GROUP BY edicao_id, escolaridade
UNION ALL
SELECT edicao_id, 'nivel_economico', nivel_economico, count(*)::int
  FROM eleitores_pesquisa
 WHERE wa_validado = true AND nivel_economico IS NOT NULL
 GROUP BY edicao_id, nivel_economico
UNION ALL
SELECT edicao_id, 'municipio', municipio_ibge::text, count(*)::int
  FROM eleitores_pesquisa
 WHERE wa_validado = true
 GROUP BY edicao_id, municipio_ibge;

COMMENT ON VIEW v_amostra_composicao IS
  'Composição da amostra final pra relatório complementar TRE/SE.
   Resolução 23.747/2026, Art. 2º §7º, IV.';

CREATE OR REPLACE VIEW v_resultados_demografico
WITH (security_invoker = true) AS
SELECT
  edicao_id, cargo, candidato_id, partido_id,
  'sexo'::text AS dimensao, sexo AS valor,
  count(*)::int AS votos
FROM votos_pesquisa
WHERE sexo IS NOT NULL AND metodo = 'numero'
GROUP BY edicao_id, cargo, candidato_id, partido_id, sexo
HAVING count(*) >= 5
UNION ALL
SELECT edicao_id, cargo, candidato_id, partido_id,
  'faixa_etaria', faixa_etaria, count(*)::int
FROM votos_pesquisa
WHERE faixa_etaria IS NOT NULL AND metodo = 'numero'
GROUP BY edicao_id, cargo, candidato_id, partido_id, faixa_etaria
HAVING count(*) >= 5
UNION ALL
SELECT edicao_id, cargo, candidato_id, partido_id,
  'escolaridade', escolaridade, count(*)::int
FROM votos_pesquisa
WHERE escolaridade IS NOT NULL AND metodo = 'numero'
GROUP BY edicao_id, cargo, candidato_id, partido_id, escolaridade
HAVING count(*) >= 5
UNION ALL
SELECT edicao_id, cargo, candidato_id, partido_id,
  'nivel_economico', nivel_economico, count(*)::int
FROM votos_pesquisa
WHERE nivel_economico IS NOT NULL AND metodo = 'numero'
GROUP BY edicao_id, cargo, candidato_id, partido_id, nivel_economico
HAVING count(*) >= 5;

COMMENT ON VIEW v_resultados_demografico IS
  'Cruzamento candidato × dimensão × voto com supressão N>=5.';
