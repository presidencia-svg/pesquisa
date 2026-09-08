# Memória de cálculo (SQL) — Pesquisa Eleitoral Sergipe 2026

Documento 11 da defesa na Representação nº 0601015-42.2026.6.25.0000 (TRE-SE). Reproduz, tal como estão no banco de dados da pesquisa (PostgreSQL/Supabase, projeto "Eleicoes 2026"), as definições das *views* que calculam a ponderação, a composição da amostra e os resultados, e as fórmulas usadas no Anexo Técnico. Extraído em 08/09/2026 com `pg_get_viewdef`. Nenhuma linha aqui contém dado pessoal: as *views* só produzem agregados.

## 1. Convenções

| Termo | Definição no banco |
| --- | --- |
| Edição | Linha de `edicao` com `ativa = true` (a pesquisa registrada SE-09441/2026 · BR-04041/2026). Todas as consultas filtram por `edicao_id`. |
| Participante validado | Linha de `eleitores_pesquisa` com `wa_validado = true` (CPF confrontado com a base da CDL ou do SPC **e** código de uso único confirmado pelo WhatsApp). |
| Respondente | `token_hash` distinto em `votos_pesquisa` (participante que respondeu pelo menos uma pergunta). |
| Voto válido | Linha de `votos_pesquisa` com `metodo = 'numero'` (escolha de candidato ou legenda). `branco` e `nao_sabe` são contados à parte. |
| Município do respondente | `votos_pesquisa.municipio_ibge` (código IBGE informado pelo participante como local de voto). Fora de Sergipe → sem peso (peso 0). |
| Eleitorado | `municipios_se.eleitorado` (eleitorado oficial do TSE por município, 75 municípios, total 1.731.960). |

## 2. Peso por município — `v_peso_municipio`

Pós-estratificação por município: o peso do município *i* é a razão entre a participação do município no eleitorado e a sua participação entre os respondentes.

    peso_i = ( eleitorado_i / Σ eleitorado ) / ( respondentes_i / Σ respondentes )

```sql
CREATE VIEW v_peso_municipio AS
WITH resp AS (
  SELECT edicao_id, municipio_ibge, count(DISTINCT token_hash)::numeric AS n
  FROM votos_pesquisa
  WHERE municipio_ibge IS NOT NULL
  GROUP BY edicao_id, municipio_ibge
), tot AS (
  SELECT edicao_id, sum(n) AS n_total FROM resp GROUP BY edicao_id
), etot AS (
  SELECT r.edicao_id, sum(m.eleitorado)::numeric AS e_total
  FROM municipios_se m JOIN resp r ON r.municipio_ibge = m.ibge_codigo
  GROUP BY r.edicao_id
)
SELECT r.edicao_id, r.municipio_ibge, r.n AS respostas, m.eleitorado,
       m.eleitorado::numeric / e.e_total / (r.n / t.n_total) AS peso
FROM resp r
JOIN municipios_se m ON m.ibge_codigo = r.municipio_ibge
JOIN tot  t ON t.edicao_id = r.edicao_id
JOIN etot e ON e.edicao_id = r.edicao_id;
```

Nota técnica: `n_total` inclui os respondentes com município fora de Sergipe (21 na edição), que não recebem linha de peso (o `JOIN` com `municipios_se` os exclui). Por isso a soma dos pesos reproduz 10.166 (todos os respondentes) e não 10.145 (respondentes em Sergipe). Como todos os percentuais são razões entre somas de pesos, essa constante não altera nenhum resultado; o Anexo Técnico usa 10.145 como *n* na margem nominal e no efeito de desenho.

## 3. Cobertura por município — `v_cobertura_municipio` (art. 2º, §7º, III)

```sql
CREATE VIEW v_cobertura_municipio AS
SELECT ed.id AS edicao_id, m.ibge_codigo, m.nome, m.regiao, m.eleitorado, m.cota_pesquisa,
       COALESCE(p.participantes, 0) AS participantes,
       COALESCE(v.votos, 0)         AS votos,
       CASE WHEN m.eleitorado > 0
            THEN round(COALESCE(p.participantes, 0)::numeric * 100 / m.eleitorado, 4)
            ELSE 0 END               AS pct_eleitorado
FROM municipios_se m
CROSS JOIN edicao ed
LEFT JOIN (SELECT edicao_id, municipio_ibge, count(*) AS participantes
           FROM eleitores_pesquisa WHERE wa_validado
           GROUP BY edicao_id, municipio_ibge) p
       ON p.edicao_id = ed.id AND p.municipio_ibge = m.ibge_codigo
LEFT JOIN (SELECT edicao_id, municipio_ibge, count(*) AS votos
           FROM votos_pesquisa GROUP BY edicao_id, municipio_ibge) v
       ON v.edicao_id = ed.id AND v.municipio_ibge = m.ibge_codigo;
```

Tabela do §7º, III (uma linha por município — é a seção 2 do Anexo Técnico):

```sql
SELECT m.nome, m.eleitorado, m.cota_pesquisa AS planejado,
       c.participantes AS validados, p.respostas AS respondentes, round(p.peso, 4) AS peso
FROM municipios_se m
LEFT JOIN v_cobertura_municipio c ON c.ibge_codigo = m.ibge_codigo AND c.edicao_id = (SELECT id FROM edicao WHERE ativa)
LEFT JOIN v_peso_municipio      p ON p.municipio_ibge = m.ibge_codigo AND p.edicao_id = (SELECT id FROM edicao WHERE ativa)
ORDER BY m.nome;
```

Quando `cota_pesquisa` está vazia, o Anexo Técnico calcula o planejado como `20.000 × eleitorado_i / Σ eleitorado` (20.000 = entrevistas previstas no registro).

## 4. Composição da amostra — `v_amostra_composicao` e `v_estrato_edicao` (art. 2º, §7º, IV)

```sql
CREATE VIEW v_amostra_composicao AS
SELECT edicao_id, 'sexo' AS dimensao, sexo AS valor, count(*)::integer AS n
FROM eleitores_pesquisa WHERE wa_validado = true AND sexo IS NOT NULL GROUP BY edicao_id, sexo
UNION ALL
SELECT edicao_id, 'faixa_etaria', faixa_etaria, count(*)::integer
FROM eleitores_pesquisa WHERE wa_validado = true AND faixa_etaria IS NOT NULL GROUP BY edicao_id, faixa_etaria
UNION ALL
SELECT edicao_id, 'escolaridade', escolaridade, count(*)::integer
FROM eleitores_pesquisa WHERE wa_validado = true AND escolaridade IS NOT NULL GROUP BY edicao_id, escolaridade
UNION ALL
SELECT edicao_id, 'nivel_economico', nivel_economico, count(*)::integer
FROM eleitores_pesquisa WHERE wa_validado = true AND nivel_economico IS NOT NULL GROUP BY edicao_id, nivel_economico
UNION ALL
SELECT e.edicao_id, 'municipio', m.nome, count(*)::integer
FROM eleitores_pesquisa e LEFT JOIN municipios_se m ON m.ibge_codigo = e.municipio_ibge
WHERE e.wa_validado = true GROUP BY e.edicao_id, m.nome
UNION ALL
SELECT e.edicao_id, 'regiao', m.regiao, count(*)::integer
FROM eleitores_pesquisa e LEFT JOIN municipios_se m ON m.ibge_codigo = e.municipio_ibge
WHERE e.wa_validado = true AND m.regiao IS NOT NULL GROUP BY e.edicao_id, m.regiao;
```

```sql
CREATE VIEW v_estrato_edicao AS
SELECT e.edicao_id, e.municipio_ibge, m.nome AS municipio, e.sexo, e.faixa_etaria, e.escolaridade, count(*) AS n
FROM eleitores_pesquisa e JOIN municipios_se m ON m.ibge_codigo = e.municipio_ibge
WHERE e.wa_validado = true
GROUP BY e.edicao_id, e.municipio_ibge, m.nome, e.sexo, e.faixa_etaria, e.escolaridade;
```

As dimensões declaradas pelo participante são opcionais no cadastro; o Anexo Técnico apresenta a categoria "não informado" para cada dimensão (contagem direta sobre `eleitores_pesquisa`), o que explica a diferença entre a soma das categorias informadas e o total de participantes.

## 5. Resultados — `v_resultados_candidato_pond`, `v_resultados_legenda_pond`, `v_votos_branco_nao_sabe_pond`

```sql
CREATE VIEW v_resultados_candidato_pond AS
SELECT v.edicao_id, v.cargo, v.candidato_id,
       count(*)::integer                              AS votos,
       sum(COALESCE(p.peso, 0))::numeric(14,4)       AS votos_pond
FROM votos_pesquisa v
LEFT JOIN v_peso_municipio p ON p.edicao_id = v.edicao_id AND p.municipio_ibge = v.municipio_ibge
WHERE v.metodo = 'numero' AND v.candidato_id IS NOT NULL
GROUP BY v.edicao_id, v.cargo, v.candidato_id;

CREATE VIEW v_resultados_legenda_pond AS
SELECT v.edicao_id, v.cargo, v.partido_id,
       count(*)::integer AS votos, sum(COALESCE(p.peso, 0))::numeric(14,4) AS votos_pond
FROM votos_pesquisa v
LEFT JOIN v_peso_municipio p ON p.edicao_id = v.edicao_id AND p.municipio_ibge = v.municipio_ibge
WHERE v.metodo = 'numero' AND v.partido_id IS NOT NULL
GROUP BY v.edicao_id, v.cargo, v.partido_id;

CREATE VIEW v_votos_branco_nao_sabe_pond AS
SELECT v.edicao_id, v.cargo, v.metodo,
       count(*)::integer AS votos, sum(COALESCE(p.peso, 0))::numeric(14,4) AS votos_pond
FROM votos_pesquisa v
LEFT JOIN v_peso_municipio p ON p.edicao_id = v.edicao_id AND p.municipio_ibge = v.municipio_ibge
WHERE v.metodo IN ('branco', 'nao_sabe')
GROUP BY v.edicao_id, v.cargo, v.metodo;
```

Percentuais (por cargo):

    pct_bruto(c)  = votos(c)      / Σ votos válidos do cargo        (contagem direta)
    pct_pond(c)   = votos_pond(c) / Σ votos_pond válidos do cargo   (ponderado por município)

Brancos e "não sabe/não quis responder" são apresentados à parte, sobre o total de respostas do cargo, nas duas versões.

## 6. Amostra efetiva (Kish), efeito de desenho e margem de erro

Com *n_i* respondentes e peso *w_i* em cada município:

    n_eff = (Σ n_i·w_i)² / Σ n_i·w_i²          (amostra efetiva de Kish)
    deff  = n / n_eff                           (efeito de desenho; n = 10.145 respondentes em Sergipe)
    margem nominal  = 1,96 · √(0,25 / n)
    margem ajustada = 1,96 · √(0,25 / n_eff)

Consulta que reproduz os valores do Anexo Técnico (n_eff, deff, margens, faixa dos pesos):

```sql
WITH ed AS (SELECT id FROM edicao WHERE ativa LIMIT 1),
r AS (
  SELECT v.token_hash, max(p.peso) AS w
  FROM votos_pesquisa v
  JOIN v_peso_municipio p ON p.edicao_id = v.edicao_id AND p.municipio_ibge = v.municipio_ibge
  WHERE v.edicao_id = (SELECT id FROM ed)
  GROUP BY v.token_hash),
k AS (SELECT count(*) AS n_se, sum(w) AS soma_w, sum(w*w) AS soma_w2 FROM r),
mun AS (
  SELECT count(*) AS municipios, sum(respostas) AS respondentes_se, sum(eleitorado) AS eleitorado,
         min(peso) AS peso_min, max(peso) AS peso_max
  FROM v_peso_municipio WHERE edicao_id = (SELECT id FROM ed))
SELECT k.n_se, round(k.soma_w, 2) AS soma_w, round(k.soma_w2, 2) AS soma_w2,
       round(power(k.soma_w, 2) / k.soma_w2, 1)                       AS n_eff,
       round(k.n_se / (power(k.soma_w, 2) / k.soma_w2), 3)            AS deff,
       round(1.96 * sqrt(0.25 / k.n_se) * 100, 2)                      AS margem_nominal_pp,
       round(1.96 * sqrt(0.25 / (power(k.soma_w, 2) / k.soma_w2)) * 100, 2) AS margem_ajustada_pp,
       mun.*
FROM k, mun;
```

Resultado obtido em 08/09/2026, executando a consulta diretamente no banco:

| n (SE) | Σ w | Σ w² | n_eff | deff | margem nominal | margem ajustada | municípios | respondentes SE | eleitorado | peso mín. | peso máx. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10.145 | 10.166,00 | 15.554,09 | 6.644,4 | 1,527 | ±0,97 p.p. | ±1,20 p.p. | 75 | 10.145 | 1.731.960 | 0,2486 | 7,6118 |

Os valores coincidem com a seção 3 do Anexo Técnico.

## 7. Resumo da edição — `v_resumo_edicao`

```sql
CREATE VIEW v_resumo_edicao AS
SELECT id AS edicao_id, nome, ativa,
  (SELECT count(*) FROM eleitores_pesquisa WHERE edicao_id = e.id)                       AS eleitores_cadastrados,
  (SELECT count(*) FROM eleitores_pesquisa WHERE edicao_id = e.id AND fonte = 'cdl_base') AS via_cdl_base,
  (SELECT count(*) FROM eleitores_pesquisa WHERE edicao_id = e.id AND fonte = 'spc')      AS via_spc,
  (SELECT count(*) FROM eleitores_pesquisa WHERE edicao_id = e.id AND spc_validado)       AS com_spc,
  (SELECT count(*) FROM eleitores_pesquisa WHERE edicao_id = e.id AND wa_validado)        AS com_wa,
  (SELECT count(*) FROM tokens_emitidos   WHERE edicao_id = e.id)                         AS tokens_emitidos,
  (SELECT count(*) FROM tokens_emitidos   WHERE edicao_id = e.id AND usado)               AS tokens_usados,
  (SELECT count(*) FROM votos_pesquisa    WHERE edicao_id = e.id AND metodo = 'numero')   AS votos_validos,
  (SELECT count(*) FROM votos_pesquisa    WHERE edicao_id = e.id AND metodo = 'branco')   AS votos_brancos,
  (SELECT count(*) FROM votos_pesquisa    WHERE edicao_id = e.id AND metodo = 'nao_sabe') AS votos_nao_sabe,
  (SELECT count(*) FROM votos_pesquisa    WHERE edicao_id = e.id AND cargo = 'zona_expansao' AND resposta = 'aracaju')       AS zona_pra_aracaju,
  (SELECT count(*) FROM votos_pesquisa    WHERE edicao_id = e.id AND cargo = 'zona_expansao' AND resposta = 'sao_cristovao') AS zona_pra_sao_cristovao
FROM edicao e
WHERE ativa = true;
```

## 8. Reprodutibilidade

- As *views* estão versionadas nas migrações do repositório público (`supabase/migrations/`), com os commits que as criaram ou alteraram (em especial `9e3f90f`, `026b26c` e `cc9f084`, de 06/09/2026).
- O Anexo Técnico é gerado por `scripts/anexo-rp-0601015.mjs`, que lê as *views* acima (paginando de 1.000 em 1.000 linhas, com `ORDER BY` estável) e grava o `.md` e o `.json` com os mesmos números; a rotina `npm run verificar:resultados` confere os percentuais publicados contra o banco (última execução: 409 números, zero divergências).
- A Justiça Eleitoral, a Procuradoria Regional Eleitoral ou o perito podem executar estas consultas diretamente no banco (acesso a ser disponibilizado nos termos da Lei 9.504/97, art. 34, §1º, e da Res.-TSE 23.600/2019, art. 13), ou sobre a base anonimizada que a CDL se comprometeu a fornecer.
