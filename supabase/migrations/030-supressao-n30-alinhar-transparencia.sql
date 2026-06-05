-- Migration 030 — sobe supressão de N>=5 pra N>=30 em v_resultados_demografico
-- (mesma SQL aplicada via mcp__supabase__apply_migration em 2026-06-01)
-- Alinha com promessa pública em /transparencia (k≥30, padrão IBGE/Datafolha).

DROP VIEW IF EXISTS v_resultados_demografico;
CREATE VIEW v_resultados_demografico
WITH (security_invoker = true) AS
SELECT edicao_id, cargo, candidato_id, partido_id,
  'sexo'::text AS dimensao, sexo AS valor, count(*)::int AS votos
FROM votos_pesquisa WHERE sexo IS NOT NULL AND metodo = 'numero'
GROUP BY edicao_id, cargo, candidato_id, partido_id, sexo HAVING count(*) >= 30
UNION ALL
SELECT edicao_id, cargo, candidato_id, partido_id, 'faixa_etaria', faixa_etaria, count(*)::int
FROM votos_pesquisa WHERE faixa_etaria IS NOT NULL AND metodo = 'numero'
GROUP BY edicao_id, cargo, candidato_id, partido_id, faixa_etaria HAVING count(*) >= 30
UNION ALL
SELECT edicao_id, cargo, candidato_id, partido_id, 'escolaridade', escolaridade, count(*)::int
FROM votos_pesquisa WHERE escolaridade IS NOT NULL AND metodo = 'numero'
GROUP BY edicao_id, cargo, candidato_id, partido_id, escolaridade HAVING count(*) >= 30
UNION ALL
SELECT edicao_id, cargo, candidato_id, partido_id, 'nivel_economico', nivel_economico, count(*)::int
FROM votos_pesquisa WHERE nivel_economico IS NOT NULL AND metodo = 'numero'
GROUP BY edicao_id, cargo, candidato_id, partido_id, nivel_economico HAVING count(*) >= 30
UNION ALL
SELECT v.edicao_id, v.cargo, v.candidato_id, v.partido_id, 'municipio'::text, m.nome, count(*)::int
FROM votos_pesquisa v LEFT JOIN municipios_se m ON m.ibge_codigo = v.municipio_ibge
WHERE v.municipio_ibge IS NOT NULL AND v.metodo = 'numero'
GROUP BY v.edicao_id, v.cargo, v.candidato_id, v.partido_id, m.nome HAVING count(*) >= 30
UNION ALL
SELECT v.edicao_id, v.cargo, v.candidato_id, v.partido_id, 'regiao', m.regiao, count(*)::int
FROM votos_pesquisa v LEFT JOIN municipios_se m ON m.ibge_codigo = v.municipio_ibge
WHERE m.regiao IS NOT NULL AND v.metodo = 'numero'
GROUP BY v.edicao_id, v.cargo, v.candidato_id, v.partido_id, m.regiao;
