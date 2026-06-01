-- Migration 028 — completa as views demográficas
-- (mesma SQL aplicada via mcp__supabase__apply_migration em 2026-06-01)
-- (1) v_amostra_composicao retorna NOME do município + região
-- (2) v_resultados_demografico ganha município e região como dimensões

DROP VIEW IF EXISTS v_amostra_composicao;
CREATE VIEW v_amostra_composicao
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
SELECT e.edicao_id, 'municipio', m.nome, count(*)::int
  FROM eleitores_pesquisa e
  LEFT JOIN municipios_se m ON m.ibge_codigo = e.municipio_ibge
 WHERE e.wa_validado = true
 GROUP BY e.edicao_id, m.nome
UNION ALL
SELECT e.edicao_id, 'regiao', m.regiao, count(*)::int
  FROM eleitores_pesquisa e
  LEFT JOIN municipios_se m ON m.ibge_codigo = e.municipio_ibge
 WHERE e.wa_validado = true AND m.regiao IS NOT NULL
 GROUP BY e.edicao_id, m.regiao;

DROP VIEW IF EXISTS v_resultados_demografico;
CREATE VIEW v_resultados_demografico
WITH (security_invoker = true) AS
SELECT edicao_id, cargo, candidato_id, partido_id,
  'sexo'::text AS dimensao, sexo AS valor, count(*)::int AS votos
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
HAVING count(*) >= 5
UNION ALL
SELECT v.edicao_id, v.cargo, v.candidato_id, v.partido_id,
  'municipio'::text, m.nome, count(*)::int
FROM votos_pesquisa v
LEFT JOIN municipios_se m ON m.ibge_codigo = v.municipio_ibge
WHERE v.municipio_ibge IS NOT NULL AND v.metodo = 'numero'
GROUP BY v.edicao_id, v.cargo, v.candidato_id, v.partido_id, m.nome
HAVING count(*) >= 5
UNION ALL
SELECT v.edicao_id, v.cargo, v.candidato_id, v.partido_id,
  'regiao', m.regiao, count(*)::int
FROM votos_pesquisa v
LEFT JOIN municipios_se m ON m.ibge_codigo = v.municipio_ibge
WHERE m.regiao IS NOT NULL AND v.metodo = 'numero'
GROUP BY v.edicao_id, v.cargo, v.candidato_id, v.partido_id, m.regiao;
