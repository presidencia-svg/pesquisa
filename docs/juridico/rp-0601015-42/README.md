# Rp 0601015-42.2026.6.25.0000 (TRE-SE) — pasta de trabalho da defesa

Tudo nesta pasta é **agregado**: nenhum arquivo contém CPF, telefone, IP ou qualquer dado de participante. Pode ser versionado e entregue ao(à) advogado(a).

| Arquivo | O que é | Estado |
| --- | --- | --- |
| `minuta-defesa.md` | Minuta da defesa (art. 18 da Res.-TSE 23.608/2019) com pedidos, lista de documentos e notas para o(a) advogado(a) | Preencher os campos entre colchetes antes de protocolar |
| `anexo-tecnico-numeros.md` / `.json` | "Números solicitados": tabela por município (§7º, III), composição da amostra (§7º, IV), pesos, Kish, margens, bruto × ponderado por cargo, linha do tempo da coleta, trilha de auditoria | Gerado do banco; precisa da assinatura do estatístico (CONRE 8223) |
| `complementacao-pesqele-2026-09-08.md` | Textos prontos para colar no PesqEle (bloco A = §7º III; bloco B = §7º IV) e o passo a passo, para os dois registros | Lançar no PesqEle e guardar recibo/espelho |
| `memoria-de-calculo-sql.md` | Definições das views e fórmulas (peso, Kish, margens, percentuais) com consulta de conferência | Colar o resultado da consulta da seção 6 |
| `linha-do-tempo.md` | Eventos com prova (banco, auditoria, commits) de 22/08 a 08/09 e a tabela de commits | Preencher intimação/suspensão/complementação |
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
