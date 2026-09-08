# Rp 0601015-42.2026.6.25.0000 (TRE-SE) — pasta de trabalho da defesa

Tudo nesta pasta é **agregado**: nenhum arquivo contém CPF, telefone, IP ou qualquer dado de participante. Pode ser versionado e entregue ao(à) advogado(a).

| Arquivo | O que é | Estado |
| --- | --- | --- |
| `minuta-defesa.md` | Minuta da defesa (art. 18 da Res.-TSE 23.608/2019) com pedidos, lista de documentos e notas para o(a) advogado(a) | Versão para protocolo (08/09/2026): só nome/OAB e assinatura do(a) advogado(a) |
| `anexo-tecnico-numeros.md` / `.json` | "Números solicitados": tabela por município (§7º, III), composição da amostra (§7º, IV), pesos, Kish, margens, bruto × ponderado por cargo, linha do tempo da coleta, trilha de auditoria | Gerado do banco; precisa da assinatura do estatístico (CONRE 8223) |
| `complementacao-pesqele-2026-09-08.md` | Textos prontos para colar no PesqEle (bloco A = §7º III; bloco B = §7º IV) e o passo a passo, para os dois registros | Lançado nos dois registros em 08/09/2026 (14h15–14h55); espelhos públicos conferidos às 15h09/15h16 (docs. 06 e 07) |
| `pesqele-texto-campo-bairro-municipio.txt`, `scripts/pesqele-complementacao-pdf.py`, `scripts/pesqele-relatorio-resultados-pdf.py` | Texto do campo de municípios/bairros e geradores dos dois PDFs do PesqEle (§ 7º-C): detalhamento geográfico + complementação, e relatório completo com os resultados (saídas .pdf/.html ignoradas pelo git) | Gerados em 08/09/2026 |
| `memoria-de-calculo-sql.md` | Definições das views e fórmulas (peso, Kish, margens, percentuais) com consulta de conferência | Colar o resultado da consulta da seção 6 |
| `linha-do-tempo.md` | Eventos com prova (banco, auditoria, commits) de 22/08 a 08/09 e a tabela de commits | Preencher intimação/suspensão (complementação preenchida em 08/09) |
| `espelho-publico-SE-09441-2026-09-08.txt`, `espelho-publico-BR-04041-2026-09-08.txt` | Texto integral dos espelhos públicos dos dois registros (PesqEle Público, 08/09/2026, 15h09/15h16), conferido por hash contra a página ao vivo | Fonte dos docs. 07-A/07-B (`python3 scripts/pesqele-docs-06-07.py` gera doc06/doc07 .pdf) |
| `capturas-pesqele-2026-09-08/` (ignorada), `envio-advogado-2026-09-08/` (ignorada) | Capturas recortadas do lançamento (doc. 06) e pacote entregue ao(à) advogado(a) em 08/09/2026 | Não versionar |
| `checklist-cumprimento-tutela.md` | O que fazer nas 24 h: site já fora do ar (08/09 10h47), acionar a suspensão (TOTP), canais manuais, provas, como religar | Executar e anotar data/hora |

## Regerar os números

```bash
node --env-file=.env.local scripts/anexo-rp-0601015.mjs
```

(usa 20.000 entrevistas previstas como planejado quando `cota_pesquisa` está vazia; `META_AMOSTRA=…` altera). Depois, `node scripts/build-juridico.mjs docs/juridico/rp-0601015-42` gera `.html`, `.pdf` e `.docx` ao lado de cada `.md` desta pasta.

## Ordem sugerida

1. Acionar a suspensão (checklist, item 1) — prazo de 24 h da intimação, multa de R$ 20.000 por ato.
2. Lançar a complementação nos dois registros do PesqEle (checklist, item 4) e guardar recibos.
3. Estatístico revisa e assina o Anexo Técnico; advogado(a) preenche a minuta.
4. Protocolar em 2 dias da intimação com os documentos da lista (minuta, seção VII).
